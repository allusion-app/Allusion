import React, { useContext, useCallback, useState } from 'react';
import { remote } from 'electron';
import Path from 'path';
import { observer } from 'mobx-react-lite';
import { Button, H4, Collapse, Icon, ContextMenuTarget, Menu, MenuItem, Classes, Alert } from '@blueprintjs/core';

import StoreContext from '../../contexts/StoreContext';
import IconSet from '../../components/Icons';
import { ClientWatchedDirectory } from '../../../entities/WatchedDirectory';
import { ClientStringSearchCriteria } from '../../../entities/SearchCriteria';
import { IFile } from '../../../entities/File';

interface ILocationListItemProps {
  dir: ClientWatchedDirectory;
  onDelete: (id: string) => void;
  addToSearch: (path: string) => void;
  replaceSearch: (path: string) => void;
}

@ContextMenuTarget
class LocationListItem extends React.PureComponent<ILocationListItemProps, { isDeleteOpen: boolean }> {
  state = {
    isDeleteOpen: false,
  };

  render() {
    const { dir } = this.props;
    return (
      <li>
        <span>
          <Icon icon="map-marker" />
          &nbsp;
          <span className="ellipsis" title={dir.path}>{Path.basename(dir.path)}</span>
        </span>

        <Alert
          isOpen={this.state.isDeleteOpen}
          cancelButtonText="Cancel"
          confirmButtonText="Delete"
          icon={IconSet.DELETE}
          intent="danger"
          onCancel={this.closeDeleteAlert}
          onConfirm={this.handleDeleteConfirm}
          canEscapeKeyCancel
          canOutsideClickCancel
          className={Classes.DARK}
        >
          <div className="bp3-dark" id="deleteFile">
            <h4 className="bp3-heading inpectorHeading">Confirm delete</h4>
            <p>
              Remove {`"${Path.basename(dir.path)}"`} from your locations?
              <br />
              This will also remove its files from your library.
            </p>
          </div>
        </Alert>
      </li>
    );
  }

  openDeleteAlert = () => this.setState({ isDeleteOpen: true });
  closeDeleteAlert = () => this.setState({ isDeleteOpen: false });
  handleDeleteConfirm = () => this.props.onDelete(this.props.dir.id); // todo: need to take into account selection of multiple watched dir
  handleAddToSearch = () => this.props.addToSearch(this.props.dir.path);
  handleReplaceSearch = () => this.props.replaceSearch(this.props.dir.path);

  public renderContextMenu() {
    return (
      <Menu>
        <MenuItem text="Configure" onClick={console.log} icon={IconSet.INFO} />
        <MenuItem onClick={this.handleAddToSearch} text="Add to Search Query" icon={IconSet.SEARCH} />
        <MenuItem onClick={this.handleReplaceSearch} text="Replace Search Query" icon={IconSet.REPLACE} />
        <MenuItem text="Delete" onClick={this.openDeleteAlert} icon={IconSet.DELETE} />
      </Menu>
    );
  }
}

const LocationsForm = () => {

  const { watchedDirectoryStore, uiStore } = useContext(StoreContext);

  const [isCollapsed, setCollapsed] = useState(false);

  const handleChooseWatchedDir = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const dirs = remote.dialog.showOpenDialog({
      properties: ['openDirectory'],
    });

    // multi-selection is disabled which means there can be at most 1 folder
    if (!dirs || dirs.length === 0) {
      return;
    }
    watchedDirectoryStore.addDirectory({ path: dirs[0], recursive: true });
  }, [watchedDirectoryStore]);

  const toggleLocations = useCallback(
    () => setCollapsed(!isCollapsed),
    [isCollapsed, setCollapsed]);

  const addToSearch = useCallback((path: string) => {
    uiStore.addSearchCriteria(new ClientStringSearchCriteria<IFile>('path', path, 'contains'));
    uiStore.searchByQuery();
    uiStore.openSearch();
  }, [uiStore]);

  const replaceSearch = useCallback((path: string) => {
    uiStore.clearSearchCriteriaList();
    addToSearch(path);
  }, [uiStore, addToSearch]);

  return (
   <div>
      <div className="outliner-header-wrapper" onClick={toggleLocations}>
        <H4 className="bp3-heading">
          <Icon icon={isCollapsed ? 'caret-right' : 'caret-down'} />
          Locations
        </H4>
        <Button
          minimal
          icon={IconSet.ADD}
          onClick={handleChooseWatchedDir}
          className="tooltip"
          // data-right={DEFAULT_TAG_NAME}
        />
      </div>
      <Collapse isOpen={!isCollapsed}>
        <ul id="watched-folders">
          {
            watchedDirectoryStore.directoryList.map((dir, i) => (
              <LocationListItem
                key={`${dir.path}-${i}`}
                dir={dir}
                onDelete={watchedDirectoryStore.removeDirectory}
                addToSearch={addToSearch}
                replaceSearch={replaceSearch}
              />
            ))
          }
        </ul>
      </Collapse>
    </div>
  );
};

export default observer(LocationsForm);
