var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Queue = require('sync-queue');

// Addr is 0x69 if AD0 pin high, 0x68 otherwise
var I2C_ADDR = 0x68,
    I2C_ADDR_H = 0x69;

var PWR_MGMT_1 = 0x6B,
    WHO_AM_I = 0x75,

    SMPLRT_DIV = 0x19,
    CONFIG = 0x00,
    GYRO_CONFIG = 0x1B,
    ACCEL_CONFIG = 0x1C,

    ACCEL_XOUT_H = 0x3B,
    ACCEL_XOUT_L = 0x3C,
    ACCEL_YOUT_H = 0x3D,
    ACCEL_YOUT_L = 0x3E,
    ACCEL_ZOUT_H = 0x3F,
    ACCEL_ZOUT_L = 0x40,

    TEMP_OUT_H = 0x41,
    TEMP_OUT_L = 0x42,

    GYRO_XOUT_H = 0x43,
    GYRO_XOUT_L = 0x44,
    GYRO_YOUT_H = 0x45,
    GYRO_YOUT_L = 0x46,
    GYRO_ZOUT_H = 0x47,
    GYRO_ZOUT_L = 0x48;

var ACCEL_RANGES = [2, 4, 8, 16],
    GYRO_RANGES = [250, 500, 1000, 2000];

function Mpu6050(port, i2cAddress) {
  this.i2cAddress = i2cAddress;
  this.i2c = new port.I2C(i2cAddress);
  this.queue = new Queue();

  this.gyro_xoffset = 0;
  this.gyro_yoffset = 0;
  this.gyro_zoffset = 0;

  this.init();
}

util.inherits(Mpu6050, EventEmitter);

Mpu6050.prototype.init = function() {
  var self = this;

  // Disable sleep mode
  this.setSleepModeEnabled(false);

  // Set sample rate to 1000kHz
  this._writeRegister(SMPLRT_DIV, 0x07);

  // Disable FSync, 256Hz DLPF
  this._writeRegister(CONFIG, 0x00);

  // Disable gyro self test
  // Set gyro full scale range to +-250 degrees/sec
  this.setGyroscopeRange(250);

  // Disable accelerometer self test
  // Set the accelerometer full scale range to +- 2g
  this.setAccelerometerRange(2, function() {
    self.emit('ready');
  });
};

Mpu6050.prototype._readRegisters = function (addressToRead, bytesToRead, callback) {
  var self = this;

  this.queue.place(function() {
    self.i2c.transfer(new Buffer([addressToRead]), bytesToRead, function() {
      self.queue.next();
      if (callback) { callback.apply(self, arguments); }
    });
  });
};

Mpu6050.prototype._writeRegister = function (addressToWrite, dataToWrite, callback) {
  var self = this;

  this.queue.place(function() {
    self.i2c.send(new Buffer([addressToWrite, dataToWrite]), function() {
      self.queue.next();
      if (callback) { callback.apply(self, arguments); }
    });
  });
};

Mpu6050.prototype.readAccelerometerData = function(callback) {
  var self = this;
  this._readRegisters(ACCEL_XOUT_H, 6, function(err, rx) {
    var ax = rx.readInt16BE(0) / self.accel_sensitivity;
    var ay = rx.readInt16BE(2) / self.accel_sensitivity;
    var az = rx.readInt16BE(4) / self.accel_sensitivity;

    if (callback) {
      callback(ax, ay, az);
    }
  });
};

Mpu6050.prototype.readTempData = function(callback) {
  this._readRegisters(TEMP_OUT_H, 2, function(err, rx) {
    var temp = rx.readInt16BE(0) / 340 + 36.53;

    if (callback) {
      callback(temp);
    }
  });
};

Mpu6050.prototype.readGyroData = function(callback) {
  var self = this;

  this._readRegisters(GYRO_XOUT_H, 6, function(err, rx) {
    var gx = (rx.readInt16BE(0) - self.gyro_xoffset) / self.gyro_xsensitivity;
    var gy = (rx.readInt16BE(2) - self.gyro_yoffset) / self.gyro_ysensitivity;
    var gz = (rx.readInt16BE(4) - self.gyro_zoffset) / self.gyro_zsensitivity;

    if (callback) {
      callback(gx, gy, gz);
    }
  });
};

// Useful for calibrating gyro
Mpu6050.prototype.readGyroRaw = function(callback) {
  this._readRegisters(GYRO_XOUT_H, 6, function(err, rx) {
    var gx = rx.readInt16BE(0);
    var gy = rx.readInt16BE(2);
    var gz = rx.readInt16BE(4);

    if (callback) {
      callback(gx, gy, gz);
    }
  });
};

Mpu6050.prototype.readMotionData = function(callback) {
  var self = this;
  this._readRegisters(ACCEL_XOUT_H, 14, function(err, rx) {
    var ax = rx.readInt16BE(0) / self.accel_sensitivity;
    var ay = rx.readInt16BE(2) / self.accel_sensitivity;
    var az = rx.readInt16BE(4) / self.accel_sensitivity;
    var gx = (rx.readInt16BE(8) - self.gyro_xoffset) / self.gyro_xsensitivity;
    var gy = (rx.readInt16BE(10) - self.gyro_yoffset) / self.gyro_ysensitivity;
    var gz = (rx.readInt16BE(12) - self.gyro_zoffset) / self.gyro_zsensitivity;

    if (callback) {
      callback(ax, ay, az, gx, gy, gz);
    }
  });
};

Mpu6050.prototype.getAccelPitchAndRoll = function(ax, ay, az) {
  var roll = 57.295 * Math.atan(ay / Math.sqrt(Math.pow(az, 2) + Math.pow(ax, 2)));
  var pitch = 57.295 * Math.atan(-1*ax / Math.sqrt(Math.pow(az, 2) + Math.pow(ay, 2)));

  return { roll: roll, pitch: pitch };
};

Mpu6050.prototype.readPitchAndRoll = (function() {
  var pitch = 0.0, roll = 0.0;

  return function(delayMs, callback) {
    this.readMotionData(function(ax, ay, az, gx, gy) {
      var accel = this.convertAccelerometerData(ax, ay, az);

      var gyroRoll = roll + gx * delayMs / 1000;
      var gyroPitch = pitch + gy * delayMs / 1000;

      roll = (0.90 * gyroRoll + 0.1 * accel.roll) || 0;
      pitch = (0.90 * gyroPitch + 0.1 * accel.pitch) || 0;

      if (callback) {
        callback(pitch, roll);
      }
    }.bind(this));
  };
}());

Mpu6050.prototype.setSleepModeEnabled = function(enabled) {
  this._writeRegister(PWR_MGMT_1, enabled | 0);
};

Mpu6050.prototype.setAccelerometerRange = function(range, callback) {
  var idx = ACCEL_RANGES.indexOf(range);
  if (idx > -1) {
    this._writeRegister(ACCEL_CONFIG, idx.toString(16), callback);
    this.accel_sensitivity = 32768 / range;
  } else {
    throw new Error(range + " is not a valid accelerometer range option. " +
                    "Try one of " + ACCEL_RANGES.toString());
  }
};

Mpu6050.prototype.setGyroRange = function(range, callback) {
  var idx = GYRO_RANGES.indexOf(range);
  if (idx > -1) {
    this._writeRegister(GYRO_CONFIG, idx.toString(16), callback);
    this.gyro_xsensitivity = this.gyro_ysensitivity = this.gyro_zsensitivity = Math.ceil((131 / Math.pow(2, idx) * 10)) / 10;
  } else {
   throw new Error(range + " is not a valid gyro range option. " +
                    "Try one of " + GYRO_RANGES.toString());

  }
};

Mpu6050.prototype.setGyroOffsets = function(x, y, z) {
  this.gyro_xoffset = x;
  this.gyro_yoffset = y;
  this.gyro_zoffset = z;
};

function use(port, address) {
  address = address || I2C_ADDR;
  return new Mpu6050(port, address);
}

exports.constants = {
  I2C_ADDR: I2C_ADDR,
  I2C_ADDR_HIGH: I2C_ADDR_H,
  SMPLRT_DIV: SMPLRT_DIV,
  CONFIG: CONFIG,
  ACCEL_CONFIG: ACCEL_CONFIG,
  GYRO_CONFIG: GYRO_CONFIG,
  PWR_MGMT_1: PWR_MGMT_1
};

exports.Mpu6050 = Mpu6050;
exports.use = use;

