import React, { useCallback, useContext } from 'react';
import { Icon } from '@blueprintjs/core';
import { IconSet } from 'components';
import { MenuDivider, MenuItem, SubMenu, Menu } from 'components/menu';
import { SketchPicker, ColorResult } from 'react-color';
import { observer } from 'mobx-react-lite';
import { ClientIDSearchCriteria } from 'src/renderer/entities/SearchCriteria';
import { formatTagCountText } from 'src/renderer/frontend/utils';
import { Action, Factory } from './StateReducer';
import { IExpansionState } from '../../types';
import { ID } from 'src/renderer/entities/ID';
import { ClientTagCollection } from 'src/renderer/entities/TagCollection';
import { ClientTag } from 'src/renderer/entities/Tag';
import StoreContext from 'src/renderer/frontend/contexts/StoreContext';

const defaultColorOptions = [
  { title: 'Eminence', color: '#5f3292' },
  { title: 'Indigo', color: '#5642A6' },
  { title: 'Blue Ribbon', color: '#143ef1' },
  { title: 'Azure Radiance', color: '#147df1' },
  { title: 'Aquamarine', color: '#6cdfe3' },
  { title: 'Aero Blue', color: '#bdfce4' },
  { title: 'Golden Fizz', color: '#f7ea3a' },
  { title: 'Goldenrod', color: '#fcd870' },
  { title: 'Christineapprox', color: '#f36a0f' },
  { title: 'Crimson', color: '#ec1335' },
  { title: 'Razzmatazz', color: '#ec125f' },
];

interface IColorPickerMenuProps {
  selectedColor: string;
  onChange: (color: string) => any;
  contextText: string;
}

const ColorPickerMenu = observer(
  ({ selectedColor, onChange, contextText }: IColorPickerMenuProps) => {
    const defaultColor = '#007af5';
    const handlePickCustomColor = useCallback((res: ColorResult) => onChange(res.hex), [onChange]);
    return (
      <SubMenu
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
        <SubMenu text="Custom" icon={IconSet.COLOR}>
          <SketchPicker
            color={selectedColor || defaultColor}
            onChangeComplete={handlePickCustomColor}
            disableAlpha
            presetColors={defaultColorOptions}
          />
        </SubMenu>
      </SubMenu>
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
  dispatch: React.Dispatch<Action>;
}

export const TagContextMenu = ({ nodeData, dispatch }: IMenuProps<ClientTag>) => {
  const { uiStore } = useContext(StoreContext);
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
      <MenuDivider />
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
  expansion: IExpansionState;
  pos: number;
}

export const CollectionContextMenu = (props: ICollectionMenuProps) => {
  const { nodeData, dispatch, expansion, pos } = props;
  const { tagCollectionStore, tagStore, uiStore } = useContext(StoreContext);
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
      <MenuDivider />
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
      <MenuDivider />
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
      <MenuDivider />
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
    </Menu>
  );
};
