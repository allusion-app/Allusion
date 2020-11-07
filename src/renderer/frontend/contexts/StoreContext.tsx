import React from 'react';
import RootStore from '../stores/RootStore';

/**
 * https://reactjs.org/docs/context.html
 * Contexts are used in React to avoid prop-drilling.
 * Prop drilling is the act of passing props down many nested components, because a deeply nested
 * component requires some object, such as the RootStore, in order to update an entity in the database.
 * Contexts can be used to store objects seperate from the DOM tree, and can be easily accessed
 * from any component on the DOM tree.
 */
const StoreContext = React.createContext<RootStore>({} as RootStore);

export default StoreContext;
