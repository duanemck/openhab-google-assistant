const SecuritySystem = require('../devices/securitysystem.js');
const DefaultCommand = require('./default.js');

class ArmDisarm extends DefaultCommand {
  static get type() {
    return 'action.devices.commands.ArmDisarm';
  }

  static validateParams(params) {
    return 'arm' in params && typeof params.arm === 'boolean';
  }

  static convertParamsToValue(params, _, device) {
    let arm = params.arm;
    let armLevel = params.armLevel;

    if (armLevel) {
      return armLevel;
    }

    if (this.isInverted(device)) {
      arm = !arm;
    }
    return arm ? 'ON' : 'OFF';
  }

  static getItemName(item, _, params) {
    return SecuritySystem.getMemberToSendArmCommand(item, params);
  }

  static requiresItem() {
    return true;
  }

  static getResponseStates(params) {
    let response = {
      isArmed: params.arm,
    }
    if (params.armLevel) {
      response.currentArmLevel = params.armLevel;
    }
    return response;
  }

  static shouldValidateStateChange() {
    return true;
  }

  static validateStateChange(params, item, device) {
    const members = SecuritySystem.getMembers(item);
    const isCurrentlyArmed = members[SecuritySystem.armedMemberName].state === 'ON';
    const currentLevel = members[SecuritySystem.armLevelMemberName].state;

    if (params.armLevel) {
      const alreadyArmedAtThisLevel = params.arm && isCurrentlyArmed && params.armLevel === currentLevel;
      if (alreadyArmedAtThisLevel) {
        return this.getErrorMessage(device, 'alreadyInState');
      }
      return;
    }

    if (params.arm && isCurrentlyArmed) {
      return this.getErrorMessage(device, 'alreadyArmed');
    }

    if (!params.arm && !isCurrentlyArmed) {
      return this.getErrorMessage(device, 'alreadyDisarmed');
    }

  }

  static getErrorMessage(device, errorCode) {
    return {
      ids: [device.id],
      status: 'ERROR',
      errorCode
    }
  }

  static checkUpdateFailed(params, item, device) {
    const members = SecuritySystem.getMembers(item);
    const isCurrentlyArmed = members[SecuritySystem.armedMemberName].state === 'ON';
    const currentLevel = members[SecuritySystem.armLevelMemberName].state;

    const armStatusSuccessful = params.arm === isCurrentlyArmed;
    const armLevelSuccessful = params.armLevel ? params.armLevel === currentLevel : true;

    if (armStatusSuccessful && armLevelSuccessful) {
      return;
    }

    return this.getErrorMessage(device, params.arm ? 'armFailure' : 'disarmFailure');
  }

  static getNewState(params, item, device) {
    const members = SecuritySystem.getMembers(item);
    let response = {
      online: true,
      isArmed: members[SecuritySystem.armedMemberName].state === 'ON'
    }
    if (params.armLevel) {
      response.currentArmLevel = members[SecuritySystem.armLevelMemberName].state;
    }
    return response;
  }
}

module.exports = ArmDisarm;
