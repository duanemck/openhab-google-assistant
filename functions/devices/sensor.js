const DefaultDevice = require('./default.js');

class Sensor extends DefaultDevice {
  static get type() {
    return 'action.devices.types.SENSOR';
  }

  static getTraits() {
    return [
      'action.devices.traits.SensorState'
    ];
  }

  static getAttributes(item) {
    const config = this.getConfig(item);
    if (!config || !config.sensorName) {
      return {};
    }
    const attributes = {
      sensorStatesSupported: {
        name: config.sensorName
      }
    };
    if (config.valueUnit) {
      attributes.sensorStatesSupported.numericCapabilities = {}
      attributes.sensorStatesSupported.numericCapabilities.rawValueUnit = config.valueUnit
    }
    if (config.states) {
      attributes.sensorStatesSupported.descriptiveCapabilities = {}
      attributes.sensorStatesSupported.descriptiveCapabilities.availableStates = config.states.split(',').map(s => s.trim().split('=')[0].trim());
    }
    return attributes;
  }

  static getState(item) {
    const config = this.getConfig(item);
    return {
      currentSensorStateData: {
        name: config.sensorName,
        currentSensorState: this.translateStateToGoogle(item),
        rawValue: Number(item.state) || 0
      }
    };
  }

  static translateStateToGoogle(item) {
    const config = this.getConfig(item);
    if ('states' in config) {
      const states = config.states.split(',').map(s => s.trim())
      for (const state of states) {
        const [key, value] = state.split('=').map(s => s.trim());
        if (value == item.state) {
          return key;
        }
      }
    }
    return '';
  }
}

module.exports = Sensor;
