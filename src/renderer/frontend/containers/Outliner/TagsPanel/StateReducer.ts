import { ID } from 'src/renderer/entities/ID';
import { IAction, IExpansionState } from '..';

const enum Flag {
  InsertNode,
  EnableEditing,
  DisableEditing,
  Expansion,
  ToggleNode,
  ExpandNode,
}

export type Action =
  | IAction<Flag.InsertNode, { parent: ID; node: ID }>
  | IAction<Flag.EnableEditing | Flag.ToggleNode | Flag.ExpandNode, ID>
  | IAction<Flag.DisableEditing, undefined>
  | IAction<Flag.Expansion, IExpansionState>;

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
  setExpansion: (data: IExpansionState): Action => ({
    flag: Flag.Expansion,
    data,
  }),
  toggleNode: (data: ID): Action => ({ flag: Flag.ToggleNode, data }),
  expandNode: (data: ID): Action => ({ flag: Flag.ExpandNode, data }),
};

export type State = { expansion: IExpansionState; editableNode: ID | undefined };

export function reducer(state: State, action: Action): State {
  switch (action.flag) {
    case Flag.InsertNode:
      return {
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
        expansion: { ...action.data },
      };

    case Flag.ToggleNode:
      return {
        ...state,
        expansion: { ...state.expansion, [action.data]: !state.expansion[action.data] },
      };

    case Flag.ExpandNode:
      return {
        ...state,
        expansion: { ...state.expansion, [action.data]: true },
      };

    default:
      return state;
  }
}
