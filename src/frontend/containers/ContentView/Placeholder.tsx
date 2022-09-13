import React, { useEffect, useState } from 'react';
import { flow } from 'mobx';
import { observer } from 'mobx-react-lite';
import LOGO_FC from 'resources/logo/svg/full-color/allusion-logomark-fc.svg';
import { sleep } from 'common/timeout';
import { IS_PREVIEW_WINDOW } from 'common/window';
import { useStore } from '../../contexts/StoreContext';
import { IconSet, Button, ButtonGroup, SVG } from 'widgets';
import { RendererMessenger } from 'src/ipc/renderer';

const Placeholder = observer(() => {
  const rootStore = useStore();

  if (IS_PREVIEW_WINDOW) {
    return <PreviewWindowPlaceholder />;
  }
  if (rootStore.locationStore.locationList.length === 0 && rootStore.tagStore.isEmpty) {
    // No tags exist, and no images added: Assuming it's a new user, show a welcome screen.
    return <Welcome />;
  } else if (rootStore.showsAllContent) {
    return <NoContentFound />;
  } else if (rootStore.showsQueryContent) {
    return <NoQueryContent />;
  } else if (rootStore.showsUntaggedContent) {
    return <NoUntaggedContent />;
  } else if (rootStore.showsMissingContent) {
    return <NoMissingContent />;
  } else {
    return <BugReport />;
  }
});

export default Placeholder;

const PreviewWindowPlaceholder = () => {
  const [placeholder, setPlaceholder] = useState<JSX.Element | null>(null);

  useEffect(() => {
    const timeout = flow(function* () {
      setPlaceholder(
        <ContentPlaceholder title="Loading..." icon={<SVG src={LOGO_FC} />}>
          {IconSet.LOADING}
        </ContentPlaceholder>,
      );

      yield sleep(10000);

      // There should always be images to preview.
      // If the placeholder is shown, something went wrong (probably the DB of the preview window is out of sync with the main window)
      setPlaceholder(
        <ContentPlaceholder title="That's not supposed to happen..." icon={<SVG src={LOGO_FC} />}>
          <p>Something went wrong while previewing the selected images</p>

          <div className="divider" />

          <Button
            styling="outlined"
            text="Reload Allusion"
            onClick={() => RendererMessenger.reload()}
          />
        </ContentPlaceholder>,
      );
    })();

    return () => {
      timeout.catch(() => {});
      timeout.cancel();
    };
  }, []);

  return placeholder;
};

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
  const rootStore = useStore();
  return (
    <ContentPlaceholder title="No images found" icon={IconSet.SEARCH}>
      <p>Try searching for something else.</p>
      {/* TODO: when search includes a Hidden tag, remind the user that's what might be causing them to see no results */}
      <ButtonGroup align="center">
        <Button
          text="All images"
          icon={IconSet.MEDIA}
          onClick={rootStore.showAllFiles}
          styling="outlined"
        />
        <Button
          text="Untagged"
          icon={IconSet.TAG_BLANCO}
          onClick={rootStore.showUntaggedFiles}
          styling="outlined"
        />
      </ButtonGroup>
    </ContentPlaceholder>
  );
};

const NoUntaggedContent = () => {
  const rootStore = useStore();
  return (
    <ContentPlaceholder title="No untagged images" icon={IconSet.TAG}>
      <p>All images have been tagged. Nice work!</p>
      <Button
        text="All Images"
        icon={IconSet.MEDIA}
        onClick={rootStore.showAllFiles}
        styling="outlined"
      />
    </ContentPlaceholder>
  );
};

const NoMissingContent = () => {
  const rootStore = useStore();
  return (
    <ContentPlaceholder title="No missing images" icon={IconSet.WARNING_BROKEN_LINK}>
      <p>Try searching for something else.</p>
      <ButtonGroup align="center">
        <Button
          text="All images"
          icon={IconSet.MEDIA}
          onClick={rootStore.showAllFiles}
          styling="outlined"
        />
        <Button
          text="Untagged"
          icon={IconSet.TAG_BLANCO}
          onClick={rootStore.showUntaggedFiles}
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
  children: React.ReactNode | React.ReactNode[];
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
