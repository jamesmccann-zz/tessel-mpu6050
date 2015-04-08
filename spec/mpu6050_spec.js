var mpu6050 = require('../index.js');
var Mpu6050 = mpu6050.Mpu6050;

var port_stub = {
  I2C: function() {}
};

var mpu;

beforeEach(function() {
  // Stubbed methods
  spyOn(Mpu6050.prototype, 'init');
});

describe('use', function() {
  beforeEach(function() {
    mpu = mpu6050.use(port_stub);
  });

  it('returns an Mpu6050 instance', function() {
    expect(mpu.hasOwnProperty('i2c')).toBeTruthy();
  });
});

describe('readAccelerometerData', function() {
  beforeEach(function() {
    mpu = mpu6050.use(port_stub);
    spyOn(mpu, '_writeRegister');
    spyOn(mpu, '_readRegisters').andCallFake(function(_, _, callback) {
      var buf = new Buffer(6);
      buf.writeInt16BE(0, 0);
      buf.writeInt16BE(0, 2);
      buf.writeInt16BE(16384, 4);
      callback(undefined, buf);
    });
    mpu.setAccelerometerRange(2);
  });

  it('should return normalised accelerometer data', function() {
    mpu.readAccelerometerData(function(ax, ay, az) {
      expect(ax).toEqual(0);
      expect(ay).toEqual(0);
      expect(az).toEqual(1);
    });
  });
});

describe('readGyroData', function() {
  beforeEach(function() {
    mpu = mpu6050.use(port_stub);
    spyOn(mpu, '_writeRegister');
    spyOn(mpu, '_readRegisters').andCallFake(function(_, _, callback) {
      var buf = new Buffer(6);
      buf.writeInt16BE(-12, 0);
      buf.writeInt16BE(-6943, 2);
      buf.writeInt16BE(-426, 4);
      callback(undefined, buf);
    });
    mpu.setGyroRange(250);
  });

  it('should return correct gyro readings', function() {
    mpu.readGyroData(function(gx, gy, gz) {
      expect(gx).toBeCloseTo(-0.091, 2);
      expect(gy).toBeCloseTo(-53, 2);
      expect(gz).toBeCloseTo(-3.25, 2);
    });
  });
});

describe('readMotionData', function() {
  beforeEach(function() {
    mpu = mpu6050.use(port_stub);
    spyOn(mpu, '_writeRegister');
    spyOn(mpu, '_readRegisters').andCallFake(function(_, _, callback) {
      var buf = new Buffer(14);
      buf.writeInt16BE(0, 0);
      buf.writeInt16BE(0, 2);
      buf.writeInt16BE(16384, 4);

      buf.writeInt16BE(-12, 8);
      buf.writeInt16BE(-6943, 10);
      buf.writeInt16BE(-426, 12);
      callback(undefined, buf);
    });
    mpu.setAccelerometerRange(2);
    mpu.setGyroRange(250);
  });

  it('should return correct gyro readings', function() {
    mpu.readMotionData(function(ax, ay, az, gx, gy, gz) {
      expect(ax).toEqual(0);
      expect(ay).toEqual(0);
      expect(az).toEqual(1);
      expect(gx).toBeCloseTo(-0.091, 2);
      expect(gy).toBeCloseTo(-53, 2);
      expect(gz).toBeCloseTo(-3.25, 2);
    });
  });
});

describe('getAccelPitchAndRoll', function() {
  beforeEach(function() {
    mpu = mpu6050.use(port_stub);
  });

  it('should return accurate pitch and roll angles', function() {
    //TODO: add or find a good set of known test cases
    var pr;

    pr = mpu.getAccelPitchAndRoll(0, 0, 1);
    expect(pr.pitch).toBeCloseTo(0, 2);
    expect(pr.roll).toBeCloseTo(0, 2);

    pr = mpu.getAccelPitchAndRoll(0, 0.5, 0.5);
    expect(pr.pitch).toBeCloseTo(0, 2);
    expect(pr.roll).toBeCloseTo(45, 2);

    pr = mpu.getAccelPitchAndRoll(0.5, 0, 0.5);
    expect(pr.pitch).toBeCloseTo(-45, 2);
    expect(pr.roll).toBeCloseTo(0, 2);
  });
});

describe('readPitchAndRoll', function() {
  var cumsecs = 100;
  beforeEach(function() {
    mpu = mpu6050.use(port_stub);
    spyOn(mpu, 'readMotionData').andCallFake(function(callback) {
      // constant gyro velocity of 0.1 degrees/s
      callback(0, 0, 0, 0.1, 0.1, 0.1);
    });
    spyOn(mpu, 'getAccelPitchAndRoll').andCallFake(function(callback) {
      callback({ pitch: 0, roll: 0 });
    });
  });

  // TODO: sort out test case for this
  xit('should return accurate pitch and roll angles', function() {
  });
});

describe('setSleepModeEnabled', function() {
  beforeEach(function() {
    mpu = mpu6050.use(port_stub);
    spyOn(mpu, '_writeRegister');
  });

  it('writes the register for PWR_MGMT_1', function() {
    mpu.setSleepModeEnabled(false);
    expect(mpu._writeRegister).toHaveBeenCalledWith(mpu6050.constants.PWR_MGMT_1, 0);

    mpu.setSleepModeEnabled(true);
    expect(mpu._writeRegister).toHaveBeenCalledWith(mpu6050.constants.PWR_MGMT_1, 1);
  });
});

describe('setAccelerometerRange', function() {
  beforeEach(function() {
    mpu = mpu6050.use(port_stub);
    spyOn(mpu, '_writeRegister');
  });

  describe('with valid range value', function() {
    it('writes the register for ACCEL_CONFIG', function() {
      mpu.setAccelerometerRange(2);
      mpu.setAccelerometerRange(4);
      mpu.setAccelerometerRange(8);
      mpu.setAccelerometerRange(16);
      expect(mpu._writeRegister).toHaveBeenCalledWith(mpu6050.constants.ACCEL_CONFIG, '0', undefined);
      expect(mpu._writeRegister).toHaveBeenCalledWith(mpu6050.constants.ACCEL_CONFIG, '1', undefined);
      expect(mpu._writeRegister).toHaveBeenCalledWith(mpu6050.constants.ACCEL_CONFIG, '2', undefined);
      expect(mpu._writeRegister).toHaveBeenCalledWith(mpu6050.constants.ACCEL_CONFIG, '3', undefined);
    });

    it('sets accel_sensitivity', function() {
      mpu.setAccelerometerRange(2);
      expect(mpu.accel_sensitivity).toEqual(16384);

      mpu.setAccelerometerRange(4);
      expect(mpu.accel_sensitivity).toEqual(8192);

      mpu.setAccelerometerRange(8);
      expect(mpu.accel_sensitivity).toEqual(4096);

      mpu.setAccelerometerRange(16);
      expect(mpu.accel_sensitivity).toEqual(2048);
    });
  });
});

describe('setGyroRange', function() {
  beforeEach(function() {
    mpu = mpu6050.use(port_stub);
    spyOn(mpu, '_writeRegister');
  });

  describe('with valid range value', function() {
    it('writes the register for GYRO_CONFIG', function() {
      mpu.setGyroRange(250);
      mpu.setGyroRange(500);
      mpu.setGyroRange(1000);
      mpu.setGyroRange(2000);
      expect(mpu._writeRegister).toHaveBeenCalledWith(mpu6050.constants.GYRO_CONFIG, '0', undefined);
      expect(mpu._writeRegister).toHaveBeenCalledWith(mpu6050.constants.GYRO_CONFIG, '1', undefined);
      expect(mpu._writeRegister).toHaveBeenCalledWith(mpu6050.constants.GYRO_CONFIG, '2', undefined);
      expect(mpu._writeRegister).toHaveBeenCalledWith(mpu6050.constants.GYRO_CONFIG, '3', undefined);
    });

    it('sets gyro_sensitivity', function() {
      mpu.setGyroRange(250);
      expect(mpu.gyro_xsensitivity).toBeCloseTo(131, 1);

      mpu.setGyroRange(500);
      expect(mpu.gyro_xsensitivity).toEqual(65.5, 1);

      mpu.setGyroRange(1000);
      expect(mpu.gyro_xsensitivity).toEqual(32.8, 1);

      mpu.setGyroRange(2000);
      expect(mpu.gyro_xsensitivity).toEqual(16.4, 1);
    });
  });
});

