// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

import { Provider } from 'mobx-react';
import React from 'react';
import ReactDOM from 'react-dom';

// Import the styles here to let Webpack know to include them
// in the HTML file
import './style.css';

import Backend from './backend/Backend';
import App from './frontend/App';
import RootStore from './frontend/stores/RootStore';

// Keep a reference of the App so that it can be notified when the backend has been initialized
const appRef = React.createRef<any>();

// Initialize the backend for the App, that serves as an API to the front-end
const backend = new Backend();
backend.init().then(async () => {
  console.log('Backend has been initialized!');
  appRef.current.wrappedInstance.init();
});

// Render our react components in the div with id 'app' in the html file
// The Provider component provides the state management for the application
ReactDOM.render(
  <Provider rootStore={new RootStore(backend)}>
    <App ref={appRef} />
  </Provider>,
document.getElementById('app'));
