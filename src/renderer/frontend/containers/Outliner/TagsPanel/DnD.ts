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
  // DropEffect = 'dnd-drop-effect' // TODO: Combine this with custom pointer!
}

/** * Custom data related ONLY to the currently DRAGGED tag or collection */
export let DragItem = { id: '', isSelected: false };

/** Clears all set data attributes. */
export function handleDragEnd(event: React.DragEvent<HTMLDivElement>) {
  event.currentTarget.dataset[DnDAttribute.Source] = 'false';
  DragItem = { id: '', isSelected: false };
}

const PreviewTag = document.createElement('div');
PreviewTag.classList.add(Classes.TAG);
PreviewTag.classList.add(Classes.INTENT_PRIMARY);
PreviewTag.style.position = 'absolute';
PreviewTag.style.top = '-100vh';
document.body.appendChild(PreviewTag);

/** Sets preview image and current element as drag source */
export function onDragStart(
  event: React.DragEvent<HTMLDivElement>,
  name: string,
  dndType: DnDType,
  id: ID,
  isSelected: boolean,
  effectAllowed: string = 'move',
  dropEffect: string = 'move',
) {
  PreviewTag.innerText = name;
  event.dataTransfer.setData(dndType, id);
  event.dataTransfer.setDragImage(PreviewTag, 0, 0);
  event.dataTransfer.effectAllowed = effectAllowed;
  event.dataTransfer.dropEffect = dropEffect;
  event.currentTarget.dataset[DnDAttribute.Source] = 'true';
  DragItem = { id, isSelected };
}

/**
 * Executed callback function while dragging over a target.
 *
 * Do not pass an expansive function into the sideEffect parameter. The dragOver
 * event is fired constantly unlike dragEnter which is only fired once.
 */
export function onDragOver(
  event: React.DragEvent<HTMLDivElement>,
  isSelected: boolean,
  accept: (t: string) => boolean,
  canDrop: (t: string) => boolean = () => true,
  dropEffect: string = 'move',
  sideEffect?: () => void,
) {
  const dropTarget = event.currentTarget;
  const isSource = dropTarget.dataset[DnDAttribute.Source] === 'true';
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
    const posY = event.clientY;
    const rect = dropTarget.getBoundingClientRect();
    const [top, bottom] = [rect.top + 8, rect.bottom - 8];
    if (posY <= top) {
      dropTarget.classList.add('top');
      dropTarget.classList.remove('bottom');
    } else if (posY >= bottom) {
      dropTarget.classList.add('bottom');
      dropTarget.classList.remove('top');
    } else {
      dropTarget.classList.remove('top');
      dropTarget.classList.remove('bottom');
    }
    sideEffect?.();
  }
}

function onDragLeave(event: React.DragEvent<HTMLDivElement>, accept: (t: string) => boolean) {
  if (event.dataTransfer.types.some(accept)) {
    event.dataTransfer.dropEffect = 'none';
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.dataset[DnDAttribute.Target] = 'false';
    event.currentTarget.classList.remove('top');
    event.currentTarget.classList.remove('bottom');
  }
}

export function handleTagDragLeave(event: React.DragEvent<HTMLDivElement>) {
  onDragLeave(event, (t) => t === DnDType.Tag);
}

export function handleCollectionDragLeave(event: React.DragEvent<HTMLDivElement>) {
  onDragLeave(event, (t) => t === DnDType.Tag || t === DnDType.Collection);
}

/** Header and Footer drop zones of the root node */
export function handleDragOverAndLeave(event: React.DragEvent<HTMLDivElement>) {
  if (event.dataTransfer.types.some((t) => t === DnDType.Tag || t === DnDType.Collection)) {
    event.preventDefault();
    event.stopPropagation();
  }
}
