import React, { useCallback } from 'react';
import IconSet from 'components/Icons';
import { MenuItem, Icon, Divider, Menu } from '@blueprintjs/core';
import { SketchPicker, ColorResult } from 'react-color';
import { observer } from 'mobx-react-lite';
import { ClientIDSearchCriteria } from 'src/renderer/entities/SearchCriteria';
import { formatTagCountText } from 'src/renderer/frontend/utils';
import { ActionType, Action, IExpansionState } from './TagsTree';
import { ID } from 'src/renderer/entities/ID';
import UiStore from 'src/renderer/frontend/UiStore';
import { ClientTagCollection } from 'src/renderer/entities/TagCollection';

interface IColorOptions {
  label: string;
  value: string;
}

const defaultColorOptions: IColorOptions[] = [
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

const ColorPickerMenu = observer(
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

interface IEditMenuProps {
  rename: () => void;
  delete: () => void;
  color: string;
  setColor: (color: string) => void;
  contextText: string;
}

const EditMenu = (props: IEditMenuProps) => {
  return (
    <>
      <MenuItem onClick={props.rename} text="Rename" icon={IconSet.EDIT} />
      <MenuItem onClick={props.delete} text={`Delete${props.contextText}`} icon={IconSet.DELETE} />
      <ColorPickerMenu
        selectedColor={props.color}
        onChange={props.setColor}
        contextText={props.contextText}
      />
    </>
  );
};

interface ISearchMenuProps {
  addSearch: () => void;
  replaceSearch: () => void;
}

const SearchMenu = (props: ISearchMenuProps) => {
  return (
    <>
      <MenuItem onClick={props.addSearch} text="Add to Search Query" icon={IconSet.SEARCH} />
      <MenuItem onClick={props.replaceSearch} text="Replace Search Query" icon={IconSet.REPLACE} />
    </>
  );
};

interface ITagMenuProps {
  id: ID;
  color: string;
  isSelected: boolean;
  uiStore: UiStore;
  dispatch: React.Dispatch<Action>;
}

export const TagContextMenu = ({ id, color, isSelected, uiStore, dispatch }: ITagMenuProps) => {
  const { tags, collections } = uiStore.getTagContextItems(id);
  let contextText = formatTagCountText(Math.max(0, tags.length - 1), collections.length);
  contextText = contextText && ` (${contextText})`;

  return (
    <Menu>
      <EditMenu
        rename={() => dispatch({ type: ActionType.SetEditableNode, payload: id })}
        delete={() => uiStore.openOutlinerTagRemover(isSelected ? 'selected' : id)}
        color={color}
        setColor={(color) => uiStore.colorSelectedTagsAndCollections(id, color)}
        contextText={contextText}
      />
      <Divider />
      <SearchMenu
        addSearch={() =>
          isSelected
            ? uiStore.replaceCriteriaWithTagSelection()
            : uiStore.addSearchCriteria(new ClientIDSearchCriteria('tags', id))
        }
        replaceSearch={() =>
          isSelected
            ? uiStore.replaceCriteriaWithTagSelection()
            : uiStore.replaceSearchCriteria(new ClientIDSearchCriteria('tags', id))
        }
      />
    </Menu>
  );
};

const expandSubCollection = (
  c: ClientTagCollection,
  expansion: IExpansionState,
): IExpansionState => {
  c.clientSubCollections.forEach((subCol) => {
    expandSubCollection(subCol, expansion);
  });
  expansion[c.id] = true;
  return expansion;
};

const collapseSubCollection = (
  c: ClientTagCollection,
  expansion: IExpansionState,
): IExpansionState => {
  c.clientSubCollections.forEach((subCol) => {
    collapseSubCollection(subCol, expansion);
  });
  expansion[c.id] = false;
  return expansion;
};

interface ICollectionMenuProps {
  nodeData: ClientTagCollection;
  expansion: IExpansionState;
  uiStore: UiStore;
  dispatch: React.Dispatch<Action>;
  pos: number;
}

export const CollectionContextMenu = (props: ICollectionMenuProps) => {
  const { nodeData, dispatch, expansion, pos, uiStore } = props;
  const { tags, collections } = uiStore.getTagContextItems(nodeData.id);
  const { tagStore, tagCollectionStore } = uiStore.rootStore;
  let contextText = formatTagCountText(tags.length, Math.max(0, collections.length - 1));
  contextText = contextText && ` (${contextText})`;
  return (
    <Menu>
      <MenuItem
        onClick={() =>
          tagStore
            .addTag('New Tag')
            .then((tag) => {
              nodeData.addTag(tag.id);
              dispatch({
                type: ActionType.InsertNode,
                payload: { parent: nodeData.id, node: tag.id },
              });
            })
            .catch((err) => console.log('Could not create tag', err))
        }
        text="New Tag"
        icon={IconSet.TAG_ADD}
      />
      <MenuItem
        onClick={() =>
          tagCollectionStore
            .addTagCollection('New Collection')
            .then((collection) => {
              nodeData.addCollection(collection.id);
              dispatch({
                type: ActionType.InsertNode,
                payload: { parent: nodeData.id, node: collection.id },
              });
            })
            .catch((err) => console.log('Could not create collection', err))
        }
        text="New Collection"
        icon={IconSet.TAG_ADD_COLLECTION}
      />
      <EditMenu
        rename={() => dispatch({ type: ActionType.SetEditableNode, payload: nodeData.id })}
        delete={() =>
          uiStore.openOutlinerTagRemover(nodeData.isSelected ? 'selected' : nodeData.id)
        }
        color={nodeData.color}
        setColor={(color: string) => uiStore.colorSelectedTagsAndCollections(nodeData.id, color)}
        contextText={contextText}
      />
      <Divider />
      <MenuItem
        onClick={() =>
          dispatch({
            type: ActionType.SetExpansion,
            payload: expandSubCollection(nodeData, expansion),
          })
        }
        text="Expand"
        icon={IconSet.ITEM_EXPAND}
      />
      <MenuItem
        onClick={() =>
          dispatch({
            type: ActionType.SetExpansion,
            payload: collapseSubCollection(nodeData, expansion),
          })
        }
        text="Collapse"
        icon={IconSet.ITEM_COLLAPS}
      />
      <MenuItem
        onClick={() => nodeData.parent.insertCollection(nodeData, pos - 2)}
        text="Move Up"
        icon={IconSet.ITEM_MOVE_UP}
        disabled={pos === 1}
      />
      <MenuItem
        onClick={() => nodeData.parent.insertCollection(nodeData, pos + 1)}
        text="Move Down"
        icon={IconSet.ITEM_MOVE_DOWN}
        disabled={pos === nodeData.parent.subCollections.length}
      />
      <Divider />
      <SearchMenu
        addSearch={() =>
          nodeData.isSelected
            ? uiStore.replaceCriteriaWithTagSelection()
            : uiStore.addSearchCriterias(
                nodeData.getTagsRecursively().map((c: ID) => new ClientIDSearchCriteria('tags', c)),
              )
        }
        replaceSearch={() =>
          nodeData.isSelected
            ? uiStore.replaceCriteriaWithTagSelection()
            : uiStore.replaceSearchCriterias(
                nodeData.getTagsRecursively().map((c: ID) => new ClientIDSearchCriteria('tags', c)),
              )
        }
      />
    </Menu>
  );
};
