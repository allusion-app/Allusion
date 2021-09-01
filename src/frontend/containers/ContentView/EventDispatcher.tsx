import { action } from 'mobx';
import React from 'react';
import { useEffect } from 'react';
import { ClientFile } from 'src/entities/File';
import { ClientTag } from 'src/entities/Tag';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { DnDAttribute, DnDTagType, useTagDnD } from 'src/frontend/contexts/TagDnDContext';
import { RendererMessenger } from 'src/Messaging';
import { MenuDivider } from 'widgets/menus';
import {
  ExternalAppMenuItems,
  FileTagMenuItems,
  FileViewerMenuItems,
  MissingFileMenuItems,
  SlideFileViewerMenuItems,
  // SlideFileViewerMenuItems,
} from './menu-items';

export interface DispatchEvent {
  currentTarget: EventTarget & HTMLElement;
  target: EventTarget;
  stopPropagation: () => void;
  preventDefault: () => void;
}

export interface DataTransferEvent extends DispatchEvent {
  dataTransfer: DataTransfer;
}

export interface MousePointerEvent extends DispatchEvent {
  clientX: number;
  clientY: number;
  ctrlKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}

export class GalleryEventDispatcher {
  private file: ClientFile;

  constructor(file: ClientFile) {
    this.file = file;
    this.select = this.select.bind(this);
    this.preview = this.preview.bind(this);
    this.showContextMenu = this.showContextMenu.bind(this);
    this.showSlideContextMenu = this.showSlideContextMenu.bind(this);
    this.showTagContextMenu = this.showTagContextMenu.bind(this);
    this.dragStart = this.dragStart.bind(this);
    this.dragEnter = this.dragEnter.bind(this);
    this.dragOver = this.dragOver.bind(this);
    this.dragLeave = this.dragLeave.bind(this);
    this.drop = this.drop.bind(this);
    this.dragEnd = this.dragEnd.bind(this);
  }

  select(event: MousePointerEvent) {
    event.stopPropagation();
    dispatchCustomEvent(event, {
      selector: GallerySelector.Select,
      payload: {
        file: this.file,
        selectAdditive: event.ctrlKey || event.metaKey,
        selectRange: event.shiftKey,
      },
    });
  }

  preview(event: DispatchEvent) {
    event.stopPropagation();
    dispatchCustomEvent(event, {
      selector: GallerySelector.Preview,
      payload: { file: this.file },
    });
  }

  showContextMenu(event: MousePointerEvent) {
    event.stopPropagation();
    event.preventDefault();
    dispatchCustomEvent(event, {
      selector: GallerySelector.ContextMenu,
      payload: { file: this.file, x: event.clientX, y: event.clientY },
    });
  }

  showSlideContextMenu(event: MousePointerEvent) {
    event.stopPropagation();
    event.preventDefault();
    dispatchCustomEvent(event, {
      selector: GallerySelector.SlideContextMenu,
      payload: { file: this.file, x: event.clientX, y: event.clientY },
    });
  }

  showTagContextMenu(event: MousePointerEvent, tag: ClientTag) {
    event.stopPropagation();
    event.preventDefault();
    dispatchCustomEvent(event, {
      selector: GallerySelector.TagContextMenu,
      payload: { file: this.file, x: event.clientX, y: event.clientY, tag },
    });
  }

  dragStart(event: DispatchEvent) {
    event.stopPropagation();
    event.preventDefault();
    dispatchCustomEvent(event, {
      selector: GallerySelector.FileDragStart,
      payload: { file: this.file },
    });
  }

  dragEnter(event: DataTransferEvent) {
    if (event.dataTransfer.types.includes(DnDTagType)) {
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = 'link';
      (event.target as HTMLElement).dataset[DnDAttribute.Target] = 'true';
    }
  }

  dragOver(event: DataTransferEvent) {
    if (event.dataTransfer.types.includes(DnDTagType)) {
      event.stopPropagation();
      event.preventDefault();
      event.currentTarget.dataset[DnDAttribute.Target] = 'true';
      dispatchCustomEvent(event, {
        selector: GallerySelector.FileDragOver,
        payload: { file: this.file },
      });
    }
  }

  dragLeave(event: DataTransferEvent) {
    if (event.dataTransfer.types.includes(DnDTagType)) {
      event.stopPropagation();
      event.preventDefault();
      event.dataTransfer.dropEffect = 'none';
      event.currentTarget.dataset[DnDAttribute.Target] = 'false';
      dispatchCustomEvent(event, {
        selector: GallerySelector.FileDragLeave,
        payload: { file: undefined },
      });
    }
  }

  drop(event: DataTransferEvent) {
    event.stopPropagation();
    dispatchCustomEvent(event, {
      selector: GallerySelector.FileDrop,
      payload: { file: this.file },
    });
    event.dataTransfer.dropEffect = 'none';
    event.currentTarget.dataset[DnDAttribute.Target] = 'false';
  }

  dragEnd(event: DataTransferEvent) {
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'none';
    event.currentTarget.dataset[DnDAttribute.Target] = 'false';
  }
}

export function useGalleryCommands(
  select: (file: ClientFile, selectAdditive: boolean, selectRange: boolean) => void,
  showContextMenu: (x: number, y: number, menu: [JSX.Element, JSX.Element]) => void,
) {
  const dndData = useTagDnD();
  const { uiStore } = useStore();

  useEffect(() => {
    const handleSelect = action((event: Event) => {
      event.stopPropagation();
      const { file, selectAdditive, selectRange } = (event as GalleryEvent<SelectPayload>).detail;
      select(file, selectAdditive, selectRange);
    });

    const handlePreview = action((event: Event) => {
      event.stopPropagation();
      const file = (event as GalleryEvent<Payload>).detail.file;
      if (!file.isBroken) {
        uiStore.selectFile(file, true);
        uiStore.enableSlideMode();
      }
    });

    const handleContextMenu = action((event: Event) => {
      event.stopPropagation();
      const { file, x, y } = (event as GalleryEvent<ContextMenuPayload>).detail;
      showContextMenu(x, y, [
        file.isBroken ? <MissingFileMenuItems /> : <FileViewerMenuItems file={file} />,
        <ExternalAppMenuItems key="external" file={file} />,
      ]);
      if (!uiStore.fileSelection.has(file)) {
        // replace selection with context menu, like Windows file explorer
        select(file, false, false);
      }
    });

    const handleTagContextMenu = action((event: Event) => {
      event.stopPropagation();
      const { file, x, y, tag } = (event as GalleryEvent<TagContextMenuPayload>).detail;
      showContextMenu(x, y, [
        <>
          <FileTagMenuItems file={file} tag={tag} />
          <MenuDivider />
          {file.isBroken ? <MissingFileMenuItems /> : <FileViewerMenuItems file={file} />}
        </>,
        <ExternalAppMenuItems key="external" file={file} />,
      ]);
      if (!uiStore.fileSelection.has(file)) {
        // replace selection with context menu, like Windows file explorer
        select(file, false, false);
      }
    });

    const handleSlideContextMenu = action((event: Event) => {
      event.stopPropagation();
      const { file, x, y } = (event as GalleryEvent<ContextMenuPayload>).detail;
      showContextMenu(x, y, [
        file.isBroken ? <MissingFileMenuItems /> : <SlideFileViewerMenuItems file={file} />,
        <ExternalAppMenuItems key="external" file={file} />,
      ]);
      if (!uiStore.fileSelection.has(file)) {
        // replace selection with context menu, like Windows file explorer
        select(file, false, false);
      }
    });

    const handleDragStart = action((event: Event) => {
      event.stopPropagation();
      const file = (event as GalleryEvent<Payload>).detail.file;
      if (!uiStore.fileSelection.has(file)) {
        return;
      }
      if (uiStore.fileSelection.size > 1) {
        RendererMessenger.startDragExport(Array.from(uiStore.fileSelection, (f) => f.absolutePath));
      } else {
        RendererMessenger.startDragExport([file.absolutePath]);
      }

      // However, from the main process, there is no way to attach some information to indicate it's an "internal event" that shouldn't trigger the drop overlay
      // So we can store the date when the event starts... Hacky but it works :)
      (window as any).internalDragStart = new Date();
    });

    const handleDragOver = action((event: Event) => {
      event.stopPropagation();
      const file = (event as GalleryEvent<Payload>).detail.file;
      dndData.target = file;
    });

    const handleDragLeave = action((event: Event) => {
      event.stopPropagation();
      const file = (event as GalleryEvent<EmptyPayload>).detail.file;
      dndData.target = file;
    });

    const handleDrop = action((event: Event) => {
      event.stopPropagation();
      if (dndData.source !== undefined) {
        const dropFile = (event as GalleryEvent<Payload>).detail.file;
        const ctx = uiStore.getTagContextItems(dndData.source.id);

        // Tag all selected files - unless the file that is being tagged is not selected
        const filesToTag = uiStore.fileSelection.has(dropFile)
          ? [...uiStore.fileSelection]
          : [dropFile];

        for (const tag of ctx) {
          for (const file of filesToTag) {
            file.addTag(tag);
          }
        }
      }
    });

    const el = window;
    el.addEventListener(GallerySelector.Select, handleSelect);
    el.addEventListener(GallerySelector.Preview, handlePreview);
    el.addEventListener(GallerySelector.ContextMenu, handleContextMenu);
    el.addEventListener(GallerySelector.TagContextMenu, handleTagContextMenu);
    el.addEventListener(GallerySelector.SlideContextMenu, handleSlideContextMenu);
    el.addEventListener(GallerySelector.FileDragStart, handleDragStart);
    el.addEventListener(GallerySelector.FileDragOver, handleDragOver);
    el.addEventListener(GallerySelector.FileDragLeave, handleDragLeave);
    el.addEventListener(GallerySelector.FileDrop, handleDrop);

    return () => {
      el.removeEventListener(GallerySelector.Select, handleSelect);
      el.removeEventListener(GallerySelector.Preview, handlePreview);
      el.removeEventListener(GallerySelector.ContextMenu, handleContextMenu);
      el.removeEventListener(GallerySelector.TagContextMenu, handleTagContextMenu);
      el.removeEventListener(GallerySelector.SlideContextMenu, handleSlideContextMenu);
      el.removeEventListener(GallerySelector.FileDragStart, handleDragStart);
      el.removeEventListener(GallerySelector.FileDragOver, handleDragOver);
      el.removeEventListener(GallerySelector.FileDragLeave, handleDragLeave);
      el.removeEventListener(GallerySelector.FileDrop, handleDrop);
    };
  }, [uiStore, dndData, select, showContextMenu]);
}

function dispatchCustomEvent(event: DispatchEvent, command: ContentViewCommand) {
  event.currentTarget.dispatchEvent(
    new CustomEvent(command.selector, { detail: command.payload, bubbles: true }),
  );
}

interface Command<S extends string, T> {
  selector: S;
  payload: T;
}

const enum GallerySelector {
  Select = 'fileSelect',
  Preview = 'filePreview',
  ContextMenu = 'fileContextMenu',
  TagContextMenu = 'tagContextMenu',
  SlideContextMenu = 'slideContextMenu',
  FileDragStart = 'fileDragStart',
  FileDragOver = 'fileDragOver',
  FileDragLeave = 'fileDragLeave',
  FileDrop = 'fileDrop',
}

type EmptyPayload = { file: undefined };

interface Payload {
  file: ClientFile;
}

interface SelectPayload extends Payload {
  selectAdditive: boolean;
  selectRange: boolean;
}

interface ContextMenuPayload extends Payload {
  x: number;
  y: number;
}

interface TagContextMenuPayload extends ContextMenuPayload {
  tag: ClientTag;
}

type ContentViewCommand =
  | Command<GallerySelector.Select, SelectPayload>
  | Command<GallerySelector.Preview, Payload>
  // Contextmenu
  | Command<GallerySelector.ContextMenu | GallerySelector.SlideContextMenu, ContextMenuPayload>
  | Command<GallerySelector.TagContextMenu, TagContextMenuPayload>
  // Drag and Drop
  | Command<
      GallerySelector.FileDragStart | GallerySelector.FileDragOver | GallerySelector.FileDrop,
      Payload
    >
  | Command<GallerySelector.FileDragLeave, EmptyPayload>;

interface GalleryEvent<T> extends Event {
  detail: T;
}
