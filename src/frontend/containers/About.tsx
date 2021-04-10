import { observer } from 'mobx-react-lite';
import React, { useContext } from 'react';
import PopupWindow from '../components/PopupWindow';
import StoreContext from '../contexts/StoreContext';

import Logo_About from 'resources/images/helpcenter/logo-about-helpcenter.jpg';
import { shell } from 'electron';

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
        <div className="centered">
          <img src={Logo_About} alt="Logo" />
          <br />
          This application was made by a small team of individuals who gathered due to common
          interest in art, design and software.
          <br />
          It&apos;s completely <b>free and open source</b>! Find out more:
          <h3>
            <a href="https://allusion-app.github.io/" onClick={clickLink}>
              allusion-app.github.io
            </a>
          </h3>
          <ul>
            <li>ℹ General information</li>
            <li>⬇ Download the latest version</li>
          </ul>
          <h3>
            <a href="https://github.com/allusion-app/Allusion" onClick={clickLink}>
              github.com/allusion-app/Allusion
            </a>
          </h3>
          <ul>
            <li>🤓 View the source code</li>
            <li>🐛 Provide feedback and report bugs</li>
            <li>👥 Learn about contributing</li>
          </ul>
          <br />
        </div>
      </div>
    </PopupWindow>
  );
});

export default About;
