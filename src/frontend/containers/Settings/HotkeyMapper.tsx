import React, { useContext, useState } from 'react';
import { action } from 'mobx';
import { observer } from 'mobx-react-lite';
import { comboMatches, getKeyComboString, parseKeyCombo } from '../../hotkeyParser';

import StoreContext from '../../contexts/StoreContext';
import { defaultHotkeyMap, IHotkeyMap } from '../../stores/UiStore';
import { camelCaseToSpaced } from '../../utils';
import { IconButton, IconSet, KeyCombo } from 'widgets';

export const HotkeyMapper = observer(() => {
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
                actionKey={key as keyof IHotkeyMap}
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

interface IChangeableKeyComboProps extends IKeyComboInput {
  combo: string;
  defaultCombo: string;
  isChanging: boolean;
}

const ChangeableKeyCombo = ({
  actionKey,
  combo,
  defaultCombo,
  isChanging,
  onChange,
}: IChangeableKeyComboProps) => {
  const { uiStore } = useContext(StoreContext);

  return isChanging ? (
    <KeyComboInput actionKey={actionKey} onChange={onChange} />
  ) : (
    <div>
      <span onClick={() => onChange(actionKey)} style={{ cursor: 'pointer' }}>
        <KeyCombo combo={combo} />
      </span>
      {!comboMatches(parseKeyCombo(combo), parseKeyCombo(defaultCombo)) && (
        <IconButton
          icon={IconSet.RELOAD}
          onClick={() => uiStore.remapHotkey(actionKey, defaultCombo)}
          text="Reload"
        />
      )}
    </div>
  );
};

interface IKeyComboInput {
  actionKey: keyof IHotkeyMap;
  onChange: (action: keyof IHotkeyMap | null) => void;
}

// There is no need for an observer as the input will only exist for a single edit.
const KeyComboInput = observer(({ actionKey, onChange }: IKeyComboInput) => {
  const { uiStore } = useContext(StoreContext);
  const hotkeyMap = uiStore.hotkeyMap;
  const [combo, setCombo] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      onChange(null);
    } else if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else {
      setCombo(getKeyComboString(e.nativeEvent));
    }
  };

  const handleOnBlur = (e: React.ChangeEvent<HTMLInputElement>) => {
    // The input is controlled which is why e.currentTarget.value equals 'combo'.
    // Depending on 'combo' would constantly recreate this function.
    if (!isInvalidCombo(e.currentTarget.value, actionKey, hotkeyMap)) {
      uiStore.remapHotkey(actionKey, e.currentTarget.value);
    }
    onChange(null);
  };

  return (
    <div>
      <input
        placeholder="..."
        value={combo}
        onKeyDown={handleKeyDown}
        onBlur={handleOnBlur}
        autoFocus
        onChange={() => void {}} // React quirk requires change handler
      />
      {combo.length > 0 && isInvalidCombo(combo, actionKey, hotkeyMap) && (
        <div>{IconSet.WARNING_FILL} Key combination already in use!</div>
      )}
    </div>
  );
});

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
