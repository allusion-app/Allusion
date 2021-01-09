import React, { useContext } from 'react';
import { observer } from 'mobx-react-lite';

import StoreContext from '../../contexts/StoreContext';
import FileTags from '../../components/FileTag';
import ImageInfo from '../../components/ImageInfo';

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
      <section>
        <header>
          <h2>Information</h2>
        </header>
        <ImageInfo file={first} />
      </section>
      <section>
        <header>
          <h2>Tags</h2>
        </header>
        <FileTags />
      </section>
    </Panel>
  );
});

export default Inspector;

const Panel = ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) => {
  return (
    <aside id="inspector" style={isOpen ? undefined : { width: '0' }}>
      {isOpen ? children : null}
    </aside>
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
