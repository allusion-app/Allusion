import { IAppState } from "../App";

/**
 * The MultiAction can be used for batching multiple actions as a single action.
 * Useful when you don't want to undo every single action individually (e.g. importing 100 files)
 */
// export class MultiAction implements IAction {
//   private actions: IAction[];
//   constructor(actions: IAction[]) {
//     this.actions = actions;
//   }
//   async execute(state) {
//     let newState = state;
//     // Execute actions sequentially
//     for (let exePromise of this.actions.map((action) => action.execute(newState)) {
//       newState = await exePromise(newState);
//     }
//   }
// }

/**
 * Actions should reset the client state and database when un-executed
 */
export default interface IAction {
 execute<T extends keyof IAppState>(state: Readonly<IAppState>): Promise<Pick<IAppState, T>>;
 unExecute<T extends keyof IAppState>(state: Readonly<IAppState>): Promise<Pick<IAppState, T>>;
}
