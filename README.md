# tessel-mpu6050

A Tessel-compatible driver for the InvenSense MPU-6050 IMU.

## Installation

Work in progress

## Usage

This driver has been designed to work similar to the official Tessel accelerometer module, see [accel-mma84](https://github.com/tessel/accel-mma84).

```js

var tessel = require('tessel');
var mpu6050 = require('tessel-mpu6050').use(tessel.port['A']);

mpu6050.on('ready', function() {
  setInterval(function() {
    mpu6050.getPitchAndRoll(100, function(pitch, roll) {
      console.log('pitch:', pitch, 'roll:', roll);
    });
  }, 100);
});
```

## Available Methods

**use(port, address)**  
Convenience method to wrap the `Mpu6050` constructor function. `port` should be the port on the tessel that is being used. `address` is an optional parameter that sets the I2C address for the constructor function. The I2C address for the MPU-6050 is either `0x68` (default) or `0x69` if the AD0 pin is pulled high. `constants.I2C_ADDR` and `constants.I2C_ADDR_HIGH` can be used to determine which address to use. For example, to use two MPU-6050's on ports A and B:

```js
var Mpu6050 = require('tessel-mpu6050');
var mpu6050 = Mpu6050.use(tessel.port['A']);                                   // Uses 0x68
var mpu6050b = Mpu6050.use(tessel.port['B'], Mpu6050.constants.I2C_ADDR_HIGH); // Uses 0x69
```

mpu6050.**init()**  
Initialises the module with defaults for sample rate, DLPF, &plusmn;250&deg;/s full scale gyroscope range, and &plusmn;2g full scale accelerometer range.

mpu6050.**_readRegisters(addressToRead, bytesToRead, callback(err, rx))**  
Reads a number of bytes from the device at the supplied address over I2C. The callback function will be called when the read is complete with an error from the Tessel's I2C library, or a `Buffer` containing the bytes that were read.

mpu6050.**_writeRegisters(addressToWrite, dataToWrite, callback(err)**  
Writes a single byte of data to the device at the supplied address over I2C. The callback function will be called when the write is complete with an error from the Tessel's I2C library if the write was not successful.

mpu6050.**readAccelerometerData(callback(ax, ay, az))**  
Reads the current acceleration measured by the device's accelerometer on x, y, and z axes. Values supplied to the callback function are measured in *g*.

mpu6050.**readTempData(callback(temp))**  
Reads the current temperature from the device. Temperature value supplied to the callback function measured in Celsius (&deg;C).

mpu6050.**readGyroData(callback(gx, gy, gz))**  
Reads the current rotational velocity measured by the device's gyroscope. Raw gyroscope values have gyro offsets removed and are scaled before being returned. Values supplied to the callback are measured in degrees per second (&deg;/s).

mpu6050.**readGyroRaw(callback(gx, gy, gz))**  
Provides raw readings directly from the gyroscope with no conversions applied. Useful for calibrating device.

mpu6050.**readMotionData(callback(ax, ay, az, gx, gy, gz))**  
Reads acceleration and rotation measurements from the device's accelerometer and gyroscope simultaneously. Values returned are the same as would otherwise be read individually through `readAccelerometerData` and `readGyroData`.

mpu6050.**getAccelPitchAndRoll(ax, ay, az)**  
Converts the 3-axis acceleration vectors into pitch and roll measurements. Output as an object containing { pitch, roll }. Output values are measured in degrees.

mpu6050.**readPitchAndRoll(delayMs, callback(pitch, roll))**  
Reads acceleration and rotation measurements from the device and calculates combined pitch and roll values using a complementary filter. The `delayMs` arguments tells the module how frequently reads will be taken and therefore how many milliseconds have elapsed since the last reading - this is required for integration of gyroscope output to produce pitch and roll measurements. Values supplied to the callback are measured in degrees.

mpu6050.**setSleepModeEnabled(enabled)**  
Sets the sleep mode of the device to the value of `enabled`.

mpu6050.**setAccelerometerRange(range, callback(err))**  
Sets the full scale range of the accelerometer to the value of `range`. Throws an error if `range` is not one of the allowed ranges `[2, 4, 8, 16]`. The callback will be called with an error from the Tessel I2C library if any error occurred.

mpu6050.**setGyroRange(range, callback(err))**  
Sets the full scale range of the gyroscope to the value of `range`. Throws an error if `range` is not one of the allowed ranges `[250, 500, 1000, 2000]`. The callback will be called with an error from The Tessel I2C library if any error occurred.

mpu6050.**setGyroOffsets(x, y, z)**  
Sets offsets for the gyroscope for each of the `x`, `y`, and `z` axes. This method can be used to set offsets for gyroscope readings, useful for gyroscope calibration.

**constants**  
An object of constants for reading and writing config values. Allows you to read/write registers that are not currently wrapped within the library using `_readRegisters` or `_writeRegisters` directly.

The convenience methods here do not model the complete
functionality of the MPU-6050 and there are advanced configurations that
aren't possible with the methods provided by this module alone. For any
advanced configuration, I recommend using `_readRegisters` and
`writeRegisters` directly, as required by your use case.

## Contributions

Any thoughts, comments, ideas, issues, or pull requests are welcome and appreciated.

## License

MIT

