import React, { useState } from 'react';

import { TreeView } from 'components';
import { createBranchOnKeyDown, createLeafOnKeyDown } from 'components/TreeView';

export default {
  component: TreeView,
  title: 'TreeView',
  // Our exports that end in "Data" are not stories.
  excludeStories: /.*Data$/,
};

const isExpanded = (id: string, _nodeData: any, treeData: any): boolean => treeData.expansion[id];

const isSelected = (id: string, _nodeData: any, treeData: any): boolean => treeData.selection[id];

const toggleExpansion = (id: string, _nodeData: any, treeData: any) => {
  const { expansion, setExpansion } = treeData;
  setExpansion({ ...expansion, [id]: !expansion[id] });
};

const toggleSelection = (id: string, _nodeData: any, treeData: any) => {
  const { selection, setSelection } = treeData;
  setSelection({ ...selection, [id]: !selection[id] });
};

export const branchesData = [
  {
    id: '1',
    label: 'First',
    isSelected,
    isExpanded,
    nodeData: null,
    branches: [
      {
        id: '1.1',
        label: 'First First',
        isSelected,
        isExpanded,
        nodeData: null,
        branches: [
          {
            id: '1.1.1',
            label: 'First First First',
            isSelected,
            isExpanded,
            nodeData: null,
            branches: [],
            leaves: [],
          },
        ],
        leaves: [
          {
            id: '1.1.2',
            label: 'First First Second',
            isSelected,
            nodeData: null,
          },
        ],
      },
    ],
    leaves: [
      { id: '1.2', label: 'First Second', isSelected, nodeData: null },
      { id: '1.3', label: 'First Third', isSelected, nodeData: null },
      { id: '1.4', label: 'First Fourth', isSelected, nodeData: null },
    ],
  },
  {
    id: '2',
    label: 'Second',
    isSelected,
    isExpanded,
    nodeData: null,
    branches: [],
    leaves: [{ id: '2.1', label: 'Second First', isSelected, nodeData: null }],
  },
];

export const leavesData = [
  { id: '3', label: 'Third', isSelected, nodeData: null },
  { id: '4', label: 'Fourth', isSelected, nodeData: null },
  { id: '5', label: 'Fifth', isSelected, nodeData: null },
  { id: '6', label: 'Sixth', isSelected, nodeData: null },
];

const handleLeafOnKeyDown = (
  event: React.KeyboardEvent<HTMLLIElement>,
  id: string,
  nodeData: any,
  treeData: any,
) => createLeafOnKeyDown(event, id, nodeData, treeData, toggleSelection);

const handleBranchOnKeyDown = (
  event: React.KeyboardEvent<HTMLLIElement>,
  id: string,
  nodeData: any,
  treeData: any,
) => createBranchOnKeyDown(
  event,
  id,
  nodeData,
  treeData,
  isExpanded,
  toggleSelection,
  toggleExpansion,
);


export const Default = () => {
  const [expansion, setExpansion] = useState({});
  const [selection, setSelection] = useState({});

  return (
    <React.Fragment>
      <h1 id="tree">Tree View Widget</h1>
      <TreeView
        multiSelect
        labelledBy="tree"
        branches={branchesData}
        leaves={leavesData}
        toggleExpansion={toggleExpansion}
        onBranchKeyDown={handleBranchOnKeyDown}
        onLeafKeyDown={handleLeafOnKeyDown}
        treeData={{
          expansion,
          setExpansion,
          selection,
          setSelection,
        }}
      />
    </React.Fragment>
  );
};
