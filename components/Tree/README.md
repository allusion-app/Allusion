# Tree

## Properties

WIP

## Features

Many navigation and accessibility features are provided out of the box.

- Uses the WAI-ARIA roles, states and properties for trees (**TODO**: Implement test.)
- Focusable nodes
- Keyboard Navigation:
  - #### Right arrow:
    - When focus is on a closed node, opens the node; focus does not move.
    - When focus is on a open node, moves focus to the first child node.
    - When focus is on an end node, does nothing.
  - #### Left arrow:
    - When focus is on an open node, closes the node.
    - When focus is on a child node that is also either an end node or a closed node, moves focus to its parent node.
    - When focus is on a root node that is also either an end node or a closed node, does nothing.
  - #### Up Arrow
    - Moves focus to the previous node that is focusable without opening or closing a node.
  - #### Down Arrow
    - Moves focus to the next node that is focusable without opening or closing a node.
  - #### Home
    - Moves focus to first node without opening or closing a node.
  - #### End
    - Moves focus to the last node that can be focused without expanding any nodes that are closed.
  - #### Enter
    - Default action for node.
  - #### Space
    - Toggles the selection state of the focused node.
  - #### Shift + Up Arrow
    - Toggles selection and moves focus to the previous node that is focusable without opening or closing a node.
  - #### Shift + Down Arrow
    - Toggles selection and moves focus to the next node that is focusable without opening or closing a node.

## Terminology

There are several terms that convey the same idea. This small overview explains the used terms for a better understanding.

- **node**: A node is any tree item in the tree. They can have other nodes as children/ancestors.
- **branch**: A branch is a node that is expandable/collapsable and can have any number of children or none. A child can be either a branch or a leaf.
- **leaf**: A leaf is also called an end node because it cannot have any children and is therefore never expandable/collapsable.
- **ancestor**: An ancestor is a node that comes before a node which means a path can be formed from ancestor to current node. Every node has only one direct ancestor, called parent except for the root.
- **descendant**: A descendant is a any child node and its children and so on of a branch.
- **root**: The root node is the only node that has no parent but has any number of children like a branch. It defines the tree in its entirety.
- **parent**: The first and direct ancestor of a node.
- **level**: The number of edges between a node and the root plus 1.
- **sub-tree**: A sub-tree is just a branch that is not the root. All descending nodes form a tree.

## Roadmap

### Open Questions and Missing Features

- [ ] Type ahead (optional)

### Test Suite

While working on the initial prototype, there were many subtle bugs. The behaviour of a tree is very well defined in the best practices of WAI-ARIA which should it make it easy to write tests for.

#### Tests

- [ ] keyboard navigation
