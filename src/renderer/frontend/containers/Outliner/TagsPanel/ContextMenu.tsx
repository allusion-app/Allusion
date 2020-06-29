import React, { useCallback } from 'react';
import IconSet from 'components/Icons';
import { MenuItem, Icon, Divider, Menu } from '@blueprintjs/core';
import { SketchPicker, ColorResult } from 'react-color';
import { observer } from 'mobx-react-lite';
import { ClientIDSearchCriteria } from 'src/renderer/entities/SearchCriteria';
import { formatTagCountText } from 'src/renderer/frontend/utils';
import { Action, Factory } from './StateReducer';
import { IExpansionState } from '..';
import { ID } from 'src/renderer/entities/ID';
import { ClientTagCollection } from 'src/renderer/entities/TagCollection';
import { ClientTag } from 'src/renderer/entities/Tag';
import UiStore from 'src/renderer/frontend/stores/UiStore';
import TagCollectionStore from 'src/renderer/frontend/stores/TagCollectionStore';
import TagStore from 'src/renderer/frontend/stores/TagStore';

interface IColorOptions {
  label: string;
  value: string;
}

const defaultColorOptions: IColorOptions[] = [
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
        <MenuItem
          key="none"
          text="None"
          onClick={() => onChange('')}
          icon={
            <Icon icon={selectedColor === '' ? 'tick-circle' : 'circle'} color={defaultColor} />
          }
        />
        <MenuItem
          key="inherit"
          text="Inherit"
          onClick={() => onChange('inherit')}
          icon={
            <Icon
              icon={selectedColor === 'inherit' ? 'tick-circle' : 'circle'}
              color={defaultColor} // Rainbow gradient?
            />
          }
        />
        {defaultColorOptions.map(({ label, value }) => (
          <MenuItem
            key={label}
            text={label}
            onClick={() => onChange(value)}
            icon={
              <Icon icon={selectedColor === value ? 'tick-circle' : 'full-circle'} color={value} />
            }
          />
        ))}
        <MenuItem text="Custom" icon={IconSet.COLOR}>
          <SketchPicker
            color={selectedColor || defaultColor}
            onChangeComplete={handlePickCustomColor}
            disableAlpha
            presetColors={defaultColorOptions.map((opt) => opt.value)}
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

interface IMenuProps<T> {
  nodeData: T;
  uiStore: UiStore;
  dispatch: React.Dispatch<Action>;
}

export const TagContextMenu = ({ nodeData, dispatch, uiStore }: IMenuProps<ClientTag>) => {
  const { tags, collections } = uiStore.getTagContextItems(nodeData.id);
  let contextText = formatTagCountText(Math.max(0, tags.length - 1), collections.length);
  contextText = contextText && ` (${contextText})`;

  return (
    <Menu>
      <EditMenu
        rename={() => dispatch(Factory.enableEditing(nodeData.id))}
        delete={() => dispatch(Factory.confirmDeletion(nodeData))}
        color={nodeData.color}
        setColor={(color: string) => {
          if (nodeData.isSelected) {
            uiStore.colorSelectedTagsAndCollections(nodeData.id, color);
          } else {
            nodeData.setColor(color);
          }
        }}
        contextText={contextText}
      />
      <Divider />
      <SearchMenu
        addSearch={() =>
          nodeData.isSelected
            ? uiStore.replaceCriteriaWithTagSelection()
            : uiStore.addSearchCriteria(new ClientIDSearchCriteria('tags', nodeData.id))
        }
        replaceSearch={() =>
          nodeData.isSelected
            ? uiStore.replaceCriteriaWithTagSelection()
            : uiStore.replaceSearchCriteria(new ClientIDSearchCriteria('tags', nodeData.id))
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

interface ICollectionMenuProps extends IMenuProps<ClientTagCollection> {
  tagCollectionStore: TagCollectionStore;
  tagStore: TagStore;
  expansion: IExpansionState;
  pos: number;
}

export const CollectionContextMenu = (props: ICollectionMenuProps) => {
  const { nodeData, dispatch, expansion, pos, tagCollectionStore, tagStore, uiStore } = props;
  const { tags, collections } = uiStore.getTagContextItems(nodeData.id);
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
              dispatch(Factory.insertNode(nodeData.id, tag.id));
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
              dispatch(Factory.insertNode(nodeData.id, collection.id));
            })
            .catch((err) => console.log('Could not create collection', err))
        }
        text="New Collection"
        icon={IconSet.TAG_ADD_COLLECTION}
      />
      <EditMenu
        rename={() => dispatch(Factory.enableEditing(nodeData.id))}
        delete={() => dispatch(Factory.confirmDeletion(nodeData))}
        color={nodeData.color}
        setColor={(color: string) => {
          if (nodeData.isSelected) {
            uiStore.colorSelectedTagsAndCollections(nodeData.id, color);
          } else {
            nodeData.setColor(color);
          }
        }}
        contextText={contextText}
      />
      <Divider />
      <MenuItem
        onClick={() => dispatch(Factory.setExpansion(expandSubCollection(nodeData, expansion)))}
        text="Expand"
        icon={IconSet.ITEM_EXPAND}
      />
      <MenuItem
        onClick={() => dispatch(Factory.setExpansion(collapseSubCollection(nodeData, expansion)))}
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
