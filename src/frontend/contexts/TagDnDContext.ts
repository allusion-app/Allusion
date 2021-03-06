import React from 'react';
import { ClientTag } from 'src/entities/Tag';

export interface ITagDnDData {
  item: ClientTag | undefined;
}

/** Data transfer type of tag items. */
export const DnDTagType = 'tag';

/** Data attributes that will be available on every drag operation. */
export const enum DnDAttribute {
  Source = 'dndSource',
  Target = 'dndTarget',
  // DropEffect = 'dnd-drop-effect' // TODO: Combine this with custom pointer!
}

const TagDnDContext = React.createContext<ITagDnDData>({} as ITagDnDData);

export default TagDnDContext;
