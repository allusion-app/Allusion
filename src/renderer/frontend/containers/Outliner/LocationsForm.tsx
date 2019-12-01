import React, { useContext, useCallback, useState, useEffect } from 'react';
import { remote, ipcRenderer } from 'electron';
import Path from 'path';
import { observer, Observer } from 'mobx-react-lite';
import { Button, H4, Collapse, Icon, ContextMenuTarget, Menu, MenuItem, Classes, Alert, Dialog, Checkbox, Label } from '@blueprintjs/core';

import StoreContext from '../../contexts/StoreContext';
import IconSet from '../../components/Icons';
import { ClientWatchedDirectory } from '../../../entities/WatchedDirectory';
import { ClientStringSearchCriteria } from '../../../entities/SearchCriteria';
import { IFile } from '../../../entities/File';
import MultiTagSelector from '../../components/MultiTagSelector';

interface ILocationListItemProps {
  dir: ClientWatchedDirectory;
  onDelete: (id: string) => void;
  addToSearch: (path: string) => void;
  replaceSearch: (path: string) => void;
}

@ContextMenuTarget
class LocationListItem extends React.PureComponent<ILocationListItemProps, { isDeleteOpen: boolean, isConfigOpen: boolean }> {
  state = {
    isDeleteOpen: false,
    isConfigOpen: false,
  };

  // todo: need to take into account selection of multiple watched dir
  openDeleteAlert = () => this.setState({ isDeleteOpen: true });
  closeDeleteAlert = () => this.setState({ isDeleteOpen: false });
  handleDeleteConfirm = () => this.props.onDelete(this.props.dir.id);

  openConfigDialog = () => this.setState({ isConfigOpen: true });
  closeConfigDialog = () => this.setState({ isConfigOpen: false });

  handleAddToSearch = () => this.props.addToSearch(this.props.dir.path);
  handleReplaceSearch = () => this.props.replaceSearch(this.props.dir.path);

  render() {
    const { dir } = this.props;
    return (
      <li className="bp3-tree-node">
        <div className="bp3-tree-node-content bp3-tree-node-content-0">

          <span>&nbsp;</span>
          {/* <Icon icon="map-marker" /> */}
          <span className="custom-icon-14">
            <Icon icon={IconSet.FOLDER_CLOSE} />
          </span>
          <span className="bp3-tree-node-label" title={dir.path}>{Path.basename(dir.path)}</span>
        </div>

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

        <Dialog
          title={<span className="ellipsis" title={dir.path}>Location: {Path.basename(dir.path)}</span>}
          icon={IconSet.SETTINGS}
          isOpen={this.state.isConfigOpen}
          onClose={this.closeConfigDialog}
        >
          <div className={Classes.DIALOG_BODY}>
            <Observer>
              {() =>
                <>
                  <Checkbox label="Recursive" checked />
                  <Checkbox label="Add folder name as tag" />
                  <Label>
                    Tags to add
                    <MultiTagSelector
                      selectedTags={dir.clientTagsToAdd}
                      onTagSelect={dir.addTag}
                      onTagDeselect={dir.removeTag}
                      onClearSelection={console.log}
                    />
                  </Label>
                </>
              }
            </Observer>
          </div>

          <div className={Classes.DIALOG_FOOTER}>
            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
              <Button onClick={this.closeConfigDialog}>Close</Button>
            </div>
          </div>
        </Dialog>
      </li>
    );
  }

  public renderContextMenu() {
    return (
      <Menu>
        <MenuItem text="Configure" onClick={this.openConfigDialog} icon={IconSet.SETTINGS} />
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

  const [importPath, setImportPath] = useState('');

  useEffect(() => {
    setImportPath(ipcRenderer.sendSync('getDownloadPath'));
  }, []);

  const handleChooseWatchedDir = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const dirs = remote.dialog.showOpenDialog({
      properties: ['openDirectory'],
    });

    // multi-selection is disabled which means there can be at most 1 folder
    if (!dirs || dirs.length === 0) {
      return;
    }
    watchedDirectoryStore.addDirectory({ path: dirs[0], recursive: true, tagsToAdd: [] });
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
          icon={IconSet.FOLDER_CLOSE_ADD}
          onClick={handleChooseWatchedDir}
          className="tooltip"
        // data-right={DEFAULT_TAG_NAME}
        />
      </div>
      <Collapse isOpen={!isCollapsed}>
        <div className="bp3-tree">
          <ul className="bp3-tree-node-list bp3-tree-root" id="watched-folders">
            <li className="bp3-tree-node">
              <div className="bp3-tree-node-content bp3-tree-node-content-0">
                {/* Todo: Link this to the actual import dir */}
                {/* <Icon icon="map-marker" /> */}
                <span>&nbsp;</span>
                <span className="custom-icon-14">
                  <Icon icon={IconSet.FOLDER_CLOSE_IMPORT} />
                </span>
                <span className="bp3-tree-node-label" title={importPath}>Import location</span>
              </div>
            </li>
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
        </div>
      </Collapse>
    </div>
  );
};

export default observer(LocationsForm);
