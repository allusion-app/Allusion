import React, { useContext } from 'react';
import { observer } from 'mobx-react-lite';

import StoreContext from '../../contexts/StoreContext';
import FileTags from '../../components/FileTag';
import ImageInfo from '../../components/ImageInfo';
import { MissingImageFallback } from '../ContentView/GalleryItem';
import Carousel from './Carousel';

const Inspector = observer(() => {
  const { uiStore } = useContext(StoreContext);
  const first = uiStore.firstSelectedFile;

  if (first === undefined) {
    return (
      <Panel isOpen={uiStore.isInspectorOpen}>
        <Placeholder />
      </Panel>
    );
  }

  return (
    <Panel isOpen={uiStore.isInspectorOpen}>
      {uiStore.fileSelection.size === 1 ? (
        <Content
          preview={
            first.isBroken ? (
              <MissingImageFallback />
            ) : (
              <img
                src={first.absolutePath}
                style={{ cursor: uiStore.isSlideMode ? undefined : 'zoom-in' }}
                onClick={uiStore.enableSlideMode}
              />
            )
          }
          information={<ImageInfo file={first} />}
        />
      ) : (
        <Content
          preview={<Carousel uiStore={uiStore} />}
          information={`Selected ${uiStore.fileSelection.size} files`}
        />
      )}
    </Panel>
  );
});

export default Inspector;

interface IContent {
  preview: React.ReactNode;
  information: React.ReactNode;
}

const Content = ({ preview, information }: IContent) => {
  return (
    <>
      <div className="inspector-preview">{preview}</div>
      <section>
        <header>
          <h2>Information</h2>
        </header>
        {information}
      </section>
      <section>
        <header>
          <h2>Tags</h2>
        </header>
        <FileTags />
      </section>
    </>
  );
};

const Placeholder = () => {
  return (
    <section>
      <header>
        <h2>No image selected</h2>
      </header>
    </section>
  );
};

const Panel = ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) => {
  return (
    <aside id="inspector" style={isOpen ? undefined : { width: '0' }}>
      {isOpen ? children : null}
    </aside>
  );
};
