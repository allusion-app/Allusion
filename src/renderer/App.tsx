import Electron from 'electron';
import fse from 'fs-extra';
import path from 'path';
import React from "react";
import Gallery from 'react-grid-gallery';
import Sidebar from "react-sidebar";

import { AddTag, RemoveTag } from "./actions/TagActions";
import { IFile } from "./classes/File";
import { ITag } from "./classes/Tag";
import TagList, { ITagProps } from './components/TagList';
import DBRepository, { dbInit } from "./repositories/DBRepository";

// The props that we expect to be passed into the component
export interface IAppProps { }

// The state that is stored in this component
export interface IAppState {
  isSidebarOpen: boolean;
  isSidebarDocked: boolean;
  tags: ITagProps[];
  selectedTags: ITag[];
  files: IFile[]; // todo: choice: all files in memory vs only relevant files (to selected tags?)
  // tagHierarchy: ITagNod
}

// Todo: action context (undo/redo), tag context, file context?

const dbConfig = [
  {
    name: 'files',
    indices: [
      {
        name: 'tags',
        path: 'tags',
        opts: {
          unique: false,
          multiEntry: true,
        },
      },
      {
        name: 'path',
        path: 'path',
        opts: {
          unique: true,
        },
      },
    ],
  },
  {
    name: 'tags',
    indices: [],
  },
];

class App extends React.Component<IAppProps, IAppState> {
  public state: Readonly<IAppState> = {
    isSidebarOpen: false,
    isSidebarDocked: false,
    tags: [],
    selectedTags: [],
    files: [],
  };

  public fileRepository: DBRepository<IFile>;
  public tagRepository: DBRepository<ITag>;

  public async componentDidMount() {
    // Initialize database tables
    await dbInit(dbConfig);

    // Create repositories for easily creating/updating persistent entities
    this.fileRepository = new DBRepository("files");
    this.tagRepository = new DBRepository("tags");

    // Load entities from DB in the application state
    const tags = await this.tagRepository.getAll(); // TODO: Get only the N most recent files, load more when needed
    const tagCounts = await Promise.all(tags.map((t) => this.fileRepository.count('tags', t.id)));

    // Set the application state
    this.setState({
      tags: tags.map((t, i) => ({ tag: t, count: tagCounts[i] })),
      files: await this.fileRepository.getAll(),
    });
  }

  public setSidebarOpen = (open: boolean) => {
    this.setState({ isSidebarOpen: open });
  }
  public toggleSidebarOpen = () => {
    this.setState({ isSidebarOpen: !this.state.isSidebarOpen });
  }
  public toggleSidebarDocked = () => {
    this.setState({ isSidebarDocked: !this.state.isSidebarDocked });
  }

  public removeTag = async (tag: ITag) => {
    const action = new RemoveTag(this.tagRepository, tag);
    const newState = await action.execute(this.state);
    this.setState(newState);
  }
  public addTag = async (tag: string) => {
    const action = new AddTag(this.tagRepository, tag);
    const newState = await action.execute(this.state);
    this.setState(newState);
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

      // Add to database
      const imgFiles = await Promise.all(
        // TODO: Check if already exists, based on filename/path/size(?) to avoid duplicates
        imgFileNames.map((f) => (
          this.fileRepository.create({
            path: path.join(dir, f),
            tags: [],
            dateAdded: new Date(),
          })
        )),
      );

      // TODO: Update state through an Action, else it is not undoable
      this.setState(({ files }) => ({ files: [...files, ...imgFiles] }));
    });
  }

  public render() {
    const { isSidebarOpen, isSidebarDocked, tags, files } = this.state;

    console.log(this.state); // Print the state for debugging at every rerender

    // Show a list of all tags in the sidebar
    const sidebarContent = (
      <>
        <h2>Tags:</h2>

        <TagList
          tags={tags}
          onClickTag={(tag) => alert(`You clicked '${tag.name}`)}
          onRemoveTag={(tag) => this.removeTag(tag)}
        />
        <button onClick={() => this.addTag(`Tag ${tags.length + 1}`)}>
          Add tag
        </button>
      </>
    );

    return (
      <>
        <Sidebar
          sidebar={sidebarContent}
          open={isSidebarOpen}
          docked={isSidebarDocked}
          onSetOpen={this.setSidebarOpen}
          sidebarClassName="sidebar"
          contentClassName="content">
          <button onClick={this.toggleSidebarOpen} disabled={isSidebarDocked}>
            Toggle sidebar
          </button>
          <button onClick={this.toggleSidebarDocked}>
            Toggle dock sidebar
          </button>

          <br />
          <button onClick={this.chooseDirectory}>
            Add images to database
          </button>

          <Gallery
            images={files.map((f) => ({ src: f.path, thumbnail: f.path, thumbnailWidth: 256, thumbnailHeight: 256 }))}
          />
        </Sidebar>
      </>
    );
  }
}

export default App;
