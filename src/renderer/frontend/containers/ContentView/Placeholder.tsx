import React, { useContext } from 'react';
import StoreContext from '../../contexts/StoreContext';

import { IconSet, Button, ButtonGroup } from 'components';
import { observer } from 'mobx-react-lite';

const Placeholder = observer(() => {
  const { fileStore, uiStore, tagStore } = useContext(StoreContext);
  let icon;
  let title;
  let description;
  let action;

  console.log(fileStore.showsAllContent, tagStore.tagList.length);
  if (fileStore.showsAllContent && tagStore.tagList.length === 1) {
    // No tags exist, and no images added: Assuming it's a new user -> Show a welcome screen
    icon = IconSet.LOGO;
    title = 'Welcome to Allusion';
    description = (
      <>
        <p>
          Allusion is a tool designed to help you organize your Visual Library, so you can easily
          find what you need throughout your creative process.
        </p>
        <p>Allusion needs to know where to find your images. Click below to get started.</p>
      </>
    );
    action = (
      <Button text="Getting Started Guide" onClick={() => window.alert('TODO: Get started')} />
    );
  } else if (fileStore.showsAllContent) {
    icon = IconSet.MEDIA;
    title = 'No images';
    description = 'Images can be added from the outliner';
    action = <Button onClick={uiStore.toggleOutliner} text="Toggle outliner" styling="outlined" />;
  } else if (fileStore.showsQueryContent) {
    description = 'Try searching for something else.';
    icon = IconSet.SEARCH;
    title = 'No images found';
    action = (
      <ButtonGroup>
        <Button
          text="All images"
          icon={IconSet.MEDIA}
          onClick={fileStore.fetchAllFiles}
          styling="outlined"
        />
        <Button
          text="Untagged"
          icon={IconSet.TAG_BLANCO}
          onClick={fileStore.fetchUntaggedFiles}
          styling="outlined"
        />
      </ButtonGroup>
    );
  } else if (fileStore.showsUntaggedContent) {
    icon = IconSet.TAG;
    description = 'All images have been tagged. Nice work!';
    title = 'No untagged images';
    action = (
      <Button
        text="All Images"
        icon={IconSet.MEDIA}
        onClick={fileStore.fetchAllFiles}
        styling="outlined"
      />
    );
  } else if (fileStore.showsMissingContent) {
    icon = IconSet.WARNING_BROKEN_LINK;
    description = 'Try searching for something else.';
    title = 'No missing images';
    action = (
      <ButtonGroup>
        <Button
          text="All images"
          icon={IconSet.MEDIA}
          onClick={fileStore.fetchAllFiles}
          styling="outlined"
        />
        <Button
          text="Untagged"
          icon={IconSet.TAG_BLANCO}
          onClick={fileStore.fetchUntaggedFiles}
          styling="outlined"
        />
      </ButtonGroup>
    );
  }

  return (
    <div id="content-placeholder">
      <span className="custom-icon-128">{icon}</span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
});

export default Placeholder;
