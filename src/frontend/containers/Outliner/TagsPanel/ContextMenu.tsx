import React, { useContext } from 'react';
import { observer } from 'mobx-react-lite';
import { HexColorPicker } from 'react-colorful';
import 'react-colorful/dist/index.css';

import { formatTagCountText } from 'src/frontend/utils';
import { ClientIDSearchCriteria } from 'src/entities/SearchCriteria';
import { ClientTag } from 'src/entities/Tag';
import StoreContext from 'src/frontend/contexts/StoreContext';
import UiStore from 'src/frontend/stores/UiStore';
import { IconSet } from 'widgets';
import { MenuDivider, MenuItem, MenuSubItem, Menu, MenuCheckboxItem } from 'widgets/menus';
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

const ColorPickerMenu = observer(({ tag, uiStore }: { tag: ClientTag; uiStore: UiStore }) => {
  const handleChange = (color: string) => {
    if (tag.isSelected) {
      uiStore.colorSelectedTagsAndCollections(tag.id, color);
    } else {
      tag.setColor(color);
    }
  };

  return (
    <>
      {/* Rainbow gradient icon? */}
      <MenuCheckboxItem
        checked={tag.color === 'inherit'}
        text="Inherit Parent Color"
        onClick={() => handleChange(tag.color === 'inherit' ? '' : 'inherit')}
      />
      <MenuSubItem text="Pick Color" icon={IconSet.COLOR}>
        <HexColorPicker color={tag.color || undefined} onChange={handleChange} />
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
  const { tagStore, uiStore } = useContext(StoreContext);
  const tags = uiStore.getTagContextItems(tag.id);
  let contextText = formatTagCountText(tags.length);
  contextText = contextText && ` (${contextText})`;

  return (
    <Menu>
      <MenuItem
        onClick={() =>
          tagStore
            .create(tag, 'New Tag')
            .then((t) => dispatch(Factory.insertNode(tag.id, t.id)))
            .catch((err) => console.log('Could not create tag', err))
        }
        text="New Tag"
        icon={IconSet.TAG_ADD}
      />
      <MenuItem
        onClick={() => dispatch(Factory.enableEditing(tag.id))}
        text="Rename"
        icon={IconSet.EDIT}
      />
      {/* TODO: a merge option would be nice */}
      <MenuItem
        onClick={() => dispatch(Factory.confirmMerge(tag))}
        text="Merge with..."
        icon={IconSet.TAG_GROUP}
      />
      <MenuItem
        onClick={() => dispatch(Factory.confirmDeletion(tag))}
        text={`Delete${contextText}`}
        icon={IconSet.DELETE}
      />
      <MenuDivider />
      <ColorPickerMenu tag={tag} uiStore={uiStore} />
      <MenuDivider />
      <MenuItem
        onClick={() =>
          tag.isSelected
            ? uiStore.addTagSelectionToCriteria()
            : uiStore.addSearchCriteria(new ClientIDSearchCriteria('tags', tag.id))
        }
        text="Add to Search"
        icon={IconSet.SEARCH}
      />
      <MenuItem
        onClick={() =>
          tag.isSelected
            ? uiStore.addTagSelectionToCriteria(true)
            : uiStore.addSearchCriterias(
                tag.recursiveSubTags.map((t) => new ClientIDSearchCriteria('tags', t.id)),
              )
        }
        text="Add to Search (incl. subtags)"
      />
      <MenuItem
        onClick={() =>
          tag.isSelected
            ? uiStore.replaceCriteriaWithTagSelection()
            : uiStore.replaceSearchCriteria(new ClientIDSearchCriteria('tags', tag.id))
        }
        text="Replace Search"
        icon={IconSet.REPLACE}
      />
      <MenuItem
        onClick={() =>
          tag.isSelected
            ? uiStore.replaceCriteriaWithTagSelection(true)
            : uiStore.replaceSearchCriterias(
                tag.recursiveSubTags.map((t) => new ClientIDSearchCriteria('tags', t.id)),
              )
        }
        text="Replace Search (incl. subtags)"
      />
      <MenuDivider />
      <MenuItem
        onClick={() => tag.parent.insertSubTag(tag, pos - 2)}
        text="Move Up"
        icon={IconSet.ITEM_MOVE_UP}
        disabled={pos === 1}
      />
      <MenuItem
        onClick={() => tag.parent.insertSubTag(tag, pos + 1)}
        text="Move Down"
        icon={IconSet.ITEM_MOVE_DOWN}
        disabled={pos === tag.parent.subTags.length}
      />
      {/* TODO: Sort alphanumerically option. Maybe in modal for more options (e.g. all levels or just 1 level) and for previewing without immediately saving */}
    </Menu>
  );
});
