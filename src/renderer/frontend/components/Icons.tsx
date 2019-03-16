import React from 'react';
import SVG from 'react-inlinesvg';

import Add from '../../resources/icons/Add-icon-48px.svg';
import ArrowClosed from '../../resources/icons/Arrow-Closed-icon-48px.svg';
import ArrowOpen from '../../resources/icons/Arrow-Open-icon-48px.svg';
import Checkmark from '../../resources/icons/Checkmark-icon-48x.svg';
import Close from '../../resources/icons/Close-icon-48x.svg';
import DateIcon from '../../resources/icons/Date-icon-48x.svg';
import Delete from '../../resources/icons/Delete-icon-48x.svg';
import FileUp from '../../resources/icons/File-up-icon-48x.svg';
import FilterDown from '../../resources/icons/Filter-down-icon-48x.svg';
import FilterUp from '../../resources/icons/Filter-up-icon-48x.svg';
import FolderClose from '../../resources/icons/Folder-Close-icon-48x.svg';
import FolderOpen from '../../resources/icons/Folder-Open-icon-48x.svg';
import GridView from '../../resources/icons/Grid-view-icon-48x.svg';
import Info from '../../resources/icons/Info-icon-48x.svg';
import ListView from '../../resources/icons/List-view-icon-48x.svg';
import Location from '../../resources/icons/Location-icon-48x.svg';
import MasonView from '../../resources/icons/Mason-view-icon-48x.svg';
import More from '../../resources/icons/more-icon-48x.svg';
import NameDown from '../../resources/icons/Name-down-icon-48x.svg';
import NameUp from '../../resources/icons/Name-up-icon-48x.svg';
import PresentationView from '../../resources/icons/Presentation-view-icon-48x.svg';
import Search from '../../resources/icons/Search-icon-48x.svg';
import SelectAll from '../../resources/icons/Select-All-icon-48x.svg';
import Settings from '../../resources/icons/Settings-icon-48x.svg';
import Tag from '../../resources/icons/TAG-icon-48x.svg';

const toSvg = (src: any) => <SVG src={src} className="bp3-icon custom-icon" />;

const iconSet = {
  ADD: toSvg(Add),
  ARROW_CLOSED: toSvg(ArrowClosed),
  ARROW_OPEN: toSvg(ArrowOpen),
  CHECKMARK: toSvg(Checkmark),
  CLOSE: toSvg(Close),
  DATE: toSvg(DateIcon),
  DELETE: toSvg(Delete),
  FILEUP: toSvg(FileUp),
  FILTERDOWN: toSvg(FilterDown),
  FILTERUP: toSvg(FilterUp),
  FOLDERCLOSE: toSvg(FolderClose),
  FOLDEROPEN: toSvg(FolderOpen),
  GRIDVIEW: toSvg(GridView),
  INFO: toSvg(Info),
  LISTVIEW: toSvg(ListView),
  LOCATION: toSvg(Location),
  MASONVIEW: toSvg(MasonView),
  MORE: toSvg(More),
  NAMEDOWN: toSvg(NameDown),
  NAMEUP: toSvg(NameUp),
  PRESENTATIONVIEW: toSvg(PresentationView),
  SEARCH: toSvg(Search),
  SELECTALL: toSvg(SelectAll),
  SETTINGS: toSvg(Settings),
  TAG: toSvg(Tag),
};

export default iconSet;
