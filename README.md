[![Build Status](https://travis-ci.com/allusion-app/Allusion.svg?token=a7yw4czL1Lye2zty617R&branch=master)](https://travis-ci.com/allusion-app/Allusion)

<!-- TODO: Put these on the website, not really suited for GitHub
temporary list: Things we should note somewhere:
- It's free! And open source! 
- We are open to contributions, but please get in touch first: See [here](TODO:contributing.md)
- Cross-platform: Windows, MacOS and Linux
- Features a modern, clean and slick design
- Designed to be part of your creative process, for use in combination with other tools
- What Allusion is NOT: 
 - related software: PureRef, TagSpaces, AdobeBridge, Elyse. Comparison? -->

# Allusion

Allusion is a free desktop program, designed for organizing your [visual library](#visual-library).

It has been designed for artists who gather reference images, and struggle to organize them in a structured manner. 

AD: *Do you still manage your image references using FOLDERS? Try out Allusion! Easily organize your reference material in a structured manner.*

## Installation
Find the latest version of Allusion on the [Releases](releases) page.
The application can be automatically updated when a new version becomes available.

## Workflow
### Organizing
1. Pick one or more directories where you store the images that you want to be part of your visual library. We call these directories your **Locations**
2. Create an **hierarchical list of tags**
3. **Assign tags** to your images

### Browsing
- View all images in a single centralized view
- Browse through your images in several viewing modes
- Find specific images by **searching** for tags, filenames, dates, and more

## Tag hierarchy guidelines
- Your personal tag hierarchy is for you to discover
- We can share what works for us. [here](TODO) you can find a set of templates

## Import and export:
Allusion is designed to be part of your creative process. Therefore, we have added support for several ways to gather new images and their metadata, and easy exporting to other tools.

- Added and removed images in your Locations are automatically detected
- Drop images from other places (such as your browser) into Allusion to store them in one of your Locations
<!-- - Add the Allusion Web Clipper browser extension to your browser for easily saving images directly into Allusion -->
- Export a selection of images by dragging them from Allusion into other software

- Export Allusion's tags into the metadata of your image files, so Allusion is interoperable with other tagging software such as Adobe Bridge.
 This also means you can store images in a shared folder, such as DropBox or Google Drive, and access your visual library from other devices.





## About
### Visual Library

> A "visual library" would be a collection of photos, painting, graphics, patterns, artwork and colors that could be kept in your head, in print, or digitally.
>
> You can work on it by viewing and studying as many photos, graphics, patterns, artwork and colors as you are able. And I mean, really study them.
>
> It is important to have a strong visual library so you can know what parts to steal and what to avoid. So you can recognize what makes something "good" versus "bad", and to develop your own sense of taste.
>
> I think it is necessary to developing a sense of who you are as an artist and who you want to be.
> 
> &mdash; Dave Nelson, on the [Graphic Design StackExchange](https://graphicdesign.stackexchange.com/questions/16405/what-is-a-visual-library-and-how-to-work-on-it)

More resources:
- [What is an Artist’s Visual Library? [ConceptArtEmpire.com]](https://conceptartempire.com/artistic-visual-library/)
- [Design Cinema – EP 52 - Visual Library [YouTube.com/FZDSCHOOL]](https://www.youtube.com/watch?v=dnflBERf2zM)


## Development

The project is written in TypeScript and runs in Electron. 
[VSCode](https://code.visualstudio.com/) is a popular free IDE with excellent TypeScript support.

### Building and running the application

This requires you to have [NodeJS](https://nodejs.org/en/download/) and a package manager such as [Yarn](https://yarnpkg.com/lang/en/docs/install/) installed.
Then run the following commands to get started:

1. Run `yarn install` to install or update all necessary dependencies.
2. Run `yarn dev` to build the project files to the `/build` directory. This will keep running to immediately build changed files when they are updated.
3. In a second terminal, run `yarn start` to start the application. Refresh the window after modifying a file to load the updated build files.

#### Releasing

An installable executable can be built using `yarn package` for your platform in the `/dist` folder. The building is performed using the ElectronBuilder package, and is configured by a section in the `package.json` file.
Builds are automatically published to Github Releases when a tag is created in GitHub.

### Getting started

#### Overview

Electron launches the [main process](src/main.ts), which sets up a window and launches the [renderer process](<(src/renderer.tsx)>).
The renderer process is seprated in a backend and frontend.

- The [backend](src/backend/Backend.ts) has access to the database, and provides functions for the frontend to interact with it (like endpoints in an API).
- The [frontend](src/frontend/App.tsx) fetches data from the backend based on the actions of the user, and stores this in the application state.

More detailed information can be found in the documentation of individual files and in the readme files of subfolders.

#### IDE Setup

Linting has been configured with ESLint so that the code style stays consistent (indenting, variable names, use of parentheses, etc.).
If you install it as an [extension in your IDE](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint), it'll warn you about problems and can automatically fix them in most cases. This works pretty smoothly in VSCode, but probably also in other ones.

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

### Gallery layout
The gallery layout is computed in a module written in Rust, compiled to WebAssembly.
This provides fast performance and flexibility.
Masonry layouts are typically a bad fit in websites. 
The layout is passed onto a virtualized renderer which only renders images visible in the viewport.

We make use of the image resolutions stored in the database to recompute the entire layout whenever the active list of images or the viewport dimensions change. Even for thousands of images, this can be performed in 
For a long time we were using out-of-the-box solutions, such as `react-window`, which feel a bit sluggish. We felt we could do better, since contrary to a website , we have access to a database with all image dimensions ready for use.
Even for thousands of images, the 
We are especially glad with the vertical masonry layout, which runs quite well without any specific optimizations.
It is rarely found in other applications, likely because it's hard to predict the 

<!-- TODO: Would be a nice blog post -->

### Styling

All styles are defined using [SASS](https://sass-lang.com/guide).
There are two locations where styles are defined:

1. The application style sheets `/resources/style`: for the layout of panels, global styles, color definitions, etc.
2. The component style sheets `/components/*/*.scss`: the appearance of buttons, flyouts,

For the application style sheets, there is a file per main panel (toolbar, outliner, content, inspector, etc.) and a couple of files for variable definitions and global styles. To ensure consistent colors are used across the entire application, all of the necessary colors are defined in the `colors.scss` file. These are then used in the `themes.scss` file for themes-specific colors (background, font, etc.).
The `global.scss` file contains the root element style, layout definitions and some misc styles like the handlebars.
