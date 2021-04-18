[![Build Status](https://travis-ci.com/allusion-app/Allusion.svg?token=a7yw4czL1Lye2zty617R&branch=master)](https://travis-ci.com/allusion-app/Allusion)

<img alt="Allusion" src="./resources/images/helpcenter/logo-about-helpcenter-dark.jpg" width="250" />

Allusion is a tool built for artists, aimed to help you organize your **Visual Library** – A single place that contains your entire collection of references, inspiration and any other kinds of images.

[Read more about Allusion →](https://allusion-app.github.io/)

## Installation
Find the latest version of Allusion on the [Releases](https://github.com/allusion-app/Allusion/releases) page.
The application can be automatically updated when a new version becomes available.

## Development

The project is mainly written in TypeScript and runs in Electron. We recommend using
[VSCode](https://code.visualstudio.com/) as an IDE with excellent TypeScript support.

### Building and running the application

You need to have [NodeJS](https://nodejs.org/en/download/) and a package manager such as [Yarn](https://yarnpkg.com/lang/en/docs/install/) installed.
Then run the following commands to get started:

1. Run `yarn install` to install or update all necessary dependencies.
2. Run `yarn dev` to build the project files to the `/build` directory. This will keep running to immediately build changed files when they are updated.
3. In a second terminal, run `yarn start` to start the application. Refresh the window (Ctrl/Cmd + R) after modifying a file to load the updated build files.

#### Releasing

An installable executable can be built using `yarn package` for your platform in the `/dist` folder. The building is performed using the [electron-builder](https://www.electron.build/) package, and is configured by a section in the `package.json` file.
Builds are automatically published to Github Releases when a tag is created in GitHub.

### Getting started

#### Overview

Electron launches the [main process](src/main.ts), which sets up a window and launches the [renderer process](<(src/renderer.tsx)>).
The renderer process is separated in a backend and frontend.

- The [backend](src/backend/Backend.ts) has access to the database, and provides functions for the frontend to interact with it (like endpoints in an API).
- The [frontend](src/frontend/App.tsx) fetches data from the backend based on the actions of the user, and stores this in the application state.

More detailed information can be found in the documentation of individual files and in the readme files of subfolders.

#### IDE Setup

Linting has been configured with ESLint so that the code style stays consistent (indenting, variable names, use of parentheses, etc.).
If you install it as an [extension in your IDE](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint), it'll warn you about problems and can automatically fix them in most cases.

#### Libraries and frameworks

| Name                                                                        | Function            | Description                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Electron](https://electronjs.org/docs/tutorial/quick-start)                | Application runtime | Makes it possible to run a website as a desktop application.                                                                                                                                                                                |
| [ReactJS](https://reactjs.org/docs/getting-started.html)                    | UI library          | Makes it painless to create interactive UIs. Design simple views for each state in your application, and React will efficiently update and render just the right components when your data changes.                                         |
| [MobX](https://mobx.js.org/getting-started.html)                            | State management    | This is where the application state is managed. Entities fetched from the backend are stored here, actions are used to update them and they are observable so that the UI can update accordingly.                                           |
| [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) | Database            | IndexedDB is built-in to browsers so this was the easiest to configure. A downside is that is only works in the renderer process of Electron. A strong alternative would be SQLite3.                                                        |

### Testing

Testing has been configured with [Jest](https://jestjs.io/).
The convention for unit test files is to add them to the same directory as the file you are testing as `[filename].test.ts`.
A short introduction to Jest with Typescript and React can be found [here](https://github.com/basarat/typescript-book/blob/master/docs/testing/jest.md). The [official docs](https://jestjs.io/docs/en/getting-started) include a more in-depth guide.

Tests can be run using `yarn test` or debugged in VSCode using the launch configs in `.vscode/launch.json`, which can run either all tests or just the test file that is open.
Jest also offers some useful options, such as running `yarn test Backend` which will only run the test files with `Backend` in their filename.

The codebase is currently not exhaustively covered by tests. They are therefore not required for contributions, though they are appreciated.

### Image Gallery
The layout of images in the gallery is computed in a module written in Rust, compiled to WebAssembly.
This provides fast performance and flexibility.
The layout is passed onto a virtualized renderer which only renders images visible in the viewport.

We make use of the image resolutions stored in the database to recompute the entire layout whenever the active list of images or the viewport dimensions change. Even for thousands of images, this can be performed in less than a millisecond.

### Styling

All styles are defined using [SASS](https://sass-lang.com/guide).
There are two locations where styles are defined:

1. The application style sheets `/resources/style`: for the layout of panels, global styles, color definitions, etc.
2. The component style sheets `/components/*/*.scss`: the appearance of buttons, flyouts,

For the application style sheets, there is a file per main panel (toolbar, outliner, content, inspector, etc.) and a couple of files for variable definitions and global styles. To ensure consistent colors are used across the entire application, all of the necessary colors are defined in the `colors.scss` file. These are then used in the `themes.scss` file for themes-specific colors (background, font, etc.).
The `global.scss` file contains the root element style, layout definitions and some misc styles like the handlebars.
