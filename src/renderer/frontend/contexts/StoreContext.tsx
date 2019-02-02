import React, { useContext } from 'react';
import RootStore from '../stores/RootStore';

const StoreContext = React.createContext<RootStore>(null);

interface IRootStoreProp {
  rootStore: RootStore;
}

// A higher order component (HOC) for injecting the context in the props of the wrapped component
export const withRootstore = <P extends IRootStoreProp>(
  WrappedComponent: React.ComponentType<P>,
): React.SFC<Pick<P, Exclude<keyof P, keyof IRootStoreProp>>> => (
    props: Pick<P, Exclude<keyof P, keyof IRootStoreProp>>,
  ) => {
    const rootStore = useContext(StoreContext);
    return (
      <WrappedComponent rootStore={rootStore} {...props} />
    );
  };

export default StoreContext;
