import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import LOGO_FC from 'resources/logo/svg/full-color/allusion-logomark-fc.svg';
import { IS_PREVIEW_WINDOW } from 'common/window';

import { useStore } from '../../contexts/StoreContext';

const Placeholder = observer(() => {
  const { fileStore, tagStore } = useStore();

  if (IS_PREVIEW_WINDOW) {
    return <PreviewWindowPlaceholder />;
  }
  if (fileStore.showsAllContent && tagStore.isEmpty) {
    // No tags exist, and no images added: Assuming it's a new user -> Show a welcome screen
    return <Welcome />;
  } else if (fileStore.showsAllContent) {
    return <NoContentFound />;
  } else if (fileStore.showsQueryContent) {
    return <NoQueryContent />;
  } else if (fileStore.showsUntaggedContent) {
    return <NoUntaggedContent />;
  } else if (fileStore.showsMissingContent) {
    return <NoMissingContent />;
  } else {
    return <BugReport />;
  }
});

export default Placeholder;

import { IconSet, Button, ButtonGroup, SVG } from 'widgets';
import { RendererMessenger } from 'src/ipc/RenderMessenger';
import useMountState from 'src/frontend/hooks/useMountState';

const PreviewWindowPlaceholder = observer(() => {
  const { fileStore } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [, isMounted] = useMountState();
  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }, 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileStore.fileListLastModified]);

  if (isLoading) {
    return (
      <ContentPlaceholder title="Loading..." icon={<SVG src={LOGO_FC} />}>
        {IconSet.LOADING}
      </ContentPlaceholder>
    );
  }

  // There should always be images to preview.
  // If the placeholder is shown, something went wrong (probably the DB of the preview window is out of sync with the main window)
  return (
    <ContentPlaceholder title="That's not supposed to happen..." icon={<SVG src={LOGO_FC} />}>
      <p>Something went wrong while previewing the selected images</p>

      <div className="divider" />

      <Button
        styling="outlined"
        text="Reload Allusion"
        onClick={() => RendererMessenger.reload()}
      />
    </ContentPlaceholder>
  );
});

const Welcome = () => {
  const { uiStore } = useStore();
  return (
    <ContentPlaceholder title="Welcome to Allusion" icon={<SVG src={LOGO_FC} />}>
      <p>
        Allusion is a tool designed to help you organize your Visual Library, so you can easily find
        what you need throughout your creative process.
      </p>
      <p>
        Allusion needs to know where to find your images.
        <br />
        Add a Location to get started.
      </p>

      <div className="divider" />

      <p>New to Allusion?</p>
      <Button styling="outlined" text="Open Help Center" onClick={uiStore.toggleHelpCenter} />

      <br />
      <br />
      <br />

      {/* Mention principles (?) */}
      <small>Allusion is a read-only application. We&rsquo;ll never touch your files</small>
    </ContentPlaceholder>
  );
};

const NoContentFound = () => {
  const { uiStore } = useStore();
  return (
    <ContentPlaceholder title="No images" icon={IconSet.MEDIA}>
      <p>Images can be added from the outliner</p>
      <Button onClick={uiStore.toggleOutliner} text="Toggle outliner" styling="outlined" />
    </ContentPlaceholder>
  );
};

const NoQueryContent = () => {
  const { fileStore } = useStore();
  return (
    <ContentPlaceholder title="No images found" icon={IconSet.SEARCH}>
      <p>Try searching for something else.</p>
      {/* TODO: when search includes a Hidden tag, remind the user that's what might be causing them to see no results */}
      <ButtonGroup align="center">
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

const NoUntaggedContent = () => {
  const { fileStore } = useStore();
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

const NoMissingContent = () => {
  const { fileStore } = useStore();
  return (
    <ContentPlaceholder title="No missing images" icon={IconSet.WARNING_BROKEN_LINK}>
      <p>Try searching for something else.</p>
      <ButtonGroup align="center">
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
      <h2 className="dialog-title">{props.title}</h2>
      {props.children}
    </div>
  );
};
