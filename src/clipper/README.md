# Allusion Web Clipper
This directory contains the source code of our [Chrome browser extension](https://chrome.google.com/webstore/detail/allusion-web-clipper/gjceheijjnmdfcolopodbopfoaicobna)

It allows you to right-click on any images to download it to a Location on your disk that is being watched by Allusion.
You can immediately apply tags to the most recently downloaded image as well.

## Publishing
Create a zip of all files in this directory, excluding `server.ts` and this `README.md` file.
This can then be uploaded to the [Chrome dev console](https://chrome.google.com/webstore/devconsole)

## How it works
In `server.ts` we host a simple HTTP server, at port `5454`. The browser extension can communicate with Allusion through that port, if the browser extension support option is enabled.

When an image is sent from the browser extension to the local server, it will automatically be imported into Allusion, since the download directory must be inside one of the watched Locations (enforced in the settings panel).
Then, when tags are applied, those can be automatically saved to that image entry in the database by sending a message to the renderer process.

When Allusion's window is closed, we cannot access the Database (IndexedDB only works in a browser window). Any tags applied to an image through the browser extension will be put in a queue (saved to a text file on disk), which will be stored in the database whenever the browser window is opened again.

## Ideas/inspiration
- Download screenshot region as image
- Integrations for specific websites (ArtStation, Instagram, Pinterest, Twitter, etc.). Could automatically extract metadata as tags
