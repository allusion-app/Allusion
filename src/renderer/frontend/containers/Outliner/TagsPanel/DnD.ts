import { ID } from 'src/renderer/entities/ID';
import { Classes } from '@blueprintjs/core';

/** Data transfer types of TagsTree items. */
export const enum DnDType {
  Collection = 'collection',
  Tag = 'tag',
}

/** Data attributes that will be available on every drag operation. */
export const enum DnDAttribute {
  Source = 'dndSource',
  Target = 'dndTarget',
  // DropEffect = 'dnd-drop-effect' // TODO: Combine this with custum pointer!
}

/**
 * Custom data related ONLY to the currently DRAGGED tag or collection
 *
 * Most importantly DO NOT just export this variable into other components
 * except for the TagsTree. Keeping it in this module will prevent the data
 * being accidentially overwritten. Otherwise create a global variable that can
 * be mutated by functions that capture the variable.
 */
export let DragItem = { id: '', isSelected: false };

/** Clears all set data attributes. */
export const handleDragEnd = (event: React.DragEvent<HTMLDivElement>) => {
  delete event.currentTarget.dataset[DnDAttribute.Source];
  DragItem = { id: '', isSelected: false };
};

const PreviewTag = document.createElement('div');
PreviewTag.classList.add(Classes.TAG);
PreviewTag.classList.add(Classes.INTENT_PRIMARY);
PreviewTag.style.position = 'absolute';
PreviewTag.style.top = '-100vh';
document.body.appendChild(PreviewTag);

/** Sets preview image and current element as drag source */
export const onDragStart = (
  event: React.DragEvent<HTMLDivElement>,
  name: string,
  dndType: DnDType,
  id: ID,
  isSelected: boolean,
  effectAllowed: string = 'move',
  dropEffect: string = 'move',
) => {
  PreviewTag.innerText = name;
  event.dataTransfer.setData(dndType, id);
  event.dataTransfer.setDragImage(PreviewTag, 0, 0);
  event.dataTransfer.effectAllowed = effectAllowed;
  event.dataTransfer.dropEffect = dropEffect;
  event.currentTarget.dataset[DnDAttribute.Source] = 'true';
  DragItem = { id, isSelected };
};

export const onDragOver = (
  event: React.DragEvent<HTMLDivElement>,
  isSelected: boolean,
  accept: (t: string) => boolean,
  canDrop: (t: string) => boolean = () => true,
  dropEffect: string = 'move',
  sideEffect?: () => void,
) => {
  const dropTarget = event.currentTarget;
  const isSource = event.currentTarget.dataset[DnDAttribute.Source] === 'true';
  if (isSource || (DragItem.isSelected && isSelected)) {
    return;
  }
  // Since we only check for tags and collections we only need one type.
  const type = event.dataTransfer.types.find(accept);
  if (type && canDrop(type)) {
    event.dataTransfer.dropEffect = dropEffect;
    event.preventDefault();
    event.stopPropagation();
    dropTarget.dataset[DnDAttribute.Target] = 'true';
    sideEffect?.();
  }
};

const onDragLeave = (event: React.DragEvent<HTMLDivElement>, accept: (t: string) => boolean) => {
  if (event.dataTransfer.types.some(accept)) {
    event.dataTransfer.dropEffect = 'none';
    event.preventDefault();
    event.stopPropagation();
    delete event.currentTarget.dataset[DnDAttribute.Target];
  }
};

export const handleTagDragLeave = (event: React.DragEvent<HTMLDivElement>) =>
  onDragLeave(event, (t) => t === DnDType.Tag);

export const handleCollectionDragLeave = (event: React.DragEvent<HTMLDivElement>) =>
  onDragLeave(event, (t) => t === DnDType.Tag || t === DnDType.Collection);

/** Header and Footer drop zones of the root node */
export const handleDragOverAndLeave = (event: React.DragEvent<HTMLDivElement>) => {
  if (event.dataTransfer.types.some((t) => t === DnDType.Tag || t === DnDType.Collection)) {
    event.preventDefault();
    event.stopPropagation();
  }
};
