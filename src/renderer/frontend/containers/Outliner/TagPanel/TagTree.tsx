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
  Icon,
  Collapse,
} from '@blueprintjs/core';
import { IRootStoreProp } from '../../../contexts/StoreContext';
import { ClientTagCollection, ROOT_TAG_COLLECTION_ID } from '../../../../entities/TagCollection';
import { formatTagCountText } from '../../../utils';
import IconSet from 'components/Icons';
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
import { SketchPicker, ColorResult } from 'react-color';
import { ClientIDSearchCriteria } from '../../../../entities/SearchCriteria';

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
        col.rename(name);
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
        tag.rename(name);
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
  collection: ClientTagCollection;
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
  numTagsInContext: number;
  numColsInContext: number;
  onChangeColor: (col: ID, color: string) => void;
}

const TagCollectionContextMenu = ({
  collection,
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
  numTagsInContext,
  numColsInContext,
  onChangeColor,
}: ITagCollectionContextMenu) => {
  let contextText = formatTagCountText(numTagsInContext, numColsInContext);
  contextText = contextText && ` (${contextText})`;
  const handleSetColor = (col: string) => onChangeColor(collection.id, col);
  return (
    <Menu>
      <MenuItem onClick={onNewTag} text="New Tag" icon={IconSet.TAG_ADD} />
      <MenuItem onClick={onNewCollection} text="New Collection" icon={IconSet.TAG_ADD_COLLECTION} />
      <MenuItem onClick={enableEditing} text="Rename" icon={IconSet.EDIT} />
      <MenuItem
        onClick={onRemove}
        text={`Delete${contextText}`}
        icon={IconSet.DELETE}
        disabled={!onRemove}
      />
      <ColorPickerMenu
        selectedColor={collection.color}
        onChange={handleSetColor}
        contextText={contextText}
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
  tag: ClientTag;
  enableEditing: () => void;
  onRemove: () => void;
  onAddSelectionToQuery: () => void;
  onReplaceQuery: () => void;
  onChangeColor: (col: ID, color: string) => void;
  numTagsInContext: number;
  numColsInContext: number;
}

const TagContextMenu = ({
  tag,
  enableEditing,
  onRemove,
  onAddSelectionToQuery,
  onReplaceQuery,
  onChangeColor,
  numTagsInContext,
  numColsInContext,
}: ITagContextMenuProps) => {
  const handleSetColor = (col: string) => onChangeColor(tag.id, col);

  let contextText = formatTagCountText(numTagsInContext, numColsInContext);
  contextText = contextText && ` (${contextText})`;

  return (
    <Menu>
      <MenuItem onClick={enableEditing} text="Rename" icon={IconSet.EDIT} />
      <MenuItem onClick={onRemove} text={`Delete${contextText}`} icon={IconSet.DELETE} />
      <ColorPickerMenu
        selectedColor={tag.color}
        onChange={handleSetColor}
        contextText={contextText}
      />
      <Divider />
      <MenuItem onClick={onAddSelectionToQuery} text="Add to Search Query" icon={IconSet.SEARCH} />
      <MenuItem onClick={onReplaceQuery} text="Replace Search Query" icon={IconSet.REPLACE} />
    </Menu>
  );
};

interface IColorOptions {
  label: string;
  value: string;
}

export const defaultColorOptions: IColorOptions[] = [
  { label: 'Default', value: '' },
  { label: 'Eminence', value: '#5f3292' },
  { label: 'Indigo', value: '#5642A6' },
  { label: 'Blue Ribbon', value: '#143ef1' },
  { label: 'Azure Radiance', value: '#147df1' },
  { label: 'Aquamarine', value: '#6cdfe3' },
  { label: 'Aero Blue', value: '#bdfce4' },
  { label: 'Golden Fizz', value: '#f7ea3a' },
  { label: 'Goldenrod', value: '#fcd870' },
  { label: 'Christineapprox', value: '#f36a0f' },
  { label: 'Crimson', value: '#ec1335' },
  { label: 'Razzmatazz', value: '#ec125f' },
];

interface IColorPickerMenuProps {
  selectedColor: string;
  onChange: (color: string) => any;
  contextText: string;
}

export const ColorPickerMenu = observer(
  ({ selectedColor, onChange, contextText }: IColorPickerMenuProps) => {
    const defaultColor = '#007af5';
    const handlePickCustomColor = useCallback(
      (res: ColorResult) => {
        onChange(res.hex);
      },
      [onChange],
    );
    return (
      <MenuItem
        text={`Color${contextText}`}
        icon={<Icon icon={selectedColor ? IconSet.COLOR : IconSet.COLOR} color={selectedColor} />}
      >
        {defaultColorOptions.map(({ label, value }) => (
          <MenuItem
            key={label}
            text={label}
            onClick={() => onChange(value)}
            icon={
              <Icon
                icon={selectedColor === value ? 'tick-circle' : value ? 'full-circle' : 'circle'}
                color={value || defaultColor}
              />
            }
          />
        ))}
        <MenuItem text="Custom" icon={IconSet.COLOR}>
          <SketchPicker
            color={selectedColor || defaultColor}
            onChangeComplete={handlePickCustomColor}
            disableAlpha
            presetColors={defaultColorOptions
              .filter((opt) => Boolean(opt.value))
              .map((opt) => opt.value)}
          />
        </MenuItem>
      </MenuItem>
    );
  },
);

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
  }, [tagCollectionStore]);

  /**
   * Creates tag tree by mapping collections and tags of root collection to the appropriate
   * components and adds a context menu to each node.
   */
  const createTree = useCallback((): Array<ITreeNode<INodeData>> => {
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

    const createTags = (col: ClientTagCollection): Array<ITreeNode<INodeData>> => {
      return col.clientTags.map(
        (tag): ITreeNode<INodeData> => {
          const ContextMenu = () => {
            const contextItems = uiStore.getTagContextItems(tag.id);
            return (
              <TagContextMenu
                tag={tag}
                enableEditing={() => setEditNode({ id: tag.id, kind: DragAndDropType.Tag })}
                onRemove={() =>
                  uiStore.openOutlinerTagRemover(tag.isSelected ? 'selected' : tag.id)
                }
                onAddSelectionToQuery={() =>
                  tag.isSelected
                    ? uiStore.replaceCriteriaWithTagSelection()
                    : uiStore.addSearchCriteria(new ClientIDSearchCriteria('tags', tag.id))
                }
                onReplaceQuery={() =>
                  tag.isSelected
                    ? uiStore.replaceCriteriaWithTagSelection()
                    : uiStore.replaceSearchCriteria(new ClientIDSearchCriteria('tags', tag.id))
                }
                numColsInContext={contextItems.collections.length}
                numTagsInContext={Math.max(0, contextItems.tags.length - 1)}
                onChangeColor={(_, color) => uiStore.colorSelectedTagsAndCollections(tag.id, color)}
              />
            );
          };

          return {
            id: tag.id,
            icon: <span style={{ color: tag.viewColor }}>{IconSet.TAG}</span>,
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

    const createCollection = (col: ClientTagCollection): ITreeNode<INodeData> => {
      const label = (
        <TreeBranch
          id={col.id}
          name={col.name}
          isSelected={col.isSelected}
          isDescendant={(ancestor) => {
            const draggedCollection = tagCollectionStore.get(ancestor);
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
            collection={col}
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
              col.isSelected
                ? uiStore.replaceCriteriaWithTagSelection()
                : uiStore.addSearchCriterias(
                    col.getTagsRecursively().map((c) => new ClientIDSearchCriteria('tags', c)),
                  )
            }
            onReplaceQuery={() =>
              col.isSelected
                ? uiStore.replaceCriteriaWithTagSelection()
                : uiStore.replaceSearchCriterias(
                    col.getTagsRecursively().map((c) => new ClientIDSearchCriteria('tags', c)),
                  )
            }
            onMoveUp={() => movePosition((n) => n - 1)}
            onMoveDown={() => movePosition((n) => n + 1)}
            numTagsInContext={Math.max(0, contextItems.collections.length - 1)}
            numColsInContext={contextItems.tags.length}
            onChangeColor={(_, color) => uiStore.colorSelectedTagsAndCollections(col.id, color)}
          />
        );
      };

      return {
        id: col.id,
        icon: (
          <span style={{ color: col.viewColor }}>
            {expandState[col.id] ? IconSet.TAG_GROUP_OPEN : IconSet.TAG_GROUP}
          </span>
        ),
        isSelected: col.isSelected,
        hasCaret: true,
        isExpanded: expandState[col.id],
        label,
        childNodes,
        nodeData: { type: DragAndDropType.Collection, contextMenu: <ContextMenu /> },
      };
    };

    return [...root.clientSubCollections.map((c) => createCollection(c)), ...createTags(root)];
  }, [editNode, expandState, root, tagCollectionStore, tagStore, uiStore]);

  const handleRootAddTag = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      tagStore
        .addTag(DEFAULT_TAG_NAME)
        .then((tag) => {
          root.addTag(tag.id);
          setEditNode({ id: tag.id, kind: DragAndDropType.Tag });
        })
        .catch((err) => console.log('Could not create tag', err));
    },
    [root, tagStore],
  );

  const handleAddRootCollection = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      tagCollectionStore
        .addTagCollection(DEFAULT_COLLECTION_NAME, root)
        .then((col) => setEditNode({ id: col.id, kind: DragAndDropType.Collection }))
        .catch((err) => console.log('Could not create collection', err));
    },
    [root, tagCollectionStore],
  );

  const handleRootDrop = useCallback(
    (monitor) => {
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
    },
    [root, uiStore],
  );

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
    [root.isEmpty, createTree],
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

  const [isCollapsed, setCollapsed] = useState(false);
  const toggleCollapse = useCallback(() => setCollapsed(!isCollapsed), [isCollapsed, setCollapsed]);

  return (
    <>
      <div className="outliner-header-wrapper" ref={headerDrop} onClick={toggleCollapse}>
        <H4 className="bp3-heading">
          <Icon icon={isCollapsed ? IconSet.ARROW_RIGHT : IconSet.ARROW_DOWN} />
          Tags
        </H4>
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

      <Collapse isOpen={!isCollapsed}>
        <TreeList
          nodes={nodes.get()}
          branch={DragAndDropType.Collection}
          leaf={DragAndDropType.Tag}
          expandState={expandState}
          setExpandState={setExpandState}
          getSubTreeLeaves={(branch) => {
            const collection = tagCollectionStore.get(branch);
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
      </Collapse>

      {/* Used for dragging collection to root of hierarchy and for deselecting tag selection */}
      <div id="tree-footer" ref={footerDrop} onClick={uiStore.clearTagSelection} />

      <TagRemoval rootStore={rootStore} />
    </>
  );
});

export default TagTree;
