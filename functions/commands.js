/**
 * Copyright (c) 2010-2019 Contributors to the openHAB project
 *
 * See the NOTICE file(s) distributed with this work for additional
 * information.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0
 *
 * SPDX-License-Identifier: EPL-2.0
 */

/**
 * Command definitions for translating Google Actions Commands to openHAB Item Updates
 *
 * @author Michael Krug
 *
 */
const Thermostat = require('./devices.js').Thermostat;
const TV = require('./devices.js').TV;

const ackSupported = [
  'action.devices.commands.ArmDisarm',
  'action.devices.commands.Fill',
  'action.devices.commands.LockUnlock',
  'action.devices.commands.OnOff',
  'action.devices.commands.OpenClose',
  'action.devices.commands.ActivateScene',
  'action.devices.commands.ThermostatTemperatureSetpoint',
  'action.devices.commands.ThermostatTemperatureSetRange',
  'action.devices.commands.ThermostatSetMode',
  'action.devices.commands.TemperatureRelative'
];

const getCommandType = (command = '', params = {}) => {
  return CommandTypes.find((commandType) => commandType.appliesTo(command, params));
};

class GenericCommand {
  static get type() {
    return '';
  }

  static appliesTo(command = '', params = {}) {
    return command === this.type;
  }

  static convertParamsToValue(params = {}, item = {}, device = {}) {
    return null;
  }

  static getResponseStates(params = {}, item = {}) {
    return {};
  }

  static getItemName(device = {}) {
    return device.id;
  }

  static get requiresItem() {
    return false;
  }

  static handlAuthPin(device = {}, challenge = {}) {
    if (!device.customData || !device.customData.tfaPin || challenge.pin === device.customData.tfaPin) {
      return;
    }
    return {
      ids: [device.id],
      status: 'ERROR',
      errorCode: 'challengeNeeded',
      challengeNeeded: {
        type: !challenge.pin ? 'pinNeeded' : 'challengeFailedPinNeeded'
      }
    };
  }

  static handlAuthAck(device = {}, challenge = {}, responseStates = {}) {
    // check if acknowledge is supported for that command
    if (!ackSupported.includes(this.type) ||
        !device.customData || !device.customData.tfaAck || challenge.ack === true) {
      return;
    }
    return {
      ids: [device.id],
      status: 'ERROR',
      states: responseStates,
      errorCode: 'challengeNeeded',
      challengeNeeded: {
        type: 'ackNeeded'
      }
    };
  }

  static execute(apiHandler = {}, devices = [], params = {}, challenge = {}) {
    console.log(`openhabGoogleAssistant - ${this.type}: ${JSON.stringify({ devices: devices, params: params })}`);
    const commandsResponse = [];
    const promises = devices.map((device) => {

      const authPinResponse = this.handlAuthPin(device, challenge);
      if (authPinResponse) {
        commandsResponse.push(authPinResponse);
        return Promise.resolve();
      }

      let promise = Promise.resolve(({}));
      if (this.requiresItem) {
        promise = apiHandler.getItem(device.id);
      }

      return promise.then((item) => {
        const responseStates = this.getResponseStates(params, item);
        if (Object.keys(responseStates).length) {
          responseStates.online = true;
        }

        const authAckResponse = this.handlAuthAck(device, challenge, responseStates);
        if (authAckResponse) {
          commandsResponse.push(authAckResponse);
          return;
        }

        const targetItem = this.getItemName(device);
        const targetValue = this.convertParamsToValue(params, item, device);
        return apiHandler.sendCommand(targetItem, targetValue).then(() => {
          commandsResponse.push({
            ids: [device.id],
            status: 'SUCCESS',
            states: responseStates
          });
        });
      }).catch((error) => {
        commandsResponse.push({
          ids: [device.id],
          status: 'ERROR',
          errorCode: error.statusCode == 404 ? 'deviceNotFound' : error.statusCode == 400 ? 'notSupported' : 'deviceOffline'
        });
      });
    });
    return Promise.all(promises).then(() => commandsResponse);
  }
}

class OnOffCommand extends GenericCommand {
  static get type() {
    return 'action.devices.commands.OnOff';
  }

  static appliesTo(command, params) {
    return command === this.type && ('on' in params) && typeof params.on === 'boolean';
  }

  static convertParamsToValue(params) {
    return params.on ? 'ON' : 'OFF';
  }

  static getResponseStates(params) {
    return {
      on: params.on
    };
  }
}

class LockUnlockCommand extends GenericCommand {
  static get type() {
    return 'action.devices.commands.LockUnlock';
  }

  static appliesTo(command, params) {
    return command === this.type && ('lock' in params) && typeof params.lock === 'boolean';
  }

  static convertParamsToValue(params) {
    return params.lock ? 'ON' : 'OFF';
  }

  static getResponseStates(params) {
    return {
      on: params.on
    };
  }
}

class ArmDisarmCommand extends GenericCommand {
  static get type() {
    return 'action.devices.commands.ArmDisarm';
  }

  static appliesTo(command, params) {
    return command === this.type && ('arm' in params) && typeof params.arm === 'boolean';
  }

  static convertParamsToValue(params) {
    return params.arm ? 'ON' : 'OFF';
  }

  static getResponseStates(params) {
    return {
      isArmed: params.arm
    };
  }
}

class ActivateSceneCommand extends GenericCommand {
  static get type() {
    return 'action.devices.commands.ActivateScene';
  }

  static appliesTo(command, params) {
    return command === this.type && (
      (('deactivate' in params) && typeof params.deactivate === 'boolean') ||
      !('deactivate' in params)
    );
  }

  static convertParamsToValue(params) {
    return !params.deactivate ? 'ON' : 'OFF';
  }
}


class SetVolumeCommand extends GenericCommand {
  static get type() {
    return 'action.devices.commands.setVolume';
  }

  static appliesTo(command, params) {
    return command === this.type && ('volumeLevel' in params) && typeof params.volumeLevel === 'number';
  }

  static getItemName(device) {
    if (device.currentData && device.customData.deviceType == TV.type) {
      if (!device.customData.volume) {
        throw { statusCode: 400 };
      }
      return device.customData.volume;
    }
    return device.id;
  }

  static convertParamsToValue(params) {
    return params.volumeLevel.toString();
  }

  static getResponseStates(params) {
    return {
      currentVolume: params.volumeLevel,
      isMuted: params.volumeLevel === 0
    };
  }
}

class VolumeRelativeCommand extends GenericCommand {
  static get type() {
    return 'action.devices.commands.volumeRelative';
  }

  static appliesTo(command, params) {
    return command === this.type && ('volumeRelativeLevel' in params) && typeof params.volumeRelativeLevel === 'number';
  }

  static get requiresItem() {
    return true;
  }

  static getItemName(device) {
    if (device.currentData && device.customData.deviceType == TV.type) {
      if (!device.customData.volume) {
        throw { statusCode: 400 };
      }
      return device.customData.volume;
    }
    return device.id;
  }

  static convertParamsToValue(params, item, device) {
    if (device.currentData && device.customData.deviceType == TV.type) {
      const members = TV.getMembers(item);
      if (!members.volume) {
        throw { statusCode: 400 };
      }
      return parseInt(members.volume.state) + params.volumeRelativeLevel;
    }
    return parseInt(item.state) + params.volumeRelativeLevel;
  }

  static getResponseStates(params, item) {
    const state = this.convertParamsToValue(params, item);
    return {
      currentVolume: state,
      isMuted: state === 0
    };
  }
}

class MediaPauseCommand extends GenericCommand {
  static get type() {
    return 'action.devices.commands.mediaPause';
  }

  static getItemName(device) {
    if (device.currentData && device.customData.deviceType == TV.type) {
      if (!device.customData.mediastate) {
        throw { statusCode: 400 };
      }
      return device.customData.mediastate;
    }
    return device.id;
  }

  static convertParamsToValue() {
    return 'PAUSE';
  }
}

class MediaStopCommand extends MediaPauseCommand {
  static get type() {
    return 'action.devices.commands.mediaStop';
  }
}

class MediaResumeCommand extends MediaPauseCommand {
  static get type() {
    return 'action.devices.commands.mediaResume';
  }

  static convertParamsToValue() {
    return 'PLAY';
  }
}

class MediaNextCommand extends MediaPauseCommand {
  static get type() {
    return 'action.devices.commands.mediaNext';
  }

  static convertParamsToValue() {
    return 'NEXT';
  }
}

class MediaPreviousCommand extends MediaPauseCommand {
  static get type() {
    return 'action.devices.commands.mediaPrevious';
  }

  static convertParamsToValue() {
    return 'PREVIOUS';
  }
}

class BrightnessAbsoluteCommand extends GenericCommand {
  static get type() {
    return 'action.devices.commands.BrightnessAbsolute';
  }

  static appliesTo(command, params) {
    return command === this.type && ('brightness' in params) && typeof params.brightness === 'number';
  }

  static convertParamsToValue(params) {
    return params.brightness.toString();
  }

  static getResponseStates(params) {
    return {
      brightness: params.brightness
    };
  }
}

class ColorAbsoluteCommand extends GenericCommand {
  static get type() {
    return 'action.devices.commands.ColorAbsolute';
  }

  static appliesTo(command, params) {
    return command === this.type && (
      (('color' in params) && typeof params.color === 'object') &&
      (('spectrumHSV' in params.color) && typeof params.color.spectrumHSV === 'object')
    );
  }

  static convertParamsToValue(params) {
    return [params.color.spectrumHSV.hue, params.color.spectrumHSV.saturation * 100, params.color.spectrumHSV.value * 100].join(',');
  }

  static getResponseStates(params) {
    return {
      on: params.color.spectrumHSV.value > 0,
      brightness: params.color.spectrumHSV.value,
      color: params.color
    };
  }
}

class OpenCloseCommand extends GenericCommand {
  static get type() {
    return 'action.devices.commands.OpenClose';
  }

  static appliesTo(command, params) {
    return command === this.type && ('openPercent' in params) && typeof params.openPercent === 'number';
  }

  static convertParamsToValue(params, item, device) {
    let value = params.openPercent === 0 ? 'DOWN' : params.openPercent === 100 ? 'UP' : (100 - params.openPercent).toString();
    // item can not handle OpenClose --> we will send "ON" / "OFF"
    if (device.customData && device.customData.itemType !== 'Rollershutter') {
      value = params.openPercent === 0 ? 'OFF' : 'ON';
    }
    return value;
  }

  static getResponseStates(params) {
    return {
      openPercent: params.openPercent
    };
  }
}

class StartStopCommand extends GenericCommand {
  static get type() {
    return 'action.devices.commands.StartStop';
  }

  static appliesTo(command, params) {
    return command === this.type && ('start' in params) && typeof params.start === 'boolean';
  }

  static convertParamsToValue(params, item, device) {
    let value = params.start ? 'MOVE' : 'STOP';
    // item can not handle StartStop --> we will send "ON" / "OFF"
    if (device.customData && device.customData.itemType !== 'Rollershutter') {
      value = params.start ? 'ON' : 'OFF';
    }
    return value;
  }

  static getResponseStates(params) {
    return {
      isRunning: params.start,
      isPaused: !params.start
    };
  }
}

class ThermostatTemperatureSetpointCommand extends GenericCommand {
  static get type() {
    return 'action.devices.commands.ThermostatTemperatureSetpoint';
  }

  static appliesTo(command, params) {
    return command === this.type && ('thermostatTemperatureSetpoint' in params) && typeof params.thermostatTemperatureSetpoint === 'number';
  }

  static get requiresItem() {
    return true;
  }

  static getItemName(device) {
    if (!device.customData || !device.customData.thermostatTemperatureSetpoint) {
      throw { statusCode: 400 };
    }
    return device.customData.thermostatTemperatureSetpoint;
  }

  static convertParamsToValue(params, item) {
    let value = params.thermostatTemperatureSetpoint.toString();
    if (Thermostat.usesFahrenheit(item)) {
      value = Thermostat.convertToFahrenheit(params.thermostatTemperatureSetpoint).toString();
    }
    return value;
  }

  static getResponseStates(params, item) {
    const states = Thermostat.getState(item);
    states.thermostatTemperatureSetpoint = params.thermostatTemperatureSetpoint;
    return states;
  }
}

class ThermostatSetModeCommand extends GenericCommand {
  static get type() {
    return 'action.devices.commands.ThermostatSetMode';
  }

  static appliesTo(command, params) {
    return command === this.type && ('thermostatMode' in params) && typeof params.thermostatMode === 'string';
  }

  static get requiresItem() {
    return true;
  }

  static getItemName(device) {
    if (!device.customData || !device.customData.thermostatMode) {
      throw { statusCode: 400 };
    }
    return device.customData.thermostatMode;
  }

  static convertParamsToValue(params, item) {
    const members = Thermostat.getMembers(item);
    if (!members.thermostatMode) {
      throw { statusCode: 400 };
    }
    return Thermostat.denormalizeThermostatMode(members.thermostatMode.state, params.thermostatMode);
  }

  static getResponseStates(params, item) {
    const states = Thermostat.getState(item);
    states.thermostatMode = params.thermostatMode;
    return states;
  }
}

const CommandTypes = [
  OnOffCommand,
  LockUnlockCommand,
  ArmDisarmCommand,
  ActivateSceneCommand,
  BrightnessAbsoluteCommand,
  SetVolumeCommand,
  VolumeRelativeCommand,
  ColorAbsoluteCommand,
  OpenCloseCommand,
  StartStopCommand,
  MediaPauseCommand,
  MediaStopCommand,
  MediaResumeCommand,
  MediaNextCommand,
  MediaPreviousCommand,
  ThermostatTemperatureSetpointCommand,
  ThermostatSetModeCommand
];

module.exports = {
  getCommandType
};
