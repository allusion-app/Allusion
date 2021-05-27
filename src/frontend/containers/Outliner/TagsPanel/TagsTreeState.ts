import { action, makeObservable, observable } from 'mobx';
import { createContext, useContext } from 'react';
import { ID } from 'src/entities/ID';
import { ClientTag } from 'src/entities/Tag';

export class TagsTreeState {
  readonly expansion = observable(new Set<ID>());
  @observable editableNode: ID | undefined = undefined;
  @observable deletableNode: ClientTag | undefined = undefined;
  @observable mergableNode: ClientTag | undefined = undefined;

  constructor() {
    makeObservable(this);
  }

  @action.bound isExpanded(node: ID): boolean {
    return this.expansion.has(node);
  }

  @action.bound insertNode(parent: ID, node: ID) {
    this.expansion.add(parent);
    this.editableNode = node;
  }

  @action.bound enableEditing(node: ID) {
    this.editableNode = node;
  }

  @action.bound disableEditing() {
    this.editableNode = undefined;
  }

  @action.bound toggleNode(node: ID) {
    if (!this.expansion.delete(node)) {
      this.expansion.add(node);
    }
  }

  @action.bound expandNode(node: ID) {
    this.expansion.add(node);
  }

  @action.bound confirmDeletion(tag: ClientTag) {
    this.deletableNode = tag;
  }

  @action.bound abortDeletion() {
    this.deletableNode = undefined;
  }

  @action.bound confirmMerge(tag: ClientTag) {
    this.mergableNode = tag;
  }

  @action.bound abortMerge() {
    this.mergableNode = undefined;
  }
}

const TagsTreeStateContext = createContext({} as TagsTreeState);

export function useTagsTreeState(): TagsTreeState {
  return useContext(TagsTreeStateContext);
}

export default TagsTreeStateContext.Provider;
