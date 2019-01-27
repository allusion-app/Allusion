// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

import React from 'react';
import ReactDOM from 'react-dom';

// Import the styles here to let Webpack know to include them
// in the HTML file
import './style.css';

import backend from './backend/Backend';
import App from './frontend/App';

// Keep a reference of the App so that it can be notified when the backend has been initialized
const appRef = React.createRef<App>();

// Initialize the backend for the App, that serves as an API to the front-end
backend.init().then(async () => {
  await appRef.current.init();
});

// Render our react components in the div with id 'app' in the html file
ReactDOM.render(<App ref={appRef} />, document.getElementById('app'));
