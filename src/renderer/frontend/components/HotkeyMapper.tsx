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

// There is no need for an observer as the input will only exist for a single edit.
const KeyComboInput = ({ action, onChange }: IKeyComboInput) => {
  const { uiStore } = useContext(StoreContext);
  const [newCombo, setNewCombo] = useState('');

  const checkIfTaken = useCallback(
    (comboStr: string) => {
      if (comboStr === '') {
        return false;
      }
      const comboObj = parseKeyCombo(comboStr);
      if (comboMatches(comboObj, parseKeyCombo(uiStore.hotkeyMap[action]))) {
        return false;
      }
      return Object.values(uiStore.hotkeyMap).some((s) => comboMatches(parseKeyCombo(s), comboObj));
    },
    [action, uiStore.hotkeyMap],
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') {
      setNewCombo('');
      setTimeout(() => e.currentTarget.blur(), 0); // run in next cycle so setNewCombo is processed
      return;
    } else if (e.key === 'Enter') {
      e.currentTarget.blur();
      return;
    }

    const comboString = getKeyComboString(e.nativeEvent);
    setNewCombo(comboString);
  }, []);

  const handleOnBlur = useCallback(() => {
    if (checkIfTaken(newCombo)) {
      uiStore.remapHotkey(action, newCombo);
    }
    onChange(null);
  }, [action, checkIfTaken, newCombo, onChange, uiStore]);

  return (
    <div>
      <input
        placeholder="..."
        value={newCombo}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onBlur={handleOnBlur}
        autoFocus
        style={{ width: '120px' }}
        onChange={noop}
      />
      {checkIfTaken(newCombo) && <div>{IconSet.WARNING_FILL} Key combination already in use!</div>}
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
        {Object.keys(uiStore.hotkeyMap).map((key) => (
          <tr key={key}>
            <td>{camelCaseToSpaced(key)}</td>
            <td>
              <ChangeableKeyCombo
                action={key as keyof IHotkeyMap}
                combo={uiStore.hotkeyMap[key as keyof IHotkeyMap]}
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
