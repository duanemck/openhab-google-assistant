const Devices = require('../functions/devices.js');

describe('Test Lighting items', () => {
  test('Switch Lighting type', () => {
    expect(Devices.getDeviceForItem({
      type: 'Switch',
      tags: [
        'Lighting'
      ]
    }).name).toBe('SimpleLight');
  });

  test('Switch Group Lighting type', () => {
    expect(Devices.getDeviceForItem({
      type: 'Group',
      groupType: 'Switch',
      tags: [
        'Lighting'
      ]
    }).name).toBe('SimpleLight');
  });

  test('Dimmer Lighting type', () => {
    expect(Devices.getDeviceForItem({
      type: 'Dimmer',
      tags: [
        'Lighting'
      ]
    }).name).toBe('DimmableLight');
  });

  test('Dimmer Group Lighting type', () => {
    expect(Devices.getDeviceForItem({
      type: 'Group',
      groupType: 'Dimmer',
      tags: [
        'Lighting'
      ]
    }).name).toBe('DimmableLight');
  });

  test('Color Lighting type', () => {
    expect(Devices.getDeviceForItem({
      type: 'Color',
      tags: [
        'Lighting'
      ]
    }).name).toBe('ColorLight');
  });

  test('Color Group Lighting type', () => {
    expect(Devices.getDeviceForItem({
      type: 'Group',
      groupType: 'Color',
      tags: [
        'Lighting'
      ]
    }).name).toBe('ColorLight');
  });
});

describe('Test Thermostat item', () => {
  test('appliesTo', () => {
    expect(Devices.getDeviceForItem({
      type: 'Group',
      tags: [
        'Thermostat'
      ]
    }).name).toBe('Thermostat');

    expect(Devices.getDeviceForItem({
      type: 'Switch',
      tags: [
        'Thermostat'
      ]
    })).toBe(undefined);

    expect(Devices.getDeviceForItem({
      type: 'Group',
      tags: [
        'Something'
      ]
    })).toBe(undefined);
  });

  test('usesFahrenheit tag', () => {
    expect(Devices.Thermostat.usesFahrenheit({
      tags: [
        'Thermostat',
        'Fahrenheit'
      ]
    })).toBe(true);
  });

  test('getAttributes', () => {
    expect(Devices.Thermostat.getAttributes({
      tags: [
        'Thermostat',
        'Fahrenheit'
      ]
    })).toStrictEqual({
      'availableThermostatModes': 'off,heat,cool,on,heatcool',
      'thermostatTemperatureUnit': 'F',
    });

    expect(Devices.Thermostat.getAttributes({
      tags: [
        'Thermostat'
      ]
    })).toStrictEqual({
      'availableThermostatModes': 'off,heat,cool,on,heatcool',
      'thermostatTemperatureUnit': 'C',
    });
  });

  test('convertToCelsius', () => {
    expect(Devices.Thermostat.convertToCelsius(10.0)).toEqual(-12.2);
    expect(Devices.Thermostat.convertToCelsius(0.0)).toEqual(-17.8);
  });

  test('convertToFahrenheit', () => {
    expect(Devices.Thermostat.convertToFahrenheit(10.0)).toEqual(50);
    expect(Devices.Thermostat.convertToFahrenheit(0.0)).toEqual(32);
  });

  test('normalizeThermostatMode', () => {
    expect(Devices.Thermostat.normalizeThermostatMode('heat')).toEqual('heat');
    expect(Devices.Thermostat.normalizeThermostatMode('off')).toEqual('off');
    expect(Devices.Thermostat.normalizeThermostatMode('on')).toEqual('on');
    expect(Devices.Thermostat.normalizeThermostatMode('heat-cool')).toEqual('heatcool');
    expect(Devices.Thermostat.normalizeThermostatMode('0')).toEqual('off');
    expect(Devices.Thermostat.normalizeThermostatMode('1')).toEqual('heat');
    expect(Devices.Thermostat.normalizeThermostatMode('2')).toEqual('cool');
    expect(Devices.Thermostat.normalizeThermostatMode('3')).toEqual('on');
  });

  test('denormalizeThermostatMode', () => {
    expect(Devices.Thermostat.denormalizeThermostatMode('heat', 'heat')).toEqual('heat');
    expect(Devices.Thermostat.denormalizeThermostatMode('heat', 'off')).toEqual('off');
    expect(Devices.Thermostat.denormalizeThermostatMode('heat', 'on')).toEqual('on');
    expect(Devices.Thermostat.denormalizeThermostatMode('heat', 'heat-cool')).toEqual('on');
    expect(Devices.Thermostat.denormalizeThermostatMode('0', 'off')).toEqual('0');
    expect(Devices.Thermostat.denormalizeThermostatMode('1', 'heat')).toEqual('1');
    expect(Devices.Thermostat.denormalizeThermostatMode('2', 'cool')).toEqual('2');
    expect(Devices.Thermostat.denormalizeThermostatMode('3', 'on')).toEqual('3');
  });

  test('getState', () => {
    expect(Devices.Thermostat.getState({
      type: 'Group',
      tags: [
        'Thermostat'
      ]
    })).toStrictEqual({});

    expect(Devices.Thermostat.getState({
      type: 'Group',
      tags: [
        'Thermostat',
        'Fahrenheit'
      ],
      members: [{
        type: 'Number',
        tags: [
          'CurrentTemperature'
        ],
        state: '10'
      }, {
        type: 'Number',
        tags: [
          'TargetTemperature'
        ],
        state: '10'
      }, {
        type: 'Number',
        tags: [
          'HeatingCoolingMode'
        ],
        state: 'off'
      }]
    })).toStrictEqual({
      'thermostatTemperatureAmbient': -12.2,
      'thermostatTemperatureSetpoint': -12.2,
      'thermostatMode': 'off'
    });

    expect(Devices.Thermostat.getState({
      type: 'Group',
      tags: [
        'Thermostat'
      ],
      members: [{
        type: 'Number',
        tags: [
          'CurrentTemperature'
        ],
        state: '10'
      }, {
        type: 'Number',
        tags: [
          'TargetTemperature'
        ],
        state: '10'
      }, {
        type: 'Number',
        tags: [
          'HeatingCoolingMode'
        ],
        state: '1'
      }, {
        type: 'Number',
        tags: [
          'CurrentHumidity'
        ],
        state: '50'
      }]
    })).toStrictEqual({
      'thermostatTemperatureAmbient': 10,
      'thermostatTemperatureSetpoint': 10,
      'thermostatMode': 'heat',
      'thermostatHumidityAmbient': 50,
    });
  });
});
