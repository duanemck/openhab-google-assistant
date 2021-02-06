const DefaultDevice = require('./default.js');

// TODO:
// Option for pin on disarm only
// Don't store the pin at Google in the customData
// Report state
// Run locally
// Pin and Ack case

const configLang = 'lang';
const configOrdered = 'ordered';
const configArmLevels = 'armLevels';

const zoneTypeOpenClose = 'OpenClose';
const zoneTypeMotion = 'Motion';

const memberArmed = 'securitySystemArmed';
const memberArmLevel = 'securitySystemArmLevel';
const memberZone = 'securitySystemZone';
const memberTrouble = 'securitySystemTrouble';
const memberErrorCode = 'securitySystemTroubleCode';

const supportedMembers = [
  memberArmed,
  memberArmLevel,
  memberZone,
  memberTrouble,
  memberErrorCode
];

const errorNotSupported = 'notSupported';
const errorDeviceOpen = 'deviceOpen';
const errorMotionDetected = 'motionDetected';

const defaultLanguage = 'en';

const stateSwitchActive = 'ON';
const stateContactActive = 'OPEN';

const zoneStateActive = [stateSwitchActive, stateContactActive];

class SecuritySystem extends DefaultDevice {

  static get type() {
    return 'action.devices.types.SECURITYSYSTEM';
  }

  static getTraits() {
    return [
      'action.devices.traits.ArmDisarm',
      'action.devices.traits.StatusReport'
  }

  static get armedMemberName() {
    return memberArmed;
  }

  static get armLevelMemberName() {
    return memberArmLevel;
  }

  static getMemberToSendArmCommand(item, params) {
    const members = this.getMembers(item);
    if (params.armLevel) {
      if (memberArmLevel in members) {
        return members[memberArmLevel].name;
      }
    }
    if (memberArmed in members) {
      return members[memberArmed].name;
    }
    throw { statusCode: 400 };
  }

  static matchesItemType(item) {
    return item.type === 'Group' && Object.keys(this.getMembers(item)).length > 0;
  }

  static getAttributes(item) {

    //Group [armLevels="L1=Stay,L2=Away", lang="en", ordered=true]
    //Zone [zoneType="OpenClose", blocking=true]
    //Zone [zoneType="Motion", blocking=false]

    const config = this.getConfig(item);
    const ordered = configOrdered in config ? config.ordered : false;
    const language = configLang in config ? config.lang : defaultLanguage;

    let attributes = {
      availableArmLevels: { levels: [], ordered: ordered },
    };

    if (configArmLevels in config) {
      attributes.availableArmLevels.levels = config.armLevels
        .split(',')
        .map(level => level.split('='))
        .map(([levelName, levelSynonym]) => {
          return {
            level_name: levelName,
            level_values: [{
              level_synonym: [levelSynonym],
              lang: language
            }]

          }
        });
    }
    return attributes;
  }

  static getMembers(item) {
    const members = {
      zones: []
    };
    if (item.members && item.members.length) {
      item.members.forEach(member => {
        if (member.metadata && member.metadata.ga) {
          const memberType = supportedMembers.find(m => member.metadata.ga.value.toLowerCase() === m.toLowerCase());
          if (memberType) {
            const memberDetails = { name: member.name, state: member.state, config: this.getConfig(member) };
            if (memberType === memberZone) {
              members.zones.push(memberDetails);
            } else {
              members[memberType] = memberDetails;
            }
          }
        }
      });
    }
    return members;
  }

  static getState(item) {
    const members = this.getMembers(item);
    let state = members[memberArmed].state === stateSwitchActive;
    let armLevel = undefined;
    if (state && memberArmLevel in members) {
      armLevel = members[memberArmLevel].state;
    }

    if (this.getConfig(item).inverted === true) {
      state = !state;
    }

    return {
      isArmed: state,
      currentArmLevel: armLevel,
      currentStatusReport: this.getStatusReport(item, members)
    };
  }

  static getStatusReport(item, members) {
    let report = [];

    let isTrouble = memberTrouble in members && members[memberTrouble].state === stateSwitchActive;

    if (isTrouble) {
      let troubleCode = members[memberErrorCode].state;
      report.push({
        blocking: false,
        deviceTarget: item.name,
        priority: 0,
        statusCode: troubleCode
      });
    };

    for (let zone of members.zones) {
      if (zoneStateActive.includes(zone.state)) {
        let code = errorNotSupported;
        switch (zone.config.zoneType) {
          case zoneTypeOpenClose: code = errorDeviceOpen; break;
          case zoneTypeMotion: code = errorMotionDetected; break;
        };
        report.push({
          blocking: zone.config.blocking === true,
          deviceTarget: zone.name,
          priority: 1,
          statusCode: code
        })
      }
    }
    return report;
  }

}

module.exports = SecuritySystem;
