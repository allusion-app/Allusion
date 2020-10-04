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
import { ClientTag } from 'src/renderer/entities/Tag';
import UiStore from 'src/renderer/frontend/stores/UiStore';
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

const expandTagCollection = (c: ClientTag, expansion: IExpansionState): IExpansionState => {
  c.clientSubTags.forEach((subTag) => {
    expandTagCollection(subTag, expansion);
  });
  expansion[c.id] = true;
  return expansion;
};

const collapseTagCollection = (c: ClientTag, expansion: IExpansionState): IExpansionState => {
  c.clientSubTags.forEach((subTag) => {
    collapseTagCollection(subTag, expansion);
  });
  expansion[c.id] = false;
  return expansion;
};

interface IContextMenuProps {
  nodeData: ClientTag;
  uiStore: UiStore;
  dispatch: React.Dispatch<Action>;
  tagStore: TagStore;
  expansion: IExpansionState;
  pos: number;
}

export const TagItemContextMenu = (props: IContextMenuProps) => {
  const { nodeData, dispatch, expansion, pos, tagStore, uiStore } = props;
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
      <Divider />
      <MenuItem
        onClick={() => dispatch(Factory.setExpansion(expandTagCollection(nodeData, expansion)))}
        text="Expand"
        icon={IconSet.ITEM_EXPAND}
      />
      <MenuItem
        onClick={() => dispatch(Factory.setExpansion(collapseTagCollection(nodeData, expansion)))}
        text="Collapse"
        icon={IconSet.ITEM_COLLAPS}
      />
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
      <Divider />
      <MenuItem
        onClick={() =>
          nodeData.isSelected
            ? uiStore.replaceCriteriaWithTagSelection()
            : uiStore.addSearchCriterias(
                nodeData.getTagsRecursively().map((c: ID) => new ClientIDSearchCriteria('tags', c)),
              )
        }
        text="Add to Search Query"
        icon={IconSet.SEARCH}
      />
      <MenuItem
        onClick={() =>
          nodeData.isSelected
            ? uiStore.replaceCriteriaWithTagSelection()
            : uiStore.replaceSearchCriterias(
                nodeData.getTagsRecursively().map((c: ID) => new ClientIDSearchCriteria('tags', c)),
              )
        }
        text="Replace Search Query"
        icon={IconSet.REPLACE}
      />
    </Menu>
  );
};
