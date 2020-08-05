import React from 'react';

interface ISVG extends React.SVGProps<SVGSVGElement> {
  src: any;
}

export const SVG = (props: ISVG) => {
  const { src: SVG, ...p } = props;
  return <SVG {...p} />;
};

import ADD_TAG_FILL from 'resources/icons/add-tag-fill.svg';
import ADD_TAG_OUTLINE from 'resources/icons/add-tag-outline.svg';
import ADD_TAG_TRANS from 'resources/icons/add-tag-trans.svg';
import ADD from 'resources/icons/add.svg';
import ARROW_DOWN from 'resources/icons/arrow-down.svg';
import ARROW_LEFT from 'resources/icons/arrow-left.svg';
import ARROW_RIGHT from 'resources/icons/arrow-right.svg';
import ARROW_UP from 'resources/icons/arrow-up.svg';
import CHECKMARK from 'resources/icons/checkmark.svg';
import CHROME_DEVTOOLS from 'resources/icons/chrome-devtools.svg';
import CLEAR_DATABASE from 'resources/icons/clear-database.svg';
import CLOSE from 'resources/icons/close.svg';
import COLOR from 'resources/icons/color.svg';
import DB_ERROR from 'resources/icons/db-error.svg';
import DELETE from 'resources/icons/delete.svg';
import DESELECT_ALL_FILL from 'resources/icons/deselect-all-fill.svg';
import DESELECT_ALL_ROUND from 'resources/icons/deselect-all-round.svg';
import EDIT from 'resources/icons/edit.svg';
import FILTER from 'resources/icons/filter.svg';
import FILTER_DATE from 'resources/icons/filter-date.svg';
import FILTER_FILE_TYPE from 'resources/icons/filter-file-type.svg';
import FILTER_FILTER_DOWN from 'resources/icons/filter-filter-down.svg';
import FILTER_FILTER_UP from 'resources/icons/filter-filter-up.svg';
import FILTER_NAME_DOWN from 'resources/icons/filter-name-down.svg';
import FILTER_NAME_UP from 'resources/icons/filter-name-up.svg';
import FOLDER_CLOSE_ADD from 'resources/icons/folder-close-add.svg';
import FOLDER_CLOSE_IMPORT from 'resources/icons/folder-close-import.svg';
import FOLDER_CLOSE from 'resources/icons/folder-close.svg';
import FOLDER_OPEN from 'resources/icons/folder-open.svg';
import FOLDER_STRUCTURE from 'resources/icons/folder-structure.svg';
import FORM_DROP from 'resources/icons/form-drop.svg';
import GITHUB from 'resources/icons/github.svg';
import IMPORT from 'resources/icons/import.svg';
import HELPCENTER from 'resources/icons/helpcenter.svg';
import INFO from 'resources/icons/info.svg';
import ITEM_COLLAPS from 'resources/icons/item-collaps.svg';
import ITEM_EXPAND from 'resources/icons/item-expand.svg';
import ITEM_MOVE_DOWN from 'resources/icons/item-move-down.svg';
import ITEM_MOVE_UP from 'resources/icons/item-move-up.svg';
import LOGO from 'resources/logo/allusion-logomark-white.svg';
import LOGOMARK_BLACK from 'resources/logo/allusion-logo-ver-fc-black.svg';
import LOGOMARK_WHITE from 'resources/logo/allusion-logo-ver-fc-white.svg';
import MEDIA from 'resources/icons/media.svg';
import META_INFO from 'resources/icons/meta-info.svg';
import META_INFO_2 from 'resources/icons/meta-info-2.svg';
import MORE from 'resources/icons/more.svg';
import OPEN_EXTERNAL from 'resources/icons/open-external.svg';
import OUTLINER from 'resources/icons/outliner.svg';
import PREVIEW from 'resources/icons/preview.svg';
import RELOAD from 'resources/icons/reload.svg';
import REPLACE from 'resources/icons/replace.svg';
import SEARCH from 'resources/icons/search.svg';
import SEARCH_EXTENDED from 'resources/icons/search-extended.svg';
import SELECT_ALL_CHECKED from 'resources/icons/select-all-checked.svg';
import SELECT_ALL_ROUND from 'resources/icons/select-all-round.svg';
import SELECT_ALL_ROUND_CHECKED from 'resources/icons/select-all-round-checked.svg';
import SELECT_ALL_TRANS from 'resources/icons/select-all-trans.svg';
import SELECT_ALL_TRANS_CHECKED from 'resources/icons/select-all-trans-checked.svg';
import SELECT_ALL from 'resources/icons/select-all.svg';
import SETTINGS from 'resources/icons/settings.svg';
import TAG_ADD from 'resources/icons/tag-add.svg';
import TAG_ADD_COLLECTION from 'resources/icons/tag-add-collection.svg';
import TAG_BLANCO from 'resources/icons/tag-blanco.svg';
import TAG_GROUP_OPEN from 'resources/icons/tag-group-open.svg';
import TAG_GROUP from 'resources/icons/tag-group.svg';
import TAG from 'resources/icons/tag.svg';
import THUMB_SM from 'resources/icons/thumb-sm.svg';
import THUMB_MD from 'resources/icons/thumb-md.svg';
import THUMB_BG from 'resources/icons/thumb-bg.svg';
import VIEW_GRID from 'resources/icons/view-grid.svg';
import VIEW_LIST from 'resources/icons/view-list.svg';
import VIEW_MASON from 'resources/icons/view-mason.svg';
import VIEW_PRESENT from 'resources/icons/view-present.svg';
import WARNING_FILL from 'resources/icons/warning-fill.svg';
import WARNING_BROKEN_LINK from 'resources/icons/warning-broken-link.svg';
import WARNING from 'resources/icons/warning.svg';

const toSvg = (src: any) => (
  <SVG src={src} className="bp3-icon custom-icon" style={{ width: '16px', height: '16px' }} />
);

const IconSet = {
  ADD_TAG_FILL: toSvg(ADD_TAG_FILL),
  ADD_TAG_OUTLINE: toSvg(ADD_TAG_OUTLINE),
  ADD_TAG_TRANS: toSvg(ADD_TAG_TRANS),
  ADD: toSvg(ADD),
  ARROW_DOWN: toSvg(ARROW_DOWN),
  ARROW_LEFT: toSvg(ARROW_LEFT),
  ARROW_RIGHT: toSvg(ARROW_RIGHT),
  ARROW_UP: toSvg(ARROW_UP),
  CHECKMARK: toSvg(CHECKMARK),
  CHROME_DEVTOOLS: toSvg(CHROME_DEVTOOLS),
  CLEAR_DATABASE: toSvg(CLEAR_DATABASE),
  CLOSE: toSvg(CLOSE),
  COLOR: toSvg(COLOR),
  DB_ERROR: toSvg(DB_ERROR),
  DELETE: toSvg(DELETE),
  DESELECT_ALL_FILL: toSvg(DESELECT_ALL_FILL),
  DESELECT_ALL_ROUND: toSvg(DESELECT_ALL_ROUND),
  EDIT: toSvg(EDIT),
  FILTER: toSvg(FILTER),
  FILTER_DATE: toSvg(FILTER_DATE),
  FILTER_FILE_TYPE: toSvg(FILTER_FILE_TYPE),
  FILTER_FILTER_DOWN: toSvg(FILTER_FILTER_DOWN),
  FILTER_FILTER_UP: toSvg(FILTER_FILTER_UP),
  FILTER_NAME_DOWN: toSvg(FILTER_NAME_DOWN),
  FILTER_NAME_UP: toSvg(FILTER_NAME_UP),
  FOLDER_CLOSE_ADD: toSvg(FOLDER_CLOSE_ADD),
  FOLDER_CLOSE_IMPORT: toSvg(FOLDER_CLOSE_IMPORT),
  FOLDER_CLOSE: toSvg(FOLDER_CLOSE),
  FOLDER_OPEN: toSvg(FOLDER_OPEN),
  FOLDER_STRUCTURE: toSvg(FOLDER_STRUCTURE),
  FORM_DROP: toSvg(FORM_DROP),
  GITHUB: toSvg(GITHUB),
  IMPORT: toSvg(IMPORT),
  HELPCENTER: toSvg(HELPCENTER),
  INFO: toSvg(INFO),
  ITEM_COLLAPS: toSvg(ITEM_COLLAPS),
  ITEM_EXPAND: toSvg(ITEM_EXPAND),
  ITEM_MOVE_DOWN: toSvg(ITEM_MOVE_DOWN),
  ITEM_MOVE_UP: toSvg(ITEM_MOVE_UP),
  OUTLINER: toSvg(OUTLINER),
  LOGO: toSvg(LOGO),
  LOGO_MARK_BLACK: toSvg(LOGOMARK_BLACK),
  LOGO_MARK_WHITE: toSvg(LOGOMARK_WHITE),
  MEDIA: toSvg(MEDIA),
  META_INFO: toSvg(META_INFO),
  META_INFO_2: toSvg(META_INFO_2),
  MORE: toSvg(MORE),
  OPEN_EXTERNAL: toSvg(OPEN_EXTERNAL),
  PREVIEW: toSvg(PREVIEW),
  RELOAD: toSvg(RELOAD),
  REPLACE: toSvg(REPLACE),
  SEARCH: toSvg(SEARCH),
  SEARCH_EXTENDED: toSvg(SEARCH_EXTENDED),
  SELECT_ALL_CHECKED: toSvg(SELECT_ALL_CHECKED),
  SELECT_ALL_ROUND: toSvg(SELECT_ALL_ROUND),
  SELECT_ALL_ROUND_CHECKED: toSvg(SELECT_ALL_ROUND_CHECKED),
  SELECT_ALL_TRANS: toSvg(SELECT_ALL_TRANS),
  SELECT_ALL_TRANS_CHECKED: toSvg(SELECT_ALL_TRANS_CHECKED),
  SELECT_ALL: toSvg(SELECT_ALL),
  SETTINGS: toSvg(SETTINGS),
  TAG_ADD: toSvg(TAG_ADD),
  TAG_ADD_COLLECTION: toSvg(TAG_ADD_COLLECTION),
  TAG_BLANCO: toSvg(TAG_BLANCO),
  TAG_GROUP_OPEN: toSvg(TAG_GROUP_OPEN),
  TAG_GROUP: toSvg(TAG_GROUP),
  TAG: toSvg(TAG),
  THUMB_SM: toSvg(THUMB_SM),
  THUMB_MD: toSvg(THUMB_MD),
  THUMB_BG: toSvg(THUMB_BG),
  VIEW_GRID: toSvg(VIEW_GRID),
  VIEW_LIST: toSvg(VIEW_LIST),
  VIEW_MASON: toSvg(VIEW_MASON),
  VIEW_PRESENT: toSvg(VIEW_PRESENT),
  WARNING_FILL: toSvg(WARNING_FILL),
  WARNING_BROKEN_LINK: toSvg(WARNING_BROKEN_LINK),
  WARNING: toSvg(WARNING),
};

export default IconSet;
