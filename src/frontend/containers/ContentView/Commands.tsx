import { action } from 'mobx';
import React from 'react';
import { useEffect } from 'react';
import { ClientFile } from 'src/entities/File';
import { ClientTag } from 'src/entities/Tag';
import { useContextMenu } from 'src/frontend/components/ContextMenu';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { DnDAttribute, DnDTagType, useTagDnD } from 'src/frontend/contexts/TagDnDContext';
import { RendererMessenger } from 'src/Messaging';
import { IconSet } from 'widgets/Icons';
import { Menu, MenuDivider, MenuSubItem } from 'widgets/menus';
import { LayoutMenuItems, SortMenuItems } from '../AppToolbar/Menus';
import {
  ExternalAppMenuItems,
  FileTagMenuItems,
  FileViewerMenuItems,
  MissingFileMenuItems,
  SlideFileViewerMenuItems,
} from './menu-items';

export class CommandDispatcher {
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
      selector: Selector.Select,
      payload: {
        file: this.file,
        selectAdditive: event.ctrlKey || event.metaKey,
        selectRange: event.shiftKey,
      },
    });
  }

  preview(event: BaseEvent) {
    event.stopPropagation();
    dispatchCustomEvent(event, {
      selector: Selector.Preview,
      payload: { file: this.file },
    });
  }

  showContextMenu(event: MousePointerEvent) {
    event.stopPropagation();
    event.preventDefault();
    dispatchCustomEvent(event, {
      selector: Selector.ContextMenu,
      payload: { file: this.file, x: event.clientX, y: event.clientY },
    });
  }

  showSlideContextMenu(event: MousePointerEvent) {
    event.stopPropagation();
    event.preventDefault();
    dispatchCustomEvent(event, {
      selector: Selector.SlideContextMenu,
      payload: { file: this.file, x: event.clientX, y: event.clientY },
    });
  }

  showTagContextMenu(event: MousePointerEvent, tag: ClientTag) {
    event.stopPropagation();
    event.preventDefault();
    dispatchCustomEvent(event, {
      selector: Selector.TagContextMenu,
      payload: { file: this.file, x: event.clientX, y: event.clientY, tag },
    });
  }

  dragStart(event: BaseEvent) {
    event.stopPropagation();
    event.preventDefault();
    dispatchCustomEvent(event, {
      selector: Selector.FileDragStart,
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
        selector: Selector.FileDragOver,
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
        selector: Selector.FileDragLeave,
        payload: { file: undefined },
      });
    }
  }

  drop(event: DataTransferEvent) {
    event.stopPropagation();
    dispatchCustomEvent(event, {
      selector: Selector.FileDrop,
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

export function useCommandHandler(
  select: (file: ClientFile, selectAdditive: boolean, selectRange: boolean) => void,
) {
  const dndData = useTagDnD();
  const { uiStore } = useStore();
  const show = useContextMenu();

  useEffect(() => {
    const showContextMenu = (
      x: number,
      y: number,
      fileMenu: JSX.Element,
      externalMenu: JSX.Element,
    ) => {
      show(
        x,
        y,
        <Menu>
          {fileMenu}
          <MenuDivider />
          <MenuSubItem icon={IconSet.VIEW_GRID} text="View method...">
            <LayoutMenuItems />
          </MenuSubItem>
          <MenuSubItem icon={IconSet.FILTER_NAME_DOWN} text="Sort by...">
            <SortMenuItems />
          </MenuSubItem>
          <MenuDivider />
          {externalMenu}
        </Menu>,
      );
    };

    const handleSelect = action((event: Event) => {
      event.stopPropagation();
      const { file, selectAdditive, selectRange } = (event as CommandHandlerEvent<SelectPayload>)
        .detail;
      select(file, selectAdditive, selectRange);
    });

    const handlePreview = action((event: Event) => {
      event.stopPropagation();
      const file = (event as CommandHandlerEvent<Payload>).detail.file;
      if (!file.isBroken) {
        uiStore.selectFile(file, true);
        uiStore.enableSlideMode();
      }
    });

    const handleContextMenu = action((event: Event) => {
      event.stopPropagation();
      const { file, x, y } = (event as CommandHandlerEvent<ContextMenuPayload>).detail;
      showContextMenu(
        x,
        y,
        file.isBroken ? <MissingFileMenuItems /> : <FileViewerMenuItems file={file} />,
        <ExternalAppMenuItems file={file} />,
      );
      if (!uiStore.fileSelection.has(file)) {
        // replace selection with context menu, like Windows file explorer
        select(file, false, false);
      }
    });

    const handleTagContextMenu = action((event: Event) => {
      event.stopPropagation();
      const { file, x, y, tag } = (event as CommandHandlerEvent<TagContextMenuPayload>).detail;
      showContextMenu(
        x,
        y,
        <>
          <FileTagMenuItems file={file} tag={tag} />
          <MenuDivider />
          {file.isBroken ? <MissingFileMenuItems /> : <FileViewerMenuItems file={file} />}
        </>,
        <ExternalAppMenuItems file={file} />,
      );
      if (!uiStore.fileSelection.has(file)) {
        // replace selection with context menu, like Windows file explorer
        select(file, false, false);
      }
    });

    const handleSlideContextMenu = action((event: Event) => {
      event.stopPropagation();
      const { file, x, y } = (event as CommandHandlerEvent<ContextMenuPayload>).detail;
      show(
        x,
        y,
        <Menu>
          {file.isBroken ? <MissingFileMenuItems /> : <SlideFileViewerMenuItems file={file} />}
          <MenuDivider />
          <ExternalAppMenuItems file={file} />
        </Menu>,
      );
      if (!uiStore.fileSelection.has(file)) {
        // replace selection with context menu, like Windows file explorer
        select(file, false, false);
      }
    });

    const handleDragStart = action((event: Event) => {
      event.stopPropagation();
      const file = (event as CommandHandlerEvent<Payload>).detail.file;
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
      const file = (event as CommandHandlerEvent<Payload>).detail.file;
      dndData.target = file;
    });

    const handleDragLeave = action((event: Event) => {
      event.stopPropagation();
      const file = (event as CommandHandlerEvent<EmptyPayload>).detail.file;
      dndData.target = file;
    });

    const handleDrop = action((event: Event) => {
      event.stopPropagation();
      if (dndData.source !== undefined) {
        const dropFile = (event as CommandHandlerEvent<Payload>).detail.file;
        const ctx = uiStore.getTagContextItems(dndData.source.id);

        // Tag all selected files - unless the file that is being tagged is not selected
        const filesToTag = uiStore.fileSelection.has(dropFile) ? uiStore.fileSelection : [dropFile];

        for (const tag of ctx) {
          for (const file of filesToTag) {
            file.addTag(tag);
          }
        }
      }
    });

    const el = window;
    el.addEventListener(Selector.Select, handleSelect, true);
    el.addEventListener(Selector.Preview, handlePreview, true);
    el.addEventListener(Selector.ContextMenu, handleContextMenu, true);
    el.addEventListener(Selector.TagContextMenu, handleTagContextMenu, true);
    el.addEventListener(Selector.SlideContextMenu, handleSlideContextMenu, true);
    el.addEventListener(Selector.FileDragStart, handleDragStart, true);
    el.addEventListener(Selector.FileDragOver, handleDragOver, true);
    el.addEventListener(Selector.FileDragLeave, handleDragLeave, true);
    el.addEventListener(Selector.FileDrop, handleDrop, true);

    return () => {
      el.removeEventListener(Selector.Select, handleSelect, true);
      el.removeEventListener(Selector.Preview, handlePreview, true);
      el.removeEventListener(Selector.ContextMenu, handleContextMenu, true);
      el.removeEventListener(Selector.TagContextMenu, handleTagContextMenu, true);
      el.removeEventListener(Selector.SlideContextMenu, handleSlideContextMenu, true);
      el.removeEventListener(Selector.FileDragStart, handleDragStart, true);
      el.removeEventListener(Selector.FileDragOver, handleDragOver, true);
      el.removeEventListener(Selector.FileDragLeave, handleDragLeave, true);
      el.removeEventListener(Selector.FileDrop, handleDrop, true);
    };
  }, [uiStore, dndData, select, show]);
}

/**
 * Event abstraction for native and synthetic React events
 */

export interface BaseEvent {
  currentTarget: EventTarget & HTMLElement;
  target: EventTarget;
  stopPropagation: () => void;
  preventDefault: () => void;
}

export interface DataTransferEvent extends BaseEvent {
  dataTransfer: DataTransfer;
}

export interface MousePointerEvent extends BaseEvent {
  clientX: number;
  clientY: number;
  ctrlKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}

// Better typing in event handlers
interface CommandHandlerEvent<T> extends Event {
  detail: T;
}

type ContentViewCommand =
  | Command<Selector.Select, SelectPayload>
  | Command<Selector.Preview, Payload>
  // Contextmenu
  | Command<Selector.ContextMenu | Selector.SlideContextMenu, ContextMenuPayload>
  | Command<Selector.TagContextMenu, TagContextMenuPayload>
  // Drag and Drop
  | Command<Selector.FileDragStart | Selector.FileDragOver | Selector.FileDrop, Payload>
  | Command<Selector.FileDragLeave, EmptyPayload>;

interface Command<S extends string, T> {
  selector: S;
  payload: T;
}

const enum Selector {
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

function dispatchCustomEvent<E extends BaseEvent>(event: E, command: ContentViewCommand) {
  event.currentTarget.dispatchEvent(new CustomEvent(command.selector, { detail: command.payload }));
}
