import './checkbox.scss';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface IToggle {
  checked?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onLabel?: string;
  offLabel?: string;
}

const Toggle = (props: IToggle) => {
  const { t } = useTranslation('common');
  const { checked, onChange, onLabel = t('on'), offLabel = t('off') } = props;
  return (
    <label className="toggle">
      <input data-toggle type="checkbox" checked={checked} onChange={onChange} />
      {checked ? onLabel : offLabel}
    </label>
  );
};

interface ICheckbox {
  label: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const Checkbox = (props: ICheckbox) => {
  const { label, defaultChecked, checked, onChange } = props;
  return (
    <label className="checkbox">
      <input
        type="checkbox"
        defaultChecked={defaultChecked}
        checked={checked}
        onChange={onChange}
      />
      &nbsp;
      {label}
    </label>
  );
};

export { Toggle, Checkbox };
