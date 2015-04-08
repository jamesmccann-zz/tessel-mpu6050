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
    mpu.setGyroscopeRange(250);
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
    mpu.setGyroscopeRange(250);
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

