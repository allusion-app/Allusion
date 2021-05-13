import { observer } from 'mobx-react-lite';
import React, { useContext } from 'react';
import PopupWindow from '../components/PopupWindow';
import StoreContext from '../contexts/StoreContext';

import Logo_About from 'resources/images/helpcenter/logo-about-helpcenter-dark.jpg';
import { shell } from 'electron';
import { RendererMessenger } from 'src/Messaging';

const clickLink = (e: React.MouseEvent<HTMLAnchorElement>) => {
  e.preventDefault();
  shell.openExternal((e.target as HTMLAnchorElement).href);
};

const About = observer(() => {
  const { uiStore } = useContext(StoreContext);

  if (!uiStore.isAboutOpen) {
    return null;
  }
  return (
    <PopupWindow onClose={uiStore.closeAbout} windowName="about" closeOnEscape>
      <div id="about" className="light">
        <img src={Logo_About} alt="Logo" />
        <small>
          Version <strong>{RendererMessenger.getVersion()}</strong>
        </small>
        <p>
          This application was made by a small team of individuals who gathered due to common
          interest in art, design and software.
          <br />
          It&apos;s completely <b>free and open source</b>! Find out more at
        </p>
        <span>
          <a href="https://allusion-app.github.io/" onClick={clickLink} className="outbound">
            allusion-app.github.io
          </a>
          .
        </span>
        <ul>
          <li>General information</li>
          <li>Download the latest version</li>
        </ul>
        <a href="https://github.com/allusion-app/Allusion" onClick={clickLink} className="outbound">
          github.com/allusion-app/Allusion
        </a>
        <ul>
          <li>🤓 View the source code</li>
          <li>🐛 Provide feedback and report bugs</li>
          <li>👥 Learn about contributing</li>
        </ul>
        {/* TODO: Licensing info here? */}
      </div>
    </PopupWindow>
  );
});

export default About;
