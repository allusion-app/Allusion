import React from 'react';
import { ClientTag } from 'src/entities/Tag';

interface ITagDnDData {
  item: ClientTag | undefined;
}

const TagDnDContext = React.createContext<ITagDnDData>({} as ITagDnDData);

export default TagDnDContext;
