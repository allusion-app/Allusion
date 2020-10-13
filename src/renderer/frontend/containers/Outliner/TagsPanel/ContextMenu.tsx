import React, { useContext } from 'react';
import { Icon } from '@blueprintjs/core';
import { IconSet } from 'components';
import { MenuDivider, MenuItem, SubMenu, Menu } from 'components/menu';
import { observer } from 'mobx-react-lite';
import { ClientIDSearchCriteria } from 'src/renderer/entities/SearchCriteria';
import { formatTagCountText } from 'src/renderer/frontend/utils';
import { Action, Factory } from './StateReducer';
import { ClientTag } from 'src/renderer/entities/Tag';
import StoreContext from 'src/renderer/frontend/contexts/StoreContext';
import { HexColorPicker } from 'react-colorful';
import 'react-colorful/dist/index.css';

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
        {defaultColorOptions.map(({ title, color }) => (
          <MenuItem
            key={title}
            text={title}
            onClick={() => onChange(color)}
            icon={
              <Icon icon={selectedColor === color ? 'tick-circle' : 'full-circle'} color={color} />
            }
          />
        ))}
        <MenuDivider />
        <SubMenu text="Custom" icon={IconSet.COLOR}>
          <HexColorPicker color={selectedColor} onChange={onChange} />
        </SubMenu>
      </SubMenu>
    );
  },
);

interface IContextMenuProps {
  nodeData: ClientTag;
  dispatch: React.Dispatch<Action>;
  pos: number;
}

export const TagItemContextMenu = (props: IContextMenuProps) => {
  const { nodeData, dispatch, pos } = props;
  const { tagStore, uiStore } = useContext(StoreContext);
  const { tags } = uiStore.getTagContextItems(nodeData.id);
  let contextText = formatTagCountText(tags.length);
  contextText = contextText && ` (${contextText})`;
  return (
    <Menu>
      <MenuItem
        onClick={() =>
          tagStore
            .create(nodeData, 'New Tag')
            .then((tag) => dispatch(Factory.insertNode(nodeData.id, tag.id)))
            .catch((err) => console.log('Could not create tag', err))
        }
        text="New Tag"
        icon={IconSet.TAG_ADD}
      />
      <MenuItem
        onClick={() => dispatch(Factory.enableEditing(nodeData.id))}
        text="Rename"
        icon={IconSet.EDIT}
      />
      <MenuItem
        onClick={() => dispatch(Factory.confirmDeletion(nodeData))}
        text={`Delete${contextText}`}
        icon={IconSet.DELETE}
      />
      <ColorPickerMenu
        selectedColor={nodeData.color}
        onChange={(color) => {
          if (nodeData.isSelected) {
            uiStore.colorSelectedTagsAndCollections(nodeData.id, color);
          } else {
            nodeData.setColor(color);
          }
        }}
        contextText={contextText}
      />
      <MenuDivider />
      <MenuItem
        onClick={() => nodeData.parent.insertSubTag(nodeData, pos - 2)}
        text="Move Up"
        icon={IconSet.ITEM_MOVE_UP}
        disabled={pos === 1}
      />
      <MenuItem
        onClick={() => nodeData.parent.insertSubTag(nodeData, pos + 1)}
        text="Move Down"
        icon={IconSet.ITEM_MOVE_DOWN}
        disabled={pos === nodeData.parent.subTags.length}
      />
      <MenuDivider />
      <MenuItem
        onClick={() =>
          nodeData.isSelected
            ? uiStore.replaceCriteriaWithTagSelection()
            : uiStore.addSearchCriteria(new ClientIDSearchCriteria('tags', nodeData.id))
        }
        text="Add to Search Query"
        icon={IconSet.SEARCH}
      />
      <MenuItem
        onClick={() =>
          nodeData.isSelected
            ? uiStore.replaceCriteriaWithTagSelection()
            : uiStore.replaceSearchCriteria(new ClientIDSearchCriteria('tags', nodeData.id))
        }
        text="Replace Search Query"
        icon={IconSet.REPLACE}
      />
    </Menu>
  );
};
