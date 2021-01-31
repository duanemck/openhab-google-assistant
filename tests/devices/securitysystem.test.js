const Device = require('../../functions/devices/securitysystem.js');

describe('SecuritySystem Device', () => {
  test('isCompatible', () => {
    expect(
      Device.isCompatible({
        metadata: {
          ga: {
            value: 'SECURITYSYSTEM'
          }
        }
      })
    ).toBe(true);
  });

  test('matchesItemType', () => {
    expect(Device.matchesItemType({ type: 'Switch' })).toBe(true);
    expect(Device.matchesItemType({ type: 'String' })).toBe(false);
    expect(Device.matchesItemType({ type: 'Group', groupType: 'Switch' })).toBe(true);
  });

  describe('getState', () => {
    test('getState', () => {
      let device = {
        members: [
          {
            metadata: {
              ga: {
                value: Device.armedMemberName
              }
            },
            state: "ON"
          }
        ]
      }
      expect(Device.getState(device)).toStrictEqual({
        "isArmed": true,
        "currentArmLevel": undefined,
        "currentStatusReport": []
      });
      device.members[0].state = "OFF";

      expect(Device.getState(device)).toStrictEqual({
        "isArmed": false,
        "currentArmLevel": undefined,
        "currentStatusReport": []
      });
    });

    test('getState inverted', () => {
      const item = {
        members: [
          {
            metadata: {
              ga: {
                value: Device.armedMemberName
              }
            },
            state: "ON"
          }
        ],
            }
          }
        }
      };
      expect(Device.getState(item)).toStrictEqual({
        "isArmed": false,
        "currentArmLevel": undefined,
        "currentStatusReport": []
      });
    });
  });
});
