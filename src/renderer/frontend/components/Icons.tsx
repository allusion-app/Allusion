import React from 'react';
import SVG from 'react-inlinesvg';

import ADD_TAG_FILL from '../../resources/icons/add-tag-fill.svg';
import ADD_TAG_OUTLINE from '../../resources/icons/add-tag-outline.svg';
import ADD_TAG_TRANS from '../../resources/icons/add-tag-trans.svg';
import ADD from '../../resources/icons/add.svg';
import ARROW_DOWN from '../../resources/icons/arrow-down.svg';
import ARROW_RIGHT from '../../resources/icons/arrow-right.svg';
import ARROW_UP from '../../resources/icons/arrow-up.svg';
import CHECKMARK from '../../resources/icons/checkmark.svg';
import CLOSE from '../../resources/icons/close.svg';
import DELETE from '../../resources/icons/delete.svg';
import DESELECT_ALL_FILL from '../../resources/icons/deselect-all-fill.svg';
import DESELECT_ALL_ROUND from '../../resources/icons/deselect-all-round.svg';
import EDIT from '../../resources/icons/edit.svg';
import FOLDER_CLOSE from '../../resources/icons/folder-close.svg';
import FOLDER_OPEN from '../../resources/icons/folder-open.svg';
import FORM_DROP from '../../resources/icons/form-drop.svg';
import INFO from '../../resources/icons/info.svg';
import LOCATIONS from '../../resources/icons/locations.svg';
import META_INFO from '../../resources/icons/meta-info.svg';
import META_INFO_2 from '../../resources/icons/meta-info-2.svg';
import MORE from '../../resources/icons/more.svg';
import SEARCH from '../../resources/icons/search.svg';
import SEARCH2 from '../../resources/icons/search2.svg';
import SELECT_ALL_CHECKED from '../../resources/icons/select-all-checked.svg';
import SELECT_ALL_ROUND from '../../resources/icons/select-all-round.svg';
import SELECT_ALL_TRANS from '../../resources/icons/select-all-trans.svg';
import SELECT_ALL from '../../resources/icons/select-all.svg';
import SETTINGS from '../../resources/icons/settings.svg';
import TAG_GROUP_OPEN from '../../resources/icons/tag-group-open.svg';
import TAG_GROUP from '../../resources/icons/tag-group.svg';
import TAG from '../../resources/icons/tag.svg';
import VIEW_DATE from '../../resources/icons/view-date.svg';
import VIEW_FILE_TYPE from '../../resources/icons/view-file-type.svg';
import VIEW_FILTER_DOWN from '../../resources/icons/view-filter-down.svg';
import VIEW_FILTER_UP from '../../resources/icons/view-filter-up.svg';
import VIEW_GRID from '../../resources/icons/view-grid.svg';
import VIEW_LIST from '../../resources/icons/view-list.svg';
import VIEW_MASON from '../../resources/icons/view-mason.svg';
import VIEW_NAME_DOWN from '../../resources/icons/view-name-down.svg';
import VIEW_NAME_UP from '../../resources/icons/view-name-up.svg';
import VIEW_PRESENT from '../../resources/icons/view-present.svg';
import WARNING_FILL from '../../resources/icons/warning-fill.svg';
import WARNING from '../../resources/icons/warning.svg';
import { H3, IconName, Tag, Intent } from '@blueprintjs/core';

const toSvg = (src: any) => (
  <SVG
    src={src}
    className="bp3-icon custom-icon"
    style={{ width: '16px', height: '16px' }}
  />
);

const iconSet = {
  ADD_TAG_FILL: toSvg(ADD_TAG_FILL),
  ADD_TAG_OUTLINE: toSvg(ADD_TAG_OUTLINE),
  ADD_TAG_TRANS: toSvg(ADD_TAG_TRANS),
  ADD: toSvg(ADD),
  ARROW_DOWN: toSvg(ARROW_DOWN),
  ARROW_RIGHT: toSvg(ARROW_RIGHT),
  ARROW_UP: toSvg(ARROW_UP),
  CHECKMARK: toSvg(CHECKMARK),
  CLOSE: toSvg(CLOSE),
  DELETE: toSvg(DELETE),
  DESELECT_ALL_FILL: toSvg(DESELECT_ALL_FILL),
  DESELECT_ALL_ROUND: toSvg(DESELECT_ALL_ROUND),
  EDIT: toSvg(EDIT),
  FOLDER_CLOSE: toSvg(FOLDER_CLOSE),
  FOLDER_OPEN: toSvg(FOLDER_OPEN),
  FORM_DROP: toSvg(FORM_DROP),
  INFO: toSvg(INFO),
  LOCATIONS: toSvg(LOCATIONS),
  META_INFO: toSvg(META_INFO),
  META_INFO_2: toSvg(META_INFO_2),
  MORE: toSvg(MORE),
  SEARCH: toSvg(SEARCH),
  SEARCH2: toSvg(SEARCH2),
  SELECT_ALL_CHECKED: toSvg(SELECT_ALL_CHECKED),
  SELECT_ALL_ROUND: toSvg(SELECT_ALL_ROUND),
  SELECT_ALL_TRANS: toSvg(SELECT_ALL_TRANS),
  SELECT_ALL: toSvg(SELECT_ALL),
  SETTINGS: toSvg(SETTINGS),
  TAG_GROUP_OPEN: toSvg(TAG_GROUP_OPEN),
  TAG_GROUP: toSvg(TAG_GROUP),
  TAG: toSvg(TAG),
  VIEW_DATE: toSvg(VIEW_DATE),
  VIEW_FILE_TYPE: toSvg(VIEW_FILE_TYPE),
  VIEW_FILTER_DOWN: toSvg(VIEW_FILTER_DOWN),
  VIEW_FILTER_UP: toSvg(VIEW_FILTER_UP),
  VIEW_GRID: toSvg(VIEW_GRID),
  VIEW_LIST: toSvg(VIEW_LIST),
  VIEW_MASON: toSvg(VIEW_MASON),
  VIEW_NAME_DOWN: toSvg(VIEW_NAME_DOWN),
  VIEW_NAME_UP: toSvg(VIEW_NAME_UP),
  VIEW_PRESENT: toSvg(VIEW_PRESENT),
  WARNING_FILL: toSvg(WARNING_FILL),
  WARNING: toSvg(WARNING),
};

export const IconDemo = () => (
  <>
    <H3>Built-in icons</H3>
    { (['plus', 'small-plus', '', '', 'chevron-down', 'chevron-right', 'chevron-up',
        'tick', 'cross', 'trash', 'delete', 'small-cross', 'edit', 'folder-close', 'folder-open',
        '', 'info-sign', 'menu', '', '', 'more', 'search', 'path-search',
        'tag', 'calendar',
        'sort-alphabetical', 'sort-alphabetical-desc', 'play', 'warning-sign',
      ] as IconName[])
    .map((name, i) =>
      <Tag
        icon={name}
        large
        intent={Object.values(Intent)[i % Object.values(Intent).length]}
        key={i}
      />,
    )}

    <br />
    <H3>Custom icons</H3>
    {Object.values(iconSet)
      .map((icon, i) =>
        <Tag
          icon={icon}
          large
          intent={Object.values(Intent)[i % Object.values(Intent).length]}
          key={`tag-${i}`}
        />,
      )}
  </>
);

export default iconSet;
