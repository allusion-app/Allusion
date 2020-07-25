import { Button, ButtonGroup, Icon } from '@blueprintjs/core';
import IconSet from 'components/Icons';
import { observer } from 'mobx-react-lite';
import React, { useContext } from 'react';
import { CSSTransition } from 'react-transition-group';
import { IFile } from 'src/renderer/entities/File';
import { SearchKeyDict } from 'src/renderer/entities/SearchCriteria';
import StoreContext from '../../contexts/StoreContext';
import LocationsPanel from './LocationsPanel';
import TagsPanel from './TagsPanel';



/**
 * Enum variant with associated data for Action enums
 *
 * TypeScript's enum is rather a strongly typed bit flag than a sum type. In
 * other more functional languages, each enum variant can have associated data.
 * Enums use one field as incrementor / bit `flag` to differentiate variants
 * and optionally add `data`. Then using this interface, one creates a type
 * alias similar to string literals.
 *
 * ```
 * const enum Flag {
 *    Foo, // Compiles to 0
 *    Bar, // Compiles to 1
 * }
 * type MyEnum = IAction<Flag.Foo, string> | IAction<Flag.Bar, number>;
 * ```
 */
export interface IAction<F, D> {
  flag: F;
  data: D;
}

/** Map that keeps track of the IDs that are expanded */
export type IExpansionState = { [key: string]: boolean };

export const CustomKeyDict: SearchKeyDict<IFile> = { absolutePath: 'Path' };

// Tooltip info
const enum Tooltip {
  AllImages = 'View all images in library',
  Untagged = 'View all untagged images',
}

const SystemTags = () => {
  const { fileStore } = useContext(StoreContext);
  return (
    <>
      <div id="system-tags">
        <div className="bp3-divider" />
        <ButtonGroup vertical minimal fill>
          <Button
            text="All Images"
            icon={IconSet.MEDIA}
            rightIcon={
              fileStore.showsAllContent ? <Icon intent="primary" icon={IconSet.PREVIEW} /> : null
            }
            onClick={fileStore.fetchAllFiles}
            active={fileStore.showsAllContent}
            fill
            data-right={Tooltip.AllImages}
          />
          <Button
            text={`Untagged (${fileStore.numUntaggedFiles})`}
            icon={IconSet.TAG_BLANCO}
            rightIcon={
              fileStore.showsUntaggedContent ? (
                <Icon icon={IconSet.PREVIEW} />
              ) : fileStore.numUntaggedFiles > 0 ? (
                <Icon icon={IconSet.WARNING} />
              ) : null
            }
            onClick={fileStore.fetchUntaggedFiles}
            active={fileStore.showsUntaggedContent}
            fill
            data-right={Tooltip.Untagged}
          />
        </ButtonGroup>
      </div>
    </>
  );
};

const Outliner = () => {
  const rootStore = useContext(StoreContext);
  const { uiStore } = rootStore;

  // Todo: Use https://blueprintjs.com/docs/#core/components/tabs
  return (
    // Note: timeout needs to equal the transition time in CSS
    <CSSTransition
      in={uiStore.isOutlinerOpen}
      classNames="sliding-sidebar"
      timeout={200}
      unmountOnExit
    >
      <nav id="outliner">
        {/* Placholder for tabbed outliner */}
        {/* <Tabs id="outliner-tabs">
          <Tab id="tags" title="Tags" panel={<TagsPanel />} />
          <Tab id="locations" title="Locations" panel={<LocationsPanel />} />
        </Tabs> */}

        <TagsPanel />
        <LocationsPanel />

        {/* TODO: SystemTags should be inside of each tab, at the bottom, so that the tab headers stay at the top when scrolling */}
        <SystemTags />
      </nav>
    </CSSTransition>
  );
};

export default observer(Outliner);
