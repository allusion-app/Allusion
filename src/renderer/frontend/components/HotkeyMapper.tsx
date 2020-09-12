import React, { useContext, useState, useCallback, useRef } from 'react';
import RootStore from '../stores/RootStore';
import StoreContext from '../contexts/StoreContext';
import { capitalize, camelCaseToSpaced } from '../utils';
import { KeyCombo, getKeyComboString, Callout } from '@blueprintjs/core';
import { Button } from 'components/Button';
import IconSet from 'components/Icons';
import { defaultHotkeyMap, IHotkeyMap } from '../stores/UiStore';
import { observer } from 'mobx-react-lite';

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
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') {
      setNewCombo('');
      setTimeout(() => wrapperRef.current?.blur(), 0); // run in next cycle so setNewCombo is processed
      return;
    } else if (e.key === 'Enter') {
      wrapperRef.current?.blur();
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

  console.log({ combo, newCombo, defaultCombo, equal: combo === defaultCombo });

  return (
    <>
      <div
        ref={wrapperRef}
        onKeyDown={handleKeyDown}
        onBlur={handleOnBlur}
        onClick={handleClick}
        tabIndex={0}
        style={{ cursor: 'pointer', display: 'inline' }}
      >

        <KeyCombo minimal={isChanging} combo={newCombo || combo} className="inline" />
        {isChanging && ' ...'}

      </div>
      {combo !== defaultCombo && (
        <Button styling="minimal" icon={IconSet.RELOAD} onClick={handleReset} text="" />
      )}
    </>
  );
};

const HotkeyMapper = observer(() => {
  const { uiStore } = useContext(StoreContext);

  return (
    <>
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
                combo={(uiStore.hotkeyMap as any)[key]}
                defaultCombo={defaultHotkeyMap[key as keyof IHotkeyMap]}
                onChange={uiStore.remapHotkey}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
      <Callout>
        Click on a key combination to modify it.
        After typing your new combination, press Enter to confirm or Escape to cancel.
        The application must be reloaded for the changes to take effect.
        <br />
        <Button icon={IconSet.RELOAD} text="Reload" onClick={() => window.location.reload()} />
      </Callout>
    </>
  );
});

export default HotkeyMapper;
