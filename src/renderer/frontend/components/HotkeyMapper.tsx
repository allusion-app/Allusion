import {
  Callout,
  comboMatches,
  getKeyComboString,
  Icon,
  KeyCombo,
  parseKeyCombo,
  Tooltip,
} from '@blueprintjs/core';
import { Button } from 'components/Button';
import IconSet from 'components/Icons';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useContext, useRef, useState } from 'react';
import { AppToaster } from '../App';
import StoreContext from '../contexts/StoreContext';
import { defaultHotkeyMap, IHotkeyMap } from '../stores/UiStore';
import { camelCaseToSpaced } from '../utils';

const noop = () => void {};

interface IChangeableKeyComboProps {
  combo: string;
  defaultCombo: string;
  action: keyof IHotkeyMap;
  onChange: (action: keyof IHotkeyMap, combo: string) => void;
}

const ChangeableKeyCombo = ({
  action,
  combo,
  onChange,
  defaultCombo,
}: IChangeableKeyComboProps) => {
  const [isChanging, setIsChanging] = useState(false);
  const [newCombo, setNewCombo] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    uiStore: { hotkeyMap },
  } = useContext(StoreContext);

  const checkIfTaken = useCallback(
    (comboStr: string) => {
      const comboObj = parseKeyCombo(comboStr);
      if (comboMatches(comboObj, parseKeyCombo(hotkeyMap[action]))) return false;
      return Object.values(hotkeyMap).some((s) => comboMatches(parseKeyCombo(s), comboObj));
    },
    [action, hotkeyMap],
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') {
      setNewCombo('');
      setTimeout(() => inputRef.current?.blur(), 0); // run in next cycle so setNewCombo is processed
      return;
    } else if (e.key === 'Enter') {
      inputRef.current?.blur();
      return;
    }

    const comboString = getKeyComboString(e.nativeEvent);
    setNewCombo(comboString);
  }, []);

  const handleOnBlur = useCallback(() => {
    if (newCombo !== '') {
      onChange(action, newCombo);
    }
    setNewCombo('');
    setIsChanging(false);
  }, [action, newCombo, onChange]);

  const handleClick = useCallback(() => setIsChanging(true), []);

  const handleReset = useCallback(() => {
    onChange(action, defaultCombo);
  }, [action, defaultCombo, onChange]);

  return (
    <>
      {isChanging ? (
        <input
          value={`${newCombo}...`}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onBlur={handleOnBlur}
          autoFocus
          style={{ width: '120px' }}
          ref={inputRef}
          onChange={noop}
        />
      ) : (
        <div onClick={handleClick} style={{ cursor: 'pointer', display: 'inline' }}>
          <KeyCombo combo={newCombo || combo} className="inline" />
        </div>
      )}
      {!isChanging && !comboMatches(parseKeyCombo(combo), parseKeyCombo(defaultCombo)) && (
        <Button styling="minimal" icon={IconSet.RELOAD} onClick={handleReset} text="" />
      )}
      {isChanging && newCombo && checkIfTaken(newCombo) && (
        <Tooltip
          content="Key combination already in use!"
          defaultIsOpen
          usePortal={false}
          position="top"
        >
          <Icon intent="warning" icon="warning-sign" />
        </Tooltip>
      )}
    </>
  );
};

const HotkeyMapper = observer(() => {
  const { uiStore } = useContext(StoreContext);

  const handleChange = useCallback(
    (action: keyof IHotkeyMap, combo: string) => {
      const comboObj = parseKeyCombo(combo);
      if (comboMatches(comboObj, parseKeyCombo(uiStore.hotkeyMap[action]))) return;

      // Check if key combo is already taken
      if (Object.values(uiStore.hotkeyMap).some((s) => comboMatches(parseKeyCombo(s), comboObj))) {
        AppToaster.show({
          intent: 'warning',
          message: `The combination "${combo}" is already in use`,
        });
      } else {
        uiStore.remapHotkey(action, combo);
      }
    },
    [uiStore],
  );

  return (
    <>
      {/* Not sure why theme needs to be re-applied in new window. The user-agent style sheets take over for some reason */}
      <table
        style={{ width: '100%' }}
        className={uiStore.theme === 'LIGHT' ? 'bp3-light' : 'bp3-dark'}
      >
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
              <td style={{ height: '26px' }}>
                <ChangeableKeyCombo
                  action={key as keyof IHotkeyMap}
                  combo={(uiStore.hotkeyMap as any)[key]}
                  defaultCombo={defaultHotkeyMap[key as keyof IHotkeyMap]}
                  onChange={handleChange}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Callout>
        Click on a key combination to modify it. After typing your new combination, press Enter to
        confirm or Escape to cancel. The application must be reloaded for the changes to take
        effect.
        <br />
        <Button icon={IconSet.RELOAD} text="Reload" onClick={() => window.location.reload()} />
      </Callout>
    </>
  );
});

export default HotkeyMapper;
