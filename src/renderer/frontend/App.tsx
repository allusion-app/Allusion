import Electron from 'electron';
import { inject } from 'mobx-react';
import path from 'path';
import React from "react";
import FileList from './components/FileList';
import TagList from './components/TagList';
import RootStore from './stores/RootStore';

// The props that we expect to be passed into the component
export interface IAppProps {
  rootStore?: RootStore;
}

// The state that is stored in this component
export interface IAppState { }

@inject('rootStore')
class App extends React.Component<IAppProps, IAppState> {
  public state: Readonly<IAppState> = {};

  init() {
    // Start fetching data once the backend has been loaded
    this.props.rootStore.tagStore.init();
  }

  public render() {
    return (
      <>
        <TagList />
        <FileList />
      </>
    );
  }
}

export default App;
