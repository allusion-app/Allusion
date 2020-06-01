import React, { useState } from 'react';

import { TreeView } from 'components';
import { createBranchOnKeyDown, createLeafOnKeyDown } from 'components/TreeView';

export default {
  component: TreeView,
  title: 'TreeView',
  // Our exports that end in "Data" are not stories.
  excludeStories: /.*Data$/,
};

const isExpanded = (nodeData: string, treeData: any): boolean => treeData.expansion[nodeData];

const isSelected = (nodeData: string, treeData: any): boolean => treeData.selection[nodeData];

const toggleExpansion = (nodeData: string, treeData: any) => {
  const { expansion, setExpansion } = treeData;
  console.log(nodeData, treeData);
  setExpansion({ ...expansion, [nodeData]: !expansion[nodeData] });
};

const toggleSelection = (nodeData: string, treeData: any) => {
  const { selection, setSelection } = treeData;
  console.log(nodeData, treeData);
  setSelection({ ...selection, [nodeData]: !selection[nodeData] ?? false });
};

export const branchesData = [
  {
    id: '1',
    label: 'First',
    isSelected,
    isExpanded,
    nodeData: '1',
    branches: [
      {
        id: '1.1',
        label: 'First First',
        isSelected,
        isExpanded,
        nodeData: '1.1',
        branches: [
          {
            id: '1.1.1',
            label: 'First First First',
            isSelected,
            isExpanded,
            nodeData: '1.1.1',
            branches: [],
            leaves: [],
          },
        ],
        leaves: [
          {
            id: '1.1.2',
            label: 'First First Second',
            isSelected,
            nodeData: '1.1.2',
          },
        ],
      },
    ],
    leaves: [
      { id: '1.2', label: 'First Second', isSelected, nodeData: '1.2' },
      { id: '1.3', label: 'First Third', isSelected, nodeData: '1.3' },
      { id: '1.4', label: 'First Fourth', isSelected, nodeData: '1.4' },
    ],
  },
  {
    id: '2',
    label: 'Second',
    isSelected,
    isExpanded,
    nodeData: '2',
    branches: [],
    leaves: [{ id: '2.1', label: 'Second First', isSelected, nodeData: '2.1' }],
  },
];

export const leavesData = [
  { id: '3', label: 'Third', isSelected, nodeData: '3' },
  { id: '4', label: 'Fourth', isSelected, nodeData: '4' },
  { id: '5', label: 'Fifth', isSelected, nodeData: '5' },
  { id: '6', label: 'Sixth', isSelected, nodeData: '6' },
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
