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

    GYRO_XOUT_H = 0x43,
    GYRO_XOUT_L = 0x44,
    GYRO_YOUT_H = 0x45,
    GYRO_YOUT_L = 0x46,
    GYRO_ZOUT_H = 0x47,
    GYRO_ZOUT_L = 0x48,

    READ = 0x01,
    WRITE = 0x00;

var ACCEL_RANGES = [2, 4, 8, 16],
    GYRO_RANGES = [250, 500, 1000, 2000],
    GYRO_SENSITIVITES = [131, 65.5, 32.8, 16.4];

// LSB/degrees per second - see data sheet
var gyro_xsensitivity = 131,
    gyro_ysensitivity = 131,
    gyro_zsensitivity = 131;

var accel_sensitivity;

function Mpu6050(port, i2cAddress) {
  this.i2cAddress = i2cAddress;
  this.i2c = new port.I2C(i2cAddress);
  this.queue = new Queue();
  this.init();
}

util.inherits(Mpu6050, EventEmitter);

//TODO: remove this or use as defaults
Mpu6050.prototype.init = function() {
  // Disable sleep mode
  this._writeRegister(PWR_MGMT_1, 0);

  // Set sample rate to 1000kHz
  this._writeRegister(SMPLRT_DIV, 0x07);

  // Disable FSync, 256Hz DLPF
  this._writeRegister(CONFIG, 0x00);

  // Disable gyro self test
  // Set gyro full scale range to +-250 degrees/sec
  this.setGyroscopeRange(250);

  // Disable accelerometer self test
  // Set the accelerometer full scale range to +- 2g
  this.setAccelerometerRange(2);
}

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

Mpu6050.prototype.setAccelerometerRange = function(range) {
  var idx = ACCEL_RANGES.indexOf(range);
  if (idx > -1) {
    this._writeRegister(ACCEL_CONFIG, idx.toString(16));
    accel_sensitivity = 32768 / range;
  } else {
    throw new Error(range + " is not a valid accelerometer range option. " +
                    "Try one of " + ACCEL_RANGES.toString());
  }
};

Mpu6050.prototype.setGyroscopeRange = function(range) {
  var idx = GYRO_RANGES.indexOf(range);
  if (idx > -1) {
    this._writeRegister(ACCEL_CONFIG, idx.toString(16));
    gyro_xsensitivity = gyro_ysensitivity = gyro_zsensitivity = GYRO_SENSITIVITES[idx];
  } else {
   throw new Error(range + " is not a valid gyro range option. " +
                    "Try one of " + GYRO_RANGES.toString());

  }
};

Mpu6050.prototype.readAccelerometerData = function(callback) {
  this._readRegisters(ACCEL_XOUT_H, 6, function(err, rx) {
    console.log(this.accelerometerRange);
    var ax = rx.readInt16BE(0) / accel_sensitivity;
    var ay = rx.readInt16BE(2) / accel_sensitivity;
    var az = rx.readInt16BE(4) / accel_sensitivity;

    if (callback) {
      callback(ax, ay, az);
    }
  });
};

Mpu6050.prototype.readGyroData = function(callback) {
  this._readRegisters(GYRO_XOUT_H, 6, function(err, rx) {
    var gx = rx.readInt16BE(0) / gyro_xsensitivity; // - gyroOffsetX,
    var gy = rx.readInt16BE(2) / gyro_ysensitivity; // - gyroOffsetY,
    var gz = rx.readInt16BE(4) / gyro_zsensitivity; // - gyroOffsetZ;

    if (callback) {
      callback(gx, gy, gz);
    }
  });
};

Mpu6050.prototype.readMotionData = function(callback) {
  this._readRegisters(ACCEL_XOUT_H, 14, function(err, rx) {
    var ax = rx.readInt16BE(0) / accel_sensitivity;
    var ay = rx.readInt16BE(2) / accel_sensitivity;
    var az = rx.readInt16BE(4) / accel_sensitivity;
    var gx = rx.readInt16BE(8) / gyro_xsensitivity; // - gyroOffsetX,
    var gy = rx.readInt16BE(10) / gyro_ysensitivity; // - gyroOffsetY,
    var gz = rx.readInt16BE(12) / gyro_zsensitivity; // - gyroOffsetZ;

    if (callback) {
      callback(ax, ay, az, gx, gy, gz);
    }
  });
};

Mpu6050.prototype.convertAccelerometerData = function(ax, ay, az) {
  var roll = 57.295 * Math.atan(ay / Math.sqrt(Math.pow(az, 2) + Math.pow(ax, 2)));
  var pitch = 57.295 * Math.atan(-1*ax / Math.sqrt(Math.pow(az, 2) + Math.pow(ay, 2)));

  return { roll: roll, pitch: pitch }
};

Mpu6050.prototype.readPitchAndRoll = function() {
  var pitch = 0.0, roll = 0.0;

  return function(delayMs, callback) {
    this.readMotionData(function(ax, ay, az, gx, gy, gz) {
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
}();

function use(port, address) {
  address = address || I2C_ADDR;
  return new Mpu6050(port, address);
}

exports.I2C_ADDR_LOW = I2C_ADDR;
exports.I2C_ADDR_HIGH = I2C_ADDR_H;
exports.Mpu6050 = Mpu6050;
exports.use = use;

