import { observer } from 'mobx-react-lite';
import { CustomDragLayer } from './DragLayer';

const enum ItemType {
  Collection = 'collection',
  Tag = 'tag',
}

interface ITagDragItem {
  name: string;
  id: string;
  isSelected: boolean;
}

export default (observer(CustomDragLayer));
export { ItemType, ITagDragItem };
