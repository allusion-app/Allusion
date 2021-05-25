import { ID } from 'src/entities/ID';
import { ClientTag } from 'src/entities/Tag';

import { IAction } from '../../types';

const enum Flag {
  InsertNode,
  EnableEditing,
  DisableEditing,
  ToggleNode,
  ExpandNode,
  ConfirmDeletion,
  AbortDeletion,
  ConfirmMerge,
  AbortMerge,
}

export type Action =
  | IAction<Flag.InsertNode, { parent: ID; node: ID }>
  | IAction<Flag.EnableEditing | Flag.ToggleNode | Flag.ExpandNode, ID>
  | IAction<Flag.ConfirmDeletion | Flag.ConfirmMerge, ClientTag>
  | IAction<Flag.DisableEditing | Flag.AbortDeletion | Flag.AbortMerge, undefined>;

export const Factory = {
  insertNode: (parent: ID, node: ID): Action => ({
    flag: Flag.InsertNode,
    data: { parent, node },
  }),
  enableEditing: (data: ID): Action => ({
    flag: Flag.EnableEditing,
    data,
  }),
  disableEditing: (): Action => ({
    flag: Flag.DisableEditing,
    data: undefined,
  }),
  toggleNode: (data: ID): Action => ({ flag: Flag.ToggleNode, data }),
  expandNode: (data: ID): Action => ({ flag: Flag.ExpandNode, data }),
  confirmDeletion: (data: ClientTag): Action => ({
    flag: Flag.ConfirmDeletion,
    data,
  }),
  abortDeletion: (): Action => ({
    flag: Flag.AbortDeletion,
    data: undefined,
  }),
  confirmMerge: (data: ClientTag): Action => ({
    flag: Flag.ConfirmMerge,
    data,
  }),
  abortMerge: (): Action => ({
    flag: Flag.AbortMerge,
    data: undefined,
  }),
};

export type State = {
  expansion: Set<ID>;
  editableNode: ID | undefined;
  deletableNode: ClientTag | undefined;
  mergableNode: ClientTag | undefined;
};

export function reducer(state: State, action: Action): State {
  switch (action.flag) {
    case Flag.InsertNode:
      return {
        ...state,
        expansion: new Set(state.expansion.add(action.data.parent)),
        editableNode: action.data.node,
      };

    case Flag.EnableEditing:
      return {
        ...state,
        editableNode: action.data,
      };

    case Flag.DisableEditing:
      return {
        ...state,
        editableNode: action.data,
      };

    case Flag.ToggleNode:
      if (!state.expansion.delete(action.data)) {
        state.expansion.add(action.data);
      }
      return {
        ...state,
        expansion: new Set(state.expansion),
      };

    case Flag.ExpandNode:
      return {
        ...state,
        expansion: new Set(state.expansion.add(action.data)),
      };

    case Flag.ConfirmDeletion:
    case Flag.AbortDeletion:
      return {
        ...state,
        deletableNode: action.data,
      };

    case Flag.ConfirmMerge:
    case Flag.AbortMerge:
      return {
        ...state,
        mergableNode: action.data,
      };

    default:
      return state;
  }
}
