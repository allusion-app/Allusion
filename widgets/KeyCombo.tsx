import React, { useMemo } from 'react';
import { capitalize } from 'common/fmt';
import { IS_MAC } from 'common/process';

const MOD = IS_MAC ? 'Cmd' : 'Ctrl';

export const KeyCombo = ({ combo }: { combo: string }) => {
  const platformCombo = useMemo(() => keyComboToString(combo), [combo]);
  return <span className="keycombo">{platformCombo}</span>;
};

export function keyComboToString(combo: string) {
  const keys = combo.split('+');
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i].trim();
    switch (key) {
      case 'plus':
        keys[i] = '+';
        break;

      case 'minus':
        keys[i] = '−';
        break;

      case 'left':
        keys[i] = 'LeftArrow';
        break;

      case 'up':
        keys[i] = 'UpArrow';
        break;

      case 'down':
        keys[i] = 'DownArrow';
        break;

      case 'right':
        keys[i] = 'RightArrow';
        break;

      case 'alt':
      case 'option':
        keys[i] = 'Alt';
        break;

      case 'cmd':
      case 'command':
        keys[i] = 'Cmd';
        break;

      case 'win':
        keys[i] = 'Win';
        break;

      case 'mod':
        keys[i] = MOD;
        break;

      case 'esc':
      case 'escape':
        keys[i] = 'Esc';
        break;

      default:
        keys[i] = capitalize(key);
    }
  }
  return keys.join('+');
}
