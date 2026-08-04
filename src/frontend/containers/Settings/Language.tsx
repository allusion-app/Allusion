import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Radio, RadioGroup } from 'widgets';
import i18n from '../../../i18n';
import { useStore } from '../../contexts/StoreContext';

export const Language = observer(() => {
  const { t } = useTranslation();
  const { uiStore } = useStore();
  const availableLanguages = Object.keys(i18n.options.resources ?? {}).sort();

  return (
    <>
      <h3>{t('settings.language.languageHeading')}</h3>
      <div className="vstack">
        <RadioGroup
          orientation="vertical"
          name={t('settings.language.language')}
          value={uiStore.language}
          onChange={uiStore.setLanguage}
        >
          {availableLanguages.map((language) => (
            <Radio key={language} value={language}>
              {t(`settings.language.languages.${language}`, { defaultValue: language })}
            </Radio>
          ))}
        </RadioGroup>
      </div>
    </>
  );
});
