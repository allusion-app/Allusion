import { ClientTagCollection } from '../../entities/TagCollection';
import { ContextMenuTarget, Menu, MenuItem } from '@blueprintjs/core';
import { ModifiableTagListItem } from './TagListItem';
import React from 'react';

interface ITagCollectionListItemProps {
  tagCollection: ClientTagCollection;
  onRemove?: (tagCollection: ClientTagCollection) => void;
  onAddTag: () => void;
  onAddCollection: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

const TagCollectionListItem = ({ tagCollection }: ITagCollectionListItemProps) => {
  return <>{tagCollection.name}</>;
};

const TagCollectionListItemContextMenu = (
  onNewTag: () => void,
  onNewCollection: () => void,
  enableEditing: () => void,
  onRemove: () => void,
  onExpandAll: () => void,
  onCollapseAll: () => void,
) => {
  // Todo: Change color. Would be nice to have some presets and a custom option (hex code and/or color wheel)
  const handleChangeColor = () => console.log('Change color');
  const onProperties = () => console.log('Show properties');

  return (
    <Menu>
      <MenuItem onClick={onNewTag} text="New tag" icon="tag" />
      <MenuItem onClick={onNewCollection} text="New collection" icon="folder-new" />
      <MenuItem onClick={enableEditing} text="Rename" icon="edit" />
      <MenuItem onClick={onRemove} text="Delete" icon="trash" disabled={!onRemove} />
      <MenuItem onClick={handleChangeColor} text="Change color" icon="circle" />
      <MenuItem onClick={onExpandAll} text="Expand all" icon="expand-all" />
      <MenuItem onClick={onCollapseAll} text="Collapse all" icon="collapse-all" />
      <MenuItem onClick={onProperties} text="Properties" icon="properties" />
    </Menu>
  );
};

interface ITagCollectionListItemWithContextMenuState {
  isContextMenuOpen: boolean;
  isEditing: boolean;
  _isMounted: boolean;
}

/** Wrapper that adds a context menu (with right click) */
@ContextMenuTarget
class TagCollectionListItemWithContextMenu extends React.PureComponent<
  ITagCollectionListItemProps,
  ITagCollectionListItemWithContextMenuState
> {
  state = {
    isEditing: false,
    isContextMenuOpen: false,
    _isMounted: false,
  };

  componentDidMount() {
    this.state._isMounted = true;
  }

  componentWillUnmount() {
    this.state._isMounted = false;
  }

  handleRename = (newName: string) => {
    this.props.tagCollection.name = newName;
    this.updateState({ isEditing: false });
  }

  handleRenameAbort = () => {
    this.updateState({ isEditing: false });
  }

  render() {
    const { tagCollection } = this.props;
    const { isEditing } = this.state;
    return (
      <div className={this.state.isContextMenuOpen ? 'contextMenuTarget' : ''}>
        {
          isEditing
            ? <ModifiableTagListItem
                initialName={tagCollection.name}
                onRename={this.handleRename}
                onAbort={this.handleRenameAbort}
              />
            : <TagCollectionListItem {...this.props} />
        }
      </div>
    );
  }

  renderContextMenu() {
    this.updateState({ isContextMenuOpen: true });
    return TagCollectionListItemContextMenu(
      this.props.onAddTag,
      this.props.onAddCollection,
      () => this.setEditing(true),
      () => this.props.onRemove && this.props.onRemove(this.props.tagCollection),
      this.props.onExpandAll,
      this.props.onCollapseAll,
    );
  }

  onContextMenuClose = () => {
    this.updateState({ isContextMenuOpen: false });
  }

  setEditing = (val: boolean) => {
    this.updateState({ isEditing: val });
  }

  private updateState<K extends keyof ITagCollectionListItemWithContextMenuState>(
    updatableProp: Pick<ITagCollectionListItemWithContextMenuState, K>,
  ) {
    if (this.state._isMounted) {
      this.setState(updatableProp);
    }
  }
}

export default TagCollectionListItemWithContextMenu;
