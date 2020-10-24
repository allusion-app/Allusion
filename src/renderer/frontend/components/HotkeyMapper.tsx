import { comboMatches, getKeyComboString, KeyCombo, parseKeyCombo } from '@blueprintjs/core';
import { IconButton, IconSet } from 'components';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useContext, useState } from 'react';
import StoreContext from '../contexts/StoreContext';
import { defaultHotkeyMap, IHotkeyMap } from '../stores/UiStore';
import { camelCaseToSpaced } from '../utils';

const noop = () => void {};

interface IKeyComboInput {
  action: keyof IHotkeyMap;
  onChange: (action: keyof IHotkeyMap | null) => void;
}

const isInvalidCombo = (input: string, action: keyof IHotkeyMap, hotkeyMap: IHotkeyMap) => {
  if (input.length === 0) {
    return true;
  }
  const combo = parseKeyCombo(input);
  if (comboMatches(combo, parseKeyCombo(hotkeyMap[action]))) {
    return true;
  }
  return Object.values(hotkeyMap).some((s) => comboMatches(parseKeyCombo(s), combo));
};

// There is no need for an observer as the input will only exist for a single edit.
const KeyComboInput = ({ action, onChange }: IKeyComboInput) => {
  const { uiStore } = useContext(StoreContext);
  const [combo, setCombo] = useState('');

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      e.stopPropagation();
      if (e.key === 'Escape') {
        onChange(null);
      } else if (e.key === 'Enter') {
        e.currentTarget.blur();
      } else {
        setCombo(getKeyComboString(e.nativeEvent));
      }
    },
    [onChange],
  );

  const handleOnBlur = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // The input is controlled which is why e.currentTarget.value equals 'combo'.
      // Depending on 'combo' would constantly recreate this function.
      if (!isInvalidCombo(e.currentTarget.value, action, uiStore.hotkeyMap)) {
        uiStore.remapHotkey(action, e.currentTarget.value);
      }
      onChange(null);
    },
    [action, onChange, uiStore],
  );

  return (
    <div>
      <input
        placeholder="..."
        value={combo}
        onKeyDown={handleKeyDown}
        onBlur={handleOnBlur}
        autoFocus
        onChange={noop}
      />
      {combo.length > 0 && isInvalidCombo(combo, action, uiStore.hotkeyMap) && (
        <div>{IconSet.WARNING_FILL} Key combination already in use!</div>
      )}
    </div>
  );
};

interface IChangeableKeyComboProps extends IKeyComboInput {
  combo: string;
  defaultCombo: string;
  isChanging: boolean;
}

const ChangeableKeyCombo = ({
  action,
  combo,
  defaultCombo,
  isChanging,
  onChange,
}: IChangeableKeyComboProps) => {
  const { uiStore } = useContext(StoreContext);

  return isChanging ? (
    <KeyComboInput action={action} onChange={onChange} />
  ) : (
    <div>
      <span onClick={() => onChange(action)} style={{ cursor: 'pointer' }}>
        <KeyCombo combo={combo} />
      </span>
      {!comboMatches(parseKeyCombo(combo), parseKeyCombo(defaultCombo)) && (
        <IconButton
          icon={IconSet.RELOAD}
          onClick={() => uiStore.remapHotkey(action, defaultCombo)}
          text="Reload"
        />
      )}
    </div>
  );
};

const HotkeyMapper = observer(() => {
  const { uiStore } = useContext(StoreContext);
  const [changed, onChange] = useState<keyof IHotkeyMap | null>(null);

  return (
    <table>
      <thead>
        <tr>
          <th>Action</th>
          <th>Key combination</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(uiStore.hotkeyMap).map(([key, combo]) => (
          <tr key={key}>
            <td>{camelCaseToSpaced(key)}</td>
            <td>
              <ChangeableKeyCombo
                action={key as keyof IHotkeyMap}
                combo={combo}
                defaultCombo={defaultHotkeyMap[key as keyof IHotkeyMap]}
                isChanging={changed === key}
                onChange={onChange}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
});

export default HotkeyMapper;
