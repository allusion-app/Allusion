[![Build Status](https://travis-ci.com/allusion-app/Allusion.svg?token=a7yw4czL1Lye2zty617R&branch=master)](https://travis-ci.com/allusion-app/Allusion)

# Visual Library

The project is currently set up with TypeScript, and is built with Webpack to bundle all files needed to run the application in the `/dist` directory.
[VSCode](https://code.visualstudio.com/) is a popular free IDE with excellent TypeScript support.

## Building and running the application

This requires you to have [NodeJS](https://nodejs.org/en/download/) and a package manager such as [Yarn](https://yarnpkg.com/lang/en/docs/install/) installed.
Then run the following commands to get started:

1. Run `yarn install` to install or update all necessary dependencies.
2. Run `yarn dev` to build the project files to the `/build` directory. This will keep running to immediately build changed files when they are updated.
3. In a second terminal, run `yarn start` to start the application. Refresh the window after modifying a file to load the updated build files.

### Releasing

An executable file can be generated with `yarn package` for your platform. These are put into the `/dist` directory into the respective platform folder.
Otherwise builds are published to Github Releases by creating a git tag prefixed with a `v`, e.g. `v1.0.0`.

## Getting started

### Overview

Electron launches the [main process](src/main/main.ts), which sets up a window and launches the [renderer process](<(src/renderer/renderer.tsx)>).
The renderer process is seprated in a backend and frontend.

- The [backend](src/renderer/backend/Backend.ts) has access to the database, and provides functions for the frontend to interact with it (like endpoints in an API).
- The [frontend](src/renderer/frontend/App.tsx) fetches data from the backend based on the actions of the user, and stores this in the application state.

More detailed information can be found in the documentation of individual files and in the readme files of subfolders.

### IDE Setup

Linting has been configured with TSLint so that the code style stays consistent (indenting, variable names, use of parentheses, etc).
If you install it as an [extension in your IDE](https://marketplace.visualstudio.com/items?itemName=eg2.tslint), it'll warn you about problems and can automatically fix them in most cases. This works pretty smoothly in VSCode, but probably also in other ones.

### Libraries and frameworks

| Name                                                                        | Function            | Description                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Electron](https://electronjs.org/docs/tutorial/quick-start)                | Application runtime | Makes it possible to run a website as a desktop application.                                                                                                                                                                                |
| [ReactJS](https://reactjs.org/docs/getting-started.html)                    | UI library          | Makes it painless to create interactive UIs. Design simple views for each state in your application, and React will efficiently update and render just the right components when your data changes.                                         |
| [MobX](https://mobx.js.org/getting-started.html)                            | State management    | This is where the application state is managed. Entities fetched from the backend are stored here, actions are used to update them and they are observable so that the UI can update accordingly.                                           |
| [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) | Database            | IndexedDB is built-in to browsers so this was the easiest to configure. A downside is that is only works in the renderer process of Electron. A strong alternative would be SQLite3.                                                        |
| [BlueprintJS](https://blueprintjs.com/docs/)                                | UI toolkit          | This provides us with some useful UI components, the docs do a good job of showing what it has to offer. Once we settle on an original design, we probably have to create our own. An alternative could be MaterialUI or (React) Bootstrap. |

## Testing

Testing has been configured with [Jest](https://jestjs.io/).
The convention for unit test files is to add them to the same directory as the file you are testing as `[filename].test.ts`.
A short introduction to Jest with Typescript and React can be found [here](https://github.com/basarat/typescript-book/blob/master/docs/testing/jest.md). The [official docs](https://jestjs.io/docs/en/getting-started) include a more in-depth guide.

Tests can be run using `yarn test` or debugged in VSCode using the launch configs in `.vscode/launch.json`, which can run either all tests or just the test file that is open.
Jest also offers some useful options, such as running `yarn test Backend` which will only run the test files with `Backend` in their filename.
