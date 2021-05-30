import { action, makeObservable, observable } from 'mobx';
import { createContext, useContext } from 'react';
import { ID } from 'src/entities/ID';
import { ClientLocation } from 'src/entities/Location';

export class LocationsTreeState {
  readonly expansion = observable(new Set<ID>());
  @observable deletable: ClientLocation | undefined = undefined;
  @observable recoverable: ClientLocation | undefined = undefined;
  @observable lastUpdated: Date = new Date();

  constructor() {
    makeObservable(this);
  }

  @action.bound isExpanded(node: ID): boolean {
    return this.expansion.has(node);
  }

  @action.bound reload() {
    this.lastUpdated = new Date();
  }

  @action.bound toggleExpansion(node: ID) {
    if (!this.expansion.delete(node)) {
      this.expansion.add(node);
    }
  }

  @action.bound tryDeletion(location: ClientLocation) {
    this.deletable = location;
  }

  @action.bound abortDeletion() {
    this.deletable = undefined;
  }

  @action.bound tryRecovery(location: ClientLocation) {
    this.recoverable = location;
  }

  @action.bound abortRecovery() {
    this.recoverable = undefined;
  }
}

const LocationsTreeStateContext = createContext({} as LocationsTreeState);

export function useLocationsTreeState(): LocationsTreeState {
  return useContext(LocationsTreeStateContext);
}

export default LocationsTreeStateContext.Provider;
