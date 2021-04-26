import React, { useContext, useRef, useState } from 'react';
import { action } from 'mobx';
import { observer } from 'mobx-react-lite';
import { comboMatches, getKeyComboString, parseKeyCombo } from '../../hotkeyParser';

import StoreContext from '../../contexts/StoreContext';
import UiStore, { defaultHotkeyMap, IHotkeyMap } from '../../stores/UiStore';
import { camelCaseToSpaced } from '../../utils';
import { Button, IconSet, keyComboToString } from 'widgets';

export const HotkeyMapper = observer(() => {
  const { uiStore } = useContext(StoreContext);
  const [changed, onChange] = useState<keyof IHotkeyMap | null>(null);
  const textDispatch = useState('');

  const handleKeyDown = useRef((e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      onChange(null);
    } else if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else {
      textDispatch[1](getKeyComboString(e.nativeEvent));
    }
  });

  return (
    <div id="hotkey-mapper">
      {Object.entries(uiStore.hotkeyMap).map(([key, combo]) => {
        const actionKey = key as keyof IHotkeyMap;
        const isChanging = changed === actionKey;

        return (
          <details key={actionKey}>
            <summary>
              {camelCaseToSpaced(actionKey)} ({keyComboToString(combo)})
            </summary>
            <KeyComboEditor
              actionKey={actionKey}
              isChanging={isChanging}
              combo={combo}
              textDispatch={textDispatch}
              onKeyDown={handleKeyDown.current}
              setEditableKey={onChange}
              uiStore={uiStore}
            />
          </details>
        );
      })}
    </div>
  );
});

export default HotkeyMapper;

interface IKeyComboEditor {
  actionKey: keyof IHotkeyMap;
  isChanging: boolean;
  textDispatch: [string, React.Dispatch<React.SetStateAction<string>>];
  combo: string;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  uiStore: UiStore;
  setEditableKey: React.Dispatch<React.SetStateAction<keyof IHotkeyMap | null>>;
}

const KeyComboEditor = observer(
  ({
    actionKey,
    setEditableKey,
    isChanging,
    textDispatch,
    combo,
    onKeyDown,
    uiStore,
  }: IKeyComboEditor) => {
    const hotkeyMap = uiStore.hotkeyMap;
    const [text, setText] = textDispatch;
    const isEditable = useRef(true);
    const inputRef = useRef<HTMLInputElement>(null);
    const defaultCombo = defaultHotkeyMap[actionKey];

    const handleOnBlur = useRef((e: React.ChangeEvent<HTMLInputElement>) => {
      // The input is controlled which is why e.currentTarget.value equals 'combo'.
      // Depending on 'combo' would constantly recreate this function.
      if (!isInvalidCombo(e.currentTarget.value, actionKey, hotkeyMap)) {
        uiStore.remapHotkey(actionKey, e.currentTarget.value);
      }
      setEditableKey(null);
      setText('');
      isEditable.current = false;
    });

    return (
      <div className="key-combo-editor">
        <div>
          <input
            ref={inputRef}
            className="key-combo-input input"
            placeholder="Press a key..."
            value={isChanging ? text : keyComboToString(combo)}
            readOnly={!isChanging}
            onKeyDown={onKeyDown}
            onBlur={handleOnBlur.current}
            onChange={() => void {}} // React quirk requires change handler
          />
          {text.length > 0 && isInvalidCombo(text, actionKey, hotkeyMap) && (
            <div className="key-combo-input-warning">
              {IconSet.WARNING_FILL} Key combination already in use!
            </div>
          )}
        </div>
        <Button
          text={isChanging ? 'Save' : 'Edit'}
          onClick={() => {
            if (isEditable.current) {
              setEditableKey(actionKey);
              inputRef.current?.focus();
            } else {
              setEditableKey(null);
            }
            isEditable.current = !isEditable.current;
          }}
        />
        <Button
          icon={IconSet.RELOAD}
          onClick={() => uiStore.remapHotkey(actionKey, defaultCombo)}
          text="Reset to default"
          disabled={comboMatches(parseKeyCombo(combo), parseKeyCombo(defaultCombo))}
        />
      </div>
    );
  },
);

const isInvalidCombo = action((input: string, action: keyof IHotkeyMap, hotkeyMap: IHotkeyMap) => {
  if (input.length === 0) {
    return true;
  }
  const combo = parseKeyCombo(input);
  if (comboMatches(combo, parseKeyCombo(hotkeyMap[action]))) {
    return true;
  }
  return Object.values(hotkeyMap).some((s) => comboMatches(parseKeyCombo(s), combo));
});
