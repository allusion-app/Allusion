import Electron from 'electron';
import fse from 'fs-extra';
import path from 'path';
import React from "react";

// The props that we expect to be passed into the component
export interface IAppProps { }

// The state that is stored in this component
export interface IAppState { }


class App extends React.Component<IAppProps, IAppState> {
  public state: Readonly<IAppState> = {};
  public init = async () => {
    // Start fetching data once the backend has been loaded
  }
  public chooseDirectory = async () => {
    const dirs = Electron.remote.dialog.showOpenDialog({
      properties: ['openDirectory', 'multiSelections'],
    });

    if (!dirs) {
      return;
    }
    dirs.forEach(async (dir) => {
      // Check if directory
      // const stats = await fse.lstat(dirs[0]);
      const imgExtensions = ['gif', 'png', 'jpg', 'jpeg'];

      const filenames = await fse.readdir(dir);
      const imgFileNames = filenames.filter((f) => imgExtensions.some((ext) => f.toLowerCase().endsWith(ext)));

      console.log(imgFileNames);
    });
  }

  public render() {
    return (
      <>
        <button onClick={this.chooseDirectory}>
          Add images to your Visual Library
        </button>
      </>
    );
  }
}

export default App;
