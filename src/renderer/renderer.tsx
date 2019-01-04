// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

import React from 'react';
import ReactDOM from 'react-dom';

// Import the styles here to let Webpack know to include them
// in the HTML file
import './style.css';

// Import the main App component
import App from './App';

// Render our react components in the div with id 'app' in the html file
ReactDOM.render(<App />, document.getElementById('app'));
