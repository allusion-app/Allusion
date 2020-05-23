import React from 'react';

import { TreeView } from '../components';

export default {
  component: TreeView,
  title: 'TreeView',
  // Our exports that end in "Data" are not stories.
  excludeStories: /.*Data$/
};

export const branchesData = [
  {
    id: '1',
    label: 'First',
    branches: [
      {
        id: '1.1',
        label: 'First First',
        branches: [
          {
            id: '1.1.1',
            label: 'First First First',
            branches: new Array(),
            leaves: new Array()
          }
        ],
        leaves: [
          {
            id: '1.1.2',
            label: 'First First Second',
            branches: new Array(),
            leaves: new Array()
          }
        ]
      }
    ],
    leaves: [
      { id: '1.2', label: 'First Second' },
      { id: '1.3', label: 'First Third' },
      { id: '1.4', label: 'First Fourth' }
    ]
  },
  {
    id: '2',
    label: 'Second',
    branches: new Array(),
    leaves: [{ id: '2.1', label: 'Second First' }]
  }
];

export const leavesData = [
  { id: '3', label: 'Third' },
  { id: '4', label: 'Fourth' },
  { id: '5', label: 'Fifth' },
  { id: '6', label: 'Sixth' }
];

export const Default = () => (
  <React.Fragment>
    <h1 id="tree" onFocus={() => console.log('LABEL FOCUS')}>
      Tree View Widget
    </h1>
    <TreeView labelledBy="tree" branches={branchesData} leaves={leavesData} />
  </React.Fragment>
);
