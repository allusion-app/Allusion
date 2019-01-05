# Visual Library

The project is currently set up with TypeScript, and is built with Webpack to bundle all files needed to run the application in the `/dist` directory.
VSCode is a popular free IDE with excellent TypeScript support.

## Building and running the application
This requires you to have [NodeJS](https://nodejs.org/en/download/) and a package manager such as [Yarn](https://yarnpkg.com/lang/en/docs/install/) installed.
Then run the following commands to get started:
1. Run `yarn install` to install all necessary dependencies.
2. Run `yarn run development` to build the project files to the `/dist` directory. This will keep running to immediately build changed files when they are updated.
3. In a second terminal, run `yarn start` to start the application. Refresh the window after modifying a file to load the updated build files.

## Releasing
An executable file can be generated with `yarn package` for your platform, or `yarn package --all` for all platforms. 
These are put into the `/release` directory.
