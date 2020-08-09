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

export interface IRootStoreProp {
  rootStore: RootStore;
}

/**
 * A higher order component (HOC) for injecting the context in the props of the wrapped component
 * Usage:
 * const myComponent = ...
 * const myComponentWithRootStore = withRootStore(myComponent);
 * Now myComponent is passed the rootStore as a prop.
 */
export const withRootstore = <P extends IRootStoreProp>(WrappedComponent: React.ComponentType<P>) =>
  function rootStoreHoc(props: Pick<P, Exclude<keyof P, keyof IRootStoreProp>>) {
    return (
      <StoreContext.Consumer>
        {(rootStore) => <WrappedComponent {...(props as P)} rootStore={rootStore} />}
      </StoreContext.Consumer>
    );
  };

export default StoreContext;
