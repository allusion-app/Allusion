import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import PopupWindow from '../components/PopupWindow';
import { useStore } from '../contexts/StoreContext';

import Logo_About from 'resources/images/helpcenter/logo-about-helpcenter-dark.jpg';
import { RendererMessenger } from 'src/ipc/renderer';
import ExternalLink from '../components/ExternalLink';

const About = observer(() => {
  const { t } = useTranslation();
  const { uiStore } = useStore();

  if (!uiStore.isAboutOpen) {
    return null;
  }
  return (
    <PopupWindow onClose={uiStore.closeAbout} windowName="about" closeOnEscape>
      <div id="about" className="light">
        <img src={Logo_About} alt="Logo" />
        <small>
          {t('about.version')}: <strong>{RendererMessenger.getVersion()}</strong>
        </small>
        <p>
          {t('about.description')}
          <br />
          {t('about.freeAndOpen')}
        </p>
        <span>
          <ExternalLink url="https://allusion-app.github.io/">{t('about.website')}</ExternalLink>.
        </span>
        <ul>
          <li>{t('about.generalInfo')}</li>
          <li>{t('about.downloadLatest')}</li>
        </ul>
        <ExternalLink url="https://github.com/allusion-app/Allusion">
          {t('about.repo')}
        </ExternalLink>
        <ul>
          <li>{t('about.viewSource')}</li>
          <li>{t('about.provideFeedback')}</li>
          <li>{t('about.contributing')}</li>
        </ul>
        {/* TODO: Licensing info here? */}
      </div>
    </PopupWindow>
  );
});

export default About;
