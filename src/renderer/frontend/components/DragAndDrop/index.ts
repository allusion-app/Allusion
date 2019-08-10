import { observer } from 'mobx-react-lite';
import { DragLayer } from './DragLayer';

const enum ItemType {
  Collection = 'collection',
  Tag = 'tag',
}

interface ITagDragItem {
  name: string;
  id: string;
  isSelected: boolean;
}

export default (observer(DragLayer));
export { ItemType, ITagDragItem };
