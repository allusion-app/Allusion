import React, { useContext } from 'react';
import { ClientFile } from 'src/entities/File';
import { ClientLocation } from 'src/entities/Location';
import { ClientFileSearchItem } from 'src/entities/SearchItem';
import { ClientTag } from 'src/entities/Tag';

// Common
export type IDnDData<T extends { id: string }> = {
  source: T | undefined;
};

/** Data attributes that will be available on every drag operation. */
export const enum DnDAttribute {
  Source = 'dndSource',
  Target = 'dndTarget',
  // DropEffect = 'dnd-drop-effect' // TODO: Combine this with custom pointer!
}

// ----------- Tag -----------------
export type ITagDnDData = IDnDData<ClientTag> & {
  target: ClientFile | undefined;
};

export const DnDTagType = 'tag';

const TagDnDContext = React.createContext<ITagDnDData>({} as ITagDnDData);

export function useTagDnD(): ITagDnDData {
  return useContext(TagDnDContext);
}

export const TagDnDProvider = TagDnDContext.Provider;

// ----------- Search ---------------
export type ISearchItemCriteriaDnDData = IDnDData<ClientFileSearchItem>;

export const DnDSearchType = 'search';

const SearchDnDContext = React.createContext<ISearchItemCriteriaDnDData>(
  {} as ISearchItemCriteriaDnDData,
);

export function useSearchDnD(): ISearchItemCriteriaDnDData {
  return useContext(SearchDnDContext);
}

export const SearchDnDProvider = SearchDnDContext.Provider;

// ----------- Locations ------------
export type ILocationDnDData = IDnDData<ClientLocation>;

export const DnDLocationType = 'location';

const LocationDnDContext = React.createContext<ILocationDnDData>({} as ILocationDnDData);

export function useLocationDnD(): ILocationDnDData {
  return useContext(LocationDnDContext);
}

export const LocationDnDProvider = LocationDnDContext.Provider;
