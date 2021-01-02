import React, { useContext } from 'react';
import { observer } from 'mobx-react-lite';

import StoreContext from '../../contexts/StoreContext';

const Placeholder = observer(() => {
  const { fileStore, tagStore, uiStore } = useContext(StoreContext);

  if (fileStore.showsAllContent && tagStore.tagList.length === 1) {
    // No tags exist, and no images added: Assuming it's a new user -> Show a welcome screen
    return <Welcome />;
  } else if (fileStore.showsAllContent) {
    return <NoContentFound uiStore={uiStore} />;
  } else if (fileStore.showsQueryContent) {
    return <NoQueryContent fileStore={fileStore} />;
  } else if (fileStore.showsUntaggedContent) {
    return <NoUntaggedContent fileStore={fileStore} />;
  } else if (fileStore.showsMissingContent) {
    return <NoMissingContent fileStore={fileStore} />;
  } else {
    return <BugReport />;
  }
});

export default Placeholder;

import FileStore from '../../stores/FileStore';
import UiStore from '../../stores/UiStore';

import { IconSet, Button, ButtonGroup } from 'widgets';

const Welcome = () => {
  return (
    <ContentPlaceholder title="Welcome to Allusion" icon={IconSet.LOGO}>
      <p>
        Allusion is a tool designed to help you organize your Visual Library, so you can easily find
        what you need throughout your creative process.
      </p>
      <p>Allusion needs to know where to find your images. Click below to get started.</p>
      <Button text="Getting Started Guide" onClick={() => window.alert('TODO: Get started')} />
    </ContentPlaceholder>
  );
};

const NoContentFound = ({ uiStore }: { uiStore: UiStore }) => {
  return (
    <ContentPlaceholder title="No images" icon={IconSet.MEDIA}>
      <p>Images can be added from the outliner</p>
      <Button onClick={uiStore.toggleOutliner} text="Toggle outliner" styling="outlined" />
    </ContentPlaceholder>
  );
};

const NoQueryContent = ({ fileStore }: { fileStore: FileStore }) => {
  return (
    <ContentPlaceholder title="No images found" icon={IconSet.SEARCH}>
      <p>Try searching for something else.</p>
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
    </ContentPlaceholder>
  );
};

const NoUntaggedContent = ({ fileStore }: { fileStore: FileStore }) => {
  return (
    <ContentPlaceholder title="No untagged images" icon={IconSet.TAG}>
      <p>All images have been tagged. Nice work!</p>
      <Button
        text="All Images"
        icon={IconSet.MEDIA}
        onClick={fileStore.fetchAllFiles}
        styling="outlined"
      />
    </ContentPlaceholder>
  );
};

const NoMissingContent = ({ fileStore }: { fileStore: FileStore }) => {
  return (
    <ContentPlaceholder title="No missing images" icon={IconSet.WARNING_BROKEN_LINK}>
      <p>Try searching for something else.</p>
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
    </ContentPlaceholder>
  );
};

const BugReport = () => {
  return (
    <ContentPlaceholder title="You encountered a bug!" icon={IconSet.WARNING_FILL}>
      <p>Please report this bug to the maintainers!</p>
    </ContentPlaceholder>
  );
};

interface IContentPlaceholder {
  icon: JSX.Element;
  title: string;
  children: React.ReactNode | React.ReactNodeArray;
}

const ContentPlaceholder = (props: IContentPlaceholder) => {
  return (
    <div id="content-placeholder">
      <span className="custom-icon-128">{props.icon}</span>
      <h2>{props.title}</h2>
      {props.children}
    </div>
  );
};
