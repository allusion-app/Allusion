import { ID } from 'src/entities/ID';
import { ClientTag } from 'src/entities/Tag';

import { IAction, IExpansionState } from '../../types';

const enum Flag {
  InsertNode,
  EnableEditing,
  DisableEditing,
  Expansion,
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
  | IAction<Flag.DisableEditing | Flag.AbortDeletion | Flag.AbortMerge, undefined>
  | IAction<Flag.Expansion, IExpansionState | ((prevState: IExpansionState) => IExpansionState)>;

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
  setExpansion: (
    data: IExpansionState | ((prevState: IExpansionState) => IExpansionState),
  ): Action => ({
    flag: Flag.Expansion,
    data,
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
  expansion: IExpansionState;
  editableNode: ID | undefined;
  deletableNode: ClientTag | undefined;
  mergableNode: ClientTag | undefined;
};

export function reducer(state: State, action: Action): State {
  switch (action.flag) {
    case Flag.InsertNode:
      return {
        ...state,
        expansion: state.expansion[action.data.parent]
          ? state.expansion
          : { ...state.expansion, [action.data.parent]: true },
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

    case Flag.Expansion:
      return {
        ...state,
        expansion: {
          ...(typeof action.data === 'function' ? action.data(state.expansion) : action.data),
        },
      };

    case Flag.ToggleNode:
      // TODO: Would be neat if ctrl+clicking would do a recursive expand/collapse. Also for the "Tags" header!
      return {
        ...state,
        expansion: { ...state.expansion, [action.data]: !state.expansion[action.data] },
      };

    case Flag.ExpandNode:
      return {
        ...state,
        expansion: { ...state.expansion, [action.data]: true },
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
