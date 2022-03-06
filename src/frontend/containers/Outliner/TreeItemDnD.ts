import { DnDAttribute, DnDTagType, IDnDData } from 'src/frontend/contexts/TagDnDContext';

export function createDragReorderHelper(id: string) {
  const previewElement = document.createElement('span');
  previewElement.id = id;
  previewElement.style.position = 'absolute';
  previewElement.style.top = '-100vh';
  document.body.appendChild(previewElement);
  return {
    previewElement,
    onDragStart: <T extends { id: string }>(
      event: React.DragEvent<HTMLDivElement>,
      text: string,
      theme: 'light' | 'dark',
      dndData: IDnDData<T>,
      nodeData: T,
    ) => {
      previewElement.classList.value = `tag ${theme}`;
      previewElement.innerText = text;
      event.dataTransfer.setData(DnDTagType, nodeData.id);
      event.dataTransfer.setDragImage(previewElement, 0, 0);
      event.dataTransfer.effectAllowed = 'linkMove';
      event.dataTransfer.dropEffect = 'move';
      event.currentTarget.dataset[DnDAttribute.Source] = 'true';
      dndData.source = nodeData;
    },
    onDragOver: (event: React.DragEvent<HTMLDivElement>, isMiddleAvailable = true) => {
      const dropTarget = event.currentTarget;

      event.dataTransfer.dropEffect = 'move';
      event.preventDefault();
      event.stopPropagation();
      dropTarget.dataset[DnDAttribute.Target] = 'true';
      const posY = event.clientY;
      const rect = dropTarget.getBoundingClientRect();
      const [top, bottom] = [rect.top + 8, rect.bottom - 8];
      if (posY <= top) {
        dropTarget.classList.add('top');
        dropTarget.classList.remove('center');
        dropTarget.classList.remove('bottom');
      } else if (posY >= bottom) {
        dropTarget.classList.add('bottom');
        dropTarget.classList.remove('center');
        dropTarget.classList.remove('top');
      } else if (isMiddleAvailable) {
        dropTarget.classList.remove('top');
        dropTarget.classList.add('center');
        dropTarget.classList.remove('bottom');
      }
    },
    onDragLeave: (event: React.DragEvent<HTMLDivElement>) => {
      event.dataTransfer.dropEffect = 'none';
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.dataset[DnDAttribute.Target] = 'false';
      event.currentTarget.classList.remove('top');
      event.currentTarget.classList.remove('bottom');
    },
    onDrop: (event: React.DragEvent<HTMLDivElement>) => {
      const targetClasses = event.currentTarget.classList;
      // Checker whether to move the dropped tag(s) into or above/below the drop target
      const relativeMovePos = targetClasses.contains('top')
        ? -1
        : targetClasses.contains('bottom')
        ? 0
        : 'middle'; // Not dragged at top or bottom, but in middle

      event.currentTarget.dataset[DnDAttribute.Target] = 'false';
      event.currentTarget.classList.remove('top');
      event.currentTarget.classList.remove('bottom');

      return relativeMovePos;
    },
  };
}
