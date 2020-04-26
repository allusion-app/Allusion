import React, { useContext } from 'react';
import { observer } from 'mobx-react-lite';
import { Drawer, Classes } from '@blueprintjs/core';

import StoreContext from '../contexts/StoreContext';
import IconSet from './Icons';

const HelpCenter = observer(() => {
  const { uiStore } = useContext(StoreContext);
  const themeClass = uiStore.theme === 'DARK' ? 'bp3-dark' : 'bp3-light';

  return (
    <Drawer
      isOpen={uiStore.isHelpCenterOpen}
      icon={IconSet.OPEN_EXTERNAL}
      onClose={uiStore.toggleHelpCenter}
      title="HelpCenter"
      className={themeClass}
    >
      <div className={Classes.DRAWER_BODY}>
        <div className="helpCenter">
          <div className="opening">
            <h2>Learn Allusion</h2>
            <p>Some documents to get you started</p>
          </div>
          <div className="navigation">
            <ul>
              <li>
                <span>About Allusion</span>
                <span>Icon</span>
              </li>
              <ul>
                <li>What is Allusion</li>
              </ul>
              <li>
                <span>Library Setup</span>
                <span>Icon</span>
              </li>
              <ul>
                <li>Getting Started</li>
                <li>Locations</li>
                <li>Drag & Drop</li>
              </ul>
              <li>
                <span>Tagging</span>
                <span>Icon</span>
              </li>
              <ul>
                <li>Tag Setup</li>
                <li>How to Tag an Image</li>
              </ul>
              <li>
                <span>Search</span>
                <span>Icon</span>
              </li>
              <ul>
                <li>Quick Search</li>
                <li>Advanced Search</li>
              </ul>
            </ul>
          </div>
          <div className="pageContent">
            <div className="pageAboutAllusion">
              <h2>What is Allusion</h2>
              <p>
                Allusion is a tool designed to help artists organize their visual library. It is
                very common for creative people to use reference images throughout their projects.
              </p>
              <p>
                Finding such images has become relatively easy through the use of internet
                technology. Managing such images on the other hand, has remained a challenge.
                Clearly, it is not the amount of images that we can store, but a question of what we
                can effectively access, that matters. If only a handful of images were relevant to
                us, it would be easy to keep them in mind, but many artists are interested in
                creating their own curated library, and in such, it becomes increasingly difficult
                to remember where images were. Again, Allusion was created to help artists organize
                their visual library. To learn more about how Allusion works, please read on.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
});

export default HelpCenter;
