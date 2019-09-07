import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { useDrop } from 'react-dnd';
import { ID } from '../../../../entities/ID';
import {
  ITreeNode,
  MenuItem,
  Menu,
  Divider,
  ControlGroup,
  InputGroup,
  Button,
  H4,
} from '@blueprintjs/core';
import { IRootStoreProp } from '../../../contexts/StoreContext';
import { ClientTagCollection, ROOT_TAG_COLLECTION_ID } from '../../../../entities/TagCollection';
import { formatTagCountText } from '../../../utils';
import IconSet from '../../../components/Icons';
import { computed } from 'mobx';
import { observer } from 'mobx-react-lite';
import {
  TreeBranch,
  TreeLeaf,
  INodeData,
  TreeList,
  IExpandState,
  IDragAndDropItem,
} from '../../../components/TreeList';
import { ClientTag } from '../../../../entities/Tag';
import { DragAndDropType } from '.';
import { TagRemoval } from './MessageBox';

const DEFAULT_TAG_NAME = 'New Tag';
const DEFAULT_COLLECTION_NAME = 'New Collection';

interface ITagCollectionItemProps {
  col: ClientTagCollection;
  isEditing: boolean;
  setEditing: (val: boolean) => void;
}

const TagCollectionItem = ({ col, isEditing, setEditing }: ITagCollectionItemProps) => {
  return isEditing ? (
    <TreeListItemEditor
      initialName={col.name}
      onRename={(name) => {
        col.name = name;
        setEditing(false);
      }}
      onAbort={() => setEditing(false)}
    />
  ) : (
    <>
      {col.name}
      {col.isEmpty && <i style={{ color: '#007af5 !important' }}> (empty)</i>}
    </>
  );
};

interface ITagItemProps {
  tag: ClientTag;
  isEditing: boolean;
  setEditing: (val: boolean) => void;
}

const TagItem = ({ tag, isEditing, setEditing }: ITagItemProps) => {
  return isEditing ? (
    <TreeListItemEditor
      initialName={tag.name}
      onRename={(name) => {
        tag.name = name;
        setEditing(false);
      }}
      onAbort={() => setEditing(false)}
    />
  ) : (
    <div className={'tagLabel'}>{tag.name}</div>
  );
};

interface ITreeListItemEditorProps {
  initialName: string;
  onRename: (name: string) => void;
  onAbort?: () => void;
  autoFocus?: boolean;
  // icon?: IconName;
  placeholder?: string;
  resetOnSubmit?: boolean;
}

const TreeListItemEditor = ({
  initialName,
  onRename,
  onAbort = () => null, // no-op function by default
  autoFocus = true,
  placeholder = 'Enter a new name',
  resetOnSubmit = false,
}: ITreeListItemEditorProps) => {
  const [newName, setNewName] = useState(initialName);
  const [isFocused, setFocused] = useState(false);

  const isValidInput = newName.trim() !== '';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (isValidInput) {
          onRename(newName);
          if (resetOnSubmit) {
            setNewName(initialName);
          }
        }
      }}
    >
      <ControlGroup fill={true} vertical={false} onAbort={onAbort}>
        <InputGroup
          placeholder={placeholder}
          onChange={(e: React.FormEvent<HTMLElement>) =>
            setNewName((e.target as HTMLInputElement).value)
          }
          value={newName}
          autoFocus={autoFocus}
          onBlur={() => {
            setFocused(false);
            onAbort();
          }}
          onFocus={(e) => {
            setFocused(true);
            e.target.select();
          }}
          // Only show red outline when input field is in focus and text is invalid
          className={isFocused && !isValidInput ? 'bp3-intent-danger' : ''}
        />
        {/* <Button icon={icon} type="submit"/> */}
      </ControlGroup>
    </form>
  );
};

//// Add context menu /////
interface ITagCollectionContextMenu {
  onNewTag: () => void;
  onNewCollection: () => void;
  enableEditing: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onRemove?: () => void;
  onAddSelectionToQuery: () => void;
  onReplaceQuery: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  numTagsToDelete: number;
  numColsToDelete: number;
}

const TagCollectionContextMenu = ({
  onNewTag,
  onNewCollection,
  enableEditing,
  onExpandAll,
  onCollapseAll,
  onRemove,
  onAddSelectionToQuery,
  onReplaceQuery,
  onMoveUp,
  onMoveDown,
  numTagsToDelete,
  numColsToDelete,
}: ITagCollectionContextMenu) => {
  let deleteText = formatTagCountText(numTagsToDelete, numColsToDelete);
  deleteText = deleteText && ` (${deleteText})`;
  return (
    <Menu>
      <MenuItem onClick={onNewTag} text="New Tag" icon={IconSet.TAG_ADD} />
      <MenuItem onClick={onNewCollection} text="New Collection" icon={IconSet.TAG_ADD_COLLECTION} />
      <MenuItem onClick={enableEditing} text="Rename" icon={IconSet.EDIT} />
      <MenuItem
        onClick={onRemove}
        text={`Delete${deleteText}`}
        icon={IconSet.DELETE}
        disabled={!onRemove}
      />
      <Divider />
      <MenuItem onClick={onExpandAll} text="Expand" icon={IconSet.ITEM_EXPAND} />
      <MenuItem onClick={onCollapseAll} text="Collapse" icon={IconSet.ITEM_COLLAPS} />
      <MenuItem onClick={onMoveUp} text="Move Up" icon={IconSet.ITEM_MOVE_UP} />
      <MenuItem onClick={onMoveDown} text="Move Down" icon={IconSet.ITEM_MOVE_DOWN} />
      <Divider />
      <MenuItem onClick={onAddSelectionToQuery} text="Add to Search Query" icon={IconSet.SEARCH} />
      <MenuItem onClick={onReplaceQuery} text="Replace Search Query" icon={IconSet.REPLACE} />
    </Menu>
  );
};

interface ITagContextMenuProps {
  enableEditing: () => void;
  onRemove: () => void;
  onAddSelectionToQuery: () => void;
  onReplaceQuery: () => void;
  numTagsToDelete: number;
  numColsToDelete: number;
}

const TagContextMenu = ({
  enableEditing,
  onRemove,
  onAddSelectionToQuery,
  onReplaceQuery,
  numTagsToDelete,
  numColsToDelete,
}: ITagContextMenuProps) => {
  const handleChangeColor = () => {
    // Todo: Change color. Would be nice to have some presets and a custom option (hex code and/or color wheel)
    console.log('Change color');
    alert('Not implemented yet');
  };

  let deleteText = formatTagCountText(numTagsToDelete, numColsToDelete);
  deleteText = deleteText && ` (${deleteText})`;

  return (
    <Menu>
      <MenuItem onClick={enableEditing} text="Rename" icon={IconSet.EDIT} />
      <MenuItem onClick={onRemove} text={`Delete${deleteText}`} icon={IconSet.DELETE} />
      <MenuItem onClick={handleChangeColor} text="Change color" icon="circle" disabled />
      <Divider />
      <MenuItem onClick={onAddSelectionToQuery} text="Add to Search Query" icon={IconSet.SEARCH} />
      <MenuItem onClick={onReplaceQuery} text="Replace Search Query" icon={IconSet.REPLACE} />
    </Menu>
  );
};

const TagTree = observer(({ rootStore }: IRootStoreProp) => {
  const { uiStore, tagCollectionStore, tagStore } = rootStore;
  const root = tagCollectionStore.getRootCollection();

  /** Only one node can be edited or added at a time. Newly added nodes will be in edit mode */
  const [editNode, setEditNode] = useState<{ id: ID; kind: DragAndDropType } | undefined>(
    undefined,
  );

  /**
   * Keeps track of folders that have been expanded. If there is only one child in the hierarchy,
   *  auto expand this collection.
   */
  const [expandState, setExpandState] = useState<IExpandState>({});

  useEffect(() => {
    if (tagCollectionStore.getRootCollection().subCollections.length === 1) {
      setExpandState({ [tagCollectionStore.getRootCollection().subCollections[0]]: true });
    }
  }, []);

  /**
   * Creates tag tree by mapping collections and tags of root collection to the appropriate
   * components and adds a context menu to each node.
   */
  const createTree = (): Array<ITreeNode<INodeData>> => {
    if (root.isEmpty) {
      return [{ label: <i>No tags or collections created yet</i>, id: 'placeholder' }];
    }

    const isEditMode = (id: ID, kind: DragAndDropType) => {
      return editNode ? editNode.kind === kind && editNode.id === id : false;
    };

    const setEditMode = (id: ID, kind: DragAndDropType, editing: boolean) => {
      if (editing) {
        setEditNode({ id, kind });
      } else {
        setEditNode(undefined);
      }
    };

    const createCollection = (col: ClientTagCollection): ITreeNode<INodeData> => {
      const label = (
        <TreeBranch
          id={col.id}
          name={col.name}
          isSelected={col.isSelected}
          isDescendant={(ancestor) => {
            const draggedCollection = tagCollectionStore.getTagCollection(ancestor);
            if (draggedCollection) {
              return draggedCollection.containsSubCollection(col);
            }
            return false;
          }}
          onDropHover={() => setExpandState({ ...expandState, [col.id]: true })}
          leaf={DragAndDropType.Tag}
          onDropLeaf={(item) => uiStore.moveTag(item.id, col)}
          onDropBranch={(item) => uiStore.moveCollection(item.id, col)}
          branch={DragAndDropType.Collection}
          onDropSelection={() => uiStore.moveSelectedTagItems(col.id)}
          isEditing={isEditMode(col.id, DragAndDropType.Collection)}
          setEditing={(editing) => setEditMode(col.id, DragAndDropType.Collection, editing)}
          render={(props) => (
            <TagCollectionItem
              col={col}
              isEditing={props.isEditing}
              setEditing={props.setEditing}
            />
          )}
        />
      );

      const childNodes = [
        ...col.clientSubCollections.map((subCol) => createCollection(subCol)),
        ...createTags(col),
      ];

      const ContextMenu = () => {
        const contextItems = uiStore.getTagContextItems(col.id);

        const movePosition = (newPosition: (currentPosition: number) => number) => {
          const movedCollectionParent = tagCollectionStore.tagCollectionList.find((c) =>
            c.subCollections.includes(col.id),
          );
          if (movedCollectionParent) {
            const clamp = (i: number): number => {
              if (i < 0) {
                return 0;
              } else if (i > movedCollectionParent.subCollections.length) {
                return movedCollectionParent.subCollections.length;
              } else {
                return i;
              }
            };
            const oldIndex = movedCollectionParent.subCollections.indexOf(col.id);
            movedCollectionParent.subCollections.remove(col.id);
            const newIndex = clamp(newPosition(oldIndex));
            movedCollectionParent.subCollections.splice(newIndex, 0, col.id);
          }
        };

        const expandSubCollection = (c: ClientTagCollection): IExpandState => {
          c.clientSubCollections.forEach((subCol) => {
            expandSubCollection(subCol);
          });
          expandState[c.id] = true;
          return expandState;
        };

        const collapseSubCollection = (c: ClientTagCollection): IExpandState => {
          c.clientSubCollections.forEach((subCol) => {
            collapseSubCollection(subCol);
          });
          expandState[c.id] = false;
          return expandState;
        };

        return (
          <TagCollectionContextMenu
            onNewTag={() =>
              tagStore
                .addTag(DEFAULT_TAG_NAME)
                .then((tag) => {
                  col.addTag(tag.id);
                  setEditNode({ id: tag.id, kind: DragAndDropType.Tag });
                  setExpandState({ ...expandState, [col.id]: true });
                })
                .catch((err) => console.log('Could not create tag', err))
            }
            onNewCollection={() =>
              tagCollectionStore
                .addTagCollection(DEFAULT_COLLECTION_NAME, col)
                .then((collection) => {
                  setEditNode({ id: collection.id, kind: DragAndDropType.Collection });
                  setExpandState({ ...expandState, [col.id]: true });
                })
                .catch((err) => console.log('Could not create collection', err))
            }
            enableEditing={() => setEditNode({ id: col.id, kind: DragAndDropType.Collection })}
            onExpandAll={() => setExpandState({ ...expandSubCollection(col) })}
            onCollapseAll={() => setExpandState({ ...collapseSubCollection(col) })}
            onRemove={() => uiStore.openOutlinerTagRemover(col.isSelected ? 'selected' : col.id)}
            onAddSelectionToQuery={() =>
              uiStore.addTagsToQuery(
                col.isSelected ? uiStore.tagSelection.toJS() : col.getTagsRecursively(),
              )
            }
            onReplaceQuery={() =>
              uiStore.replaceQuery(
                col.isSelected ? uiStore.tagSelection.toJS() : col.getTagsRecursively(),
              )
            }
            onMoveUp={() => movePosition((n) => n - 1)}
            onMoveDown={() => movePosition((n) => n + 1)}
            numTagsToDelete={Math.max(0, contextItems.collections.length - 1)}
            numColsToDelete={contextItems.tags.length}
          />
        );
      };

      return {
        id: col.id,
        icon: expandState[col.id] ? IconSet.TAG_GROUP_OPEN : IconSet.TAG_GROUP,
        isSelected: col.isSelected,
        hasCaret: true,
        isExpanded: expandState[col.id],
        label,
        childNodes,
        nodeData: { type: DragAndDropType.Collection, contextMenu: <ContextMenu /> },
      };
    };

    const createTags = (col: ClientTagCollection): Array<ITreeNode<INodeData>> => {
      return col.clientTags.map(
        (tag): ITreeNode<INodeData> => {
          const ContextMenu = () => {
            const contextItems = uiStore.getTagContextItems(tag.id);
            return (
              <TagContextMenu
                enableEditing={() => setEditNode({ id: tag.id, kind: DragAndDropType.Tag })}
                onRemove={() =>
                  uiStore.openOutlinerTagRemover(tag.isSelected ? 'selected' : tag.id)
                }
                onAddSelectionToQuery={() =>
                  uiStore.addTagsToQuery(tag.isSelected ? uiStore.tagSelection.toJS() : [tag.id])
                }
                onReplaceQuery={() =>
                  uiStore.replaceQuery(tag.isSelected ? uiStore.tagSelection.toJS() : [tag.id])
                }
                numTagsToDelete={Math.max(0, contextItems.tags.length - 1)}
                numColsToDelete={contextItems.collections.length}
              />
            );
          };

          return {
            id: tag.id,
            icon: IconSet.TAG,
            isSelected: tag.isSelected,
            label: (
              <TreeLeaf
                id={tag.id}
                name={tag.name}
                leaf={DragAndDropType.Tag}
                onDropLeaf={(item) => uiStore.moveTag(item.id, col)}
                onDropHover={() => undefined}
                onDropSelection={() => uiStore.moveSelectedTagItems(col.id)}
                isSelected={tag.isSelected}
                isEditing={isEditMode(tag.id, DragAndDropType.Tag)}
                setEditing={(editing) => setEditMode(tag.id, DragAndDropType.Tag, editing)}
                render={(props) => (
                  <TagItem tag={tag} isEditing={props.isEditing} setEditing={props.setEditing} />
                )}
              />
            ),
            nodeData: { type: DragAndDropType.Tag, contextMenu: <ContextMenu /> },
          };
        },
      );
    };

    return [...root.clientSubCollections.map((c) => createCollection(c)), ...createTags(root)];
  };

  const handleRootAddTag = useCallback(() => {
    tagStore
      .addTag(DEFAULT_TAG_NAME)
      .then((tag) => {
        root.addTag(tag.id);
        setEditNode({ id: tag.id, kind: DragAndDropType.Tag });
      })
      .catch((err) => console.log('Could not create tag', err));
  }, []);

  const handleAddRootCollection = useCallback(() => {
    tagCollectionStore
      .addTagCollection(DEFAULT_COLLECTION_NAME, root)
      .then((col) => setEditNode({ id: col.id, kind: DragAndDropType.Collection }))
      .catch((err) => console.log('Could not create collection', err));
  }, []);

  const handleRootDrop = useCallback((monitor) => {
    const item: IDragAndDropItem = monitor.getItem();
    if (item.isSelected) {
      return uiStore.moveSelectedTagItems(ROOT_TAG_COLLECTION_ID);
    }

    switch (monitor.getItemType()) {
      case DragAndDropType.Collection:
        uiStore.moveCollection(item.id, root);
        break;
      case DragAndDropType.Tag:
        uiStore.moveTag(item.id, root);
        break;
      default:
        break;
    }
  }, []);

  const handleOnContextMenu = (node: ITreeNode<INodeData>): JSX.Element => {
    if (node.nodeData) {
      return node.nodeData.contextMenu;
    }
    return <></>;
  };

  const nodes = useMemo(
    () =>
      computed(() =>
        root.isEmpty
          ? [{ label: <i>No tags or collections created yet</i>, id: 'placeholder' }]
          : createTree(),
      ),
    [root, expandState, editNode],
  );

  /** Allow dropping tags on header and background to move them to the root of the hierarchy */
  const [, headerDrop] = useDrop({
    accept: [DragAndDropType.Collection, DragAndDropType.Tag],
    drop: (_, monitor) => handleRootDrop(monitor),
  });

  const [, footerDrop] = useDrop({
    accept: [DragAndDropType.Collection, DragAndDropType.Tag],
    drop: (_, monitor) => handleRootDrop(monitor),
  });

  return (
    <>
      <div id="outliner-tags-header-wrapper" ref={headerDrop}>
        <H4 className="bp3-heading">Tags</H4>
        <Button
          minimal
          icon={IconSet.TAG_ADD}
          onClick={handleRootAddTag}
          className="tooltip"
          data-right={DEFAULT_TAG_NAME}
        />
        <Button
          minimal
          icon={IconSet.TAG_ADD_COLLECTION}
          onClick={handleAddRootCollection}
          className="tooltip"
          data-right={DEFAULT_COLLECTION_NAME}
        />
      </div>

      <TreeList
        nodes={nodes.get()}
        branch={DragAndDropType.Collection}
        leaf={DragAndDropType.Tag}
        expandState={expandState}
        setExpandState={setExpandState}
        getSubTreeLeaves={(branch) => {
          const collection = tagCollectionStore.getTagCollection(branch);
          if (collection) {
            return collection.getTagsRecursively();
          }
          return [];
        }}
        onSelect={(selection, clear) => uiStore.selectTags(selection, clear)}
        onDeselect={(selection) => uiStore.deselectTags(selection)}
        selectionLength={uiStore.tagSelection.length}
        onContextMenu={handleOnContextMenu}
      />

      {/* Used for dragging collection to root of hierarchy and for deselecting tag selection */}
      <div id="tree-footer" ref={footerDrop} onClick={uiStore.clearTagSelection} />

      <TagRemoval rootStore={rootStore} />
    </>
  );
});

export default TagTree;
