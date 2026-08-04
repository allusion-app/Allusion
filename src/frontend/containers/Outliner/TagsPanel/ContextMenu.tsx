import { observer } from 'mobx-react-lite';
import React from 'react';
import { HexColorPicker } from 'react-colorful';
import { useTranslation } from 'react-i18next';

import { IconSet } from 'widgets';
import { Menu, MenuCheckboxItem, MenuDivider, MenuItem, MenuSubItem } from 'widgets/menus';
import { useStore } from '../../../contexts/StoreContext';
import { ClientTagSearchCriteria } from '../../../entities/SearchCriteria';
import { ClientTag } from '../../../entities/Tag';
import { Action, Factory } from './state';

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

const ColorPickerMenu = observer(({ tag }: { tag: ClientTag }) => {
  const { uiStore } = useStore();

  const handleChange = (color: string) => {
    if (tag.isSelected) {
      uiStore.colorSelectedTagsAndCollections(tag.id, color);
    } else {
      tag.setColor(color);
    }
  };
  const color = tag.color;

  const { t } = useTranslation();
  return (
    <>
      {/* Rainbow gradient icon? */}
      <MenuCheckboxItem
        checked={color === 'inherit'}
        text={t('outliner.tags.inheritParentColor')}
        onClick={() => handleChange(color === 'inherit' ? '' : 'inherit')}
      />
      <MenuSubItem text={t('outliner.tags.pickColor')} icon={IconSet.COLOR}>
        <HexColorPicker color={color || undefined} onChange={handleChange} />
        <button
          key="none"
          aria-label="No Color"
          style={{
            background: 'none',
            border: '1px solid var(--text-color)',
            borderRadius: '100%',
            height: '1rem',
            width: '1rem',
          }}
          onClick={() => handleChange('')}
        />
        {defaultColorOptions.map(({ title, color }) => (
          <button
            key={title}
            aria-label={title}
            style={{
              background: color,
              border: 'none',
              borderRadius: '100%',
              height: '1rem',
              width: '1rem',
            }}
            onClick={() => handleChange(color)}
          />
        ))}
      </MenuSubItem>
    </>
  );
});

interface IContextMenuProps {
  tag: ClientTag;
  dispatch: React.Dispatch<Action>;
  pos: number;
}

export const TagItemContextMenu = observer((props: IContextMenuProps) => {
  const { tag, dispatch, pos } = props;
  const { tagStore, uiStore } = useStore();
  const ctxTags = uiStore.getTagContextItems(tag.id);

  return (
    <Menu>
      <MenuItem
        onClick={() =>
          tagStore
            .create(tag, t('outliner.tags.newTagDefaultName'))
            .then((created) => dispatch(Factory.insertNode(tag.id, created.id)))
            .catch((err) => console.log('Could not create tag', err))
        }
        text={t('outliner.tags.new')}
        icon={IconSet.TAG_ADD}
      />
      <MenuItem
        onClick={() => dispatch(Factory.enableEditing(tag.id))}
        text={t('outliner.tags.rename')}
        icon={IconSet.EDIT}
      />
      <MenuItem
        icon={!tag.isHidden ? IconSet.HIDDEN : IconSet.PREVIEW}
        text={t('outliner.tags.hideTaggedImages')}
        onClick={tag.toggleHidden}
      />
      <MenuItem
        onClick={() => dispatch(Factory.confirmMerge(tag))}
        text={t('outliner.tags.mergeWith')}
        icon={IconSet.TAG_GROUP}
        disabled={ctxTags.some((tag) => tag.subTags.length > 0)}
      />
      <MenuItem
        onClick={() => dispatch(Factory.confirmDeletion(tag))}
        text={t('outliner.tags.delete')}
        icon={IconSet.DELETE}
      />
      <MenuDivider />
      <ColorPickerMenu tag={tag} />
      <MenuDivider />
      <MenuItem
        onClick={() =>
          tag.isSelected
            ? uiStore.addTagSelectionToCriteria()
            : uiStore.addSearchCriteria(new ClientTagSearchCriteria('tags', tag.id))
        }
        text={t('outliner.tags.addToSearch')}
        icon={IconSet.SEARCH}
      />
      <MenuItem
        onClick={() =>
          tag.isSelected
            ? uiStore.replaceCriteriaWithTagSelection()
            : uiStore.replaceSearchCriteria(new ClientTagSearchCriteria('tags', tag.id))
        }
        text={t('outliner.tags.replaceSearch')}
        icon={IconSet.REPLACE}
      />
      <MenuDivider />
      <MenuItem
        onClick={() => tag.parent.insertSubTag(tag, pos - 2)}
        text={t('outliner.tags.moveUp')}
        icon={IconSet.ITEM_MOVE_UP}
        disabled={pos === 1}
      />
      <MenuItem
        onClick={() => tag.parent.insertSubTag(tag, pos + 1)}
        text={t('outliner.tags.moveDown')}
        icon={IconSet.ITEM_MOVE_DOWN}
        disabled={pos === tag.parent.subTags.length}
      />
      {/* TODO: Sort alphanumerically option. Maybe in modal for more options (e.g. all levels or just 1 level) and for previewing without immediately saving */}
    </Menu>
  );
});
