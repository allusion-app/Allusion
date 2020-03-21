/* eslint-disable react/display-name */
import React, { useMemo, useContext, ReactNode, useEffect, useCallback, useState } from 'react';
import StoreContext from '../contexts/StoreContext';
import path from 'path';
import { ClientLocation } from '../../entities/Location';
import { formatDateTime, throttle } from '../utils';
import { Button, Tag, H4 } from '@blueprintjs/core';
import { ClientFile } from '../../entities/File';
import useSelectionCursor from '../hooks/useSelectionCursor';
import { IIdentifiable } from '../../entities/ID';

interface IColumn<T> {
  label: string;
  value: (item: T) => string | ReactNode;
  onClick?: () => void;
}

interface ITableProps<T> {
  columns: IColumn<T>[];
  items: T[];
}

function Table<T extends IIdentifiable>({ columns, items }: ITableProps<T>) {

  const [selection, setSelection] = useState<string[]>([]);
  const { makeSelection, lastSelectionIndex } = useSelectionCursor();

  const handleFileSelect = useCallback(
    (selectedIndex: number, selectAdditive: boolean, selectRange: boolean) => {
      const selectedId = items[selectedIndex].id;
      const isSelected = selection.includes(selectedId);
      const isSingleSelected = isSelected && selection.length === 1;

      const newSelectionIndices = makeSelection(selectedIndex, selectRange);
      const newSelection: string[] = [];
      if (selectAdditive) {
        newSelection.push(...selection);
      }
      if (selectRange) {
        newSelection.push(...newSelectionIndices.map((i) => items[i].id));
      } else {
        // Only select this file. If this is the only selected file, deselect it
        if (isSingleSelected) {
          newSelection.splice(selectedIndex, 1);
        } else {
          newSelection.push(selectedId);
        }
      }
      setSelection(newSelection);
    },
    [items, makeSelection, selection],
  );

  const handleRowClick = useCallback((e: React.MouseEvent<HTMLTableRowElement>) => {
    const i = parseInt(e?.currentTarget?.id);
    handleFileSelect(i, e.ctrlKey || e.metaKey, e.shiftKey);
  }, [handleFileSelect]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      let index = lastSelectionIndex.current;
      if (index === undefined) return;
      if (e.key === 'ArrowUp' && index > 0) {
        index -= 1;
      } else if (e.key === 'ArrowDown' && index < items.length - 1) {
        index += 1;
      } else {
        return;
      }
      handleFileSelect(index, e.ctrlKey || e.metaKey, e.shiftKey);
    };

    const throttledKeyDown = throttle(onKeyDown, 50);

    window.addEventListener('keydown', throttledKeyDown);
    return () => window.removeEventListener('keydown', throttledKeyDown);
  }, [handleFileSelect, lastSelectionIndex, items]);

  return (
    <table style={{ width: '100%' }}>
      <thead>
        <tr>
          {columns.map((col) => (
            <th
              key={`header-${col.label}`}
              onClick={col.onClick}
              style={{ cursor: col.onClick ? 'pointer' : undefined }}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => (
          <tr
            key={`item-${i}`}
            id={i.toString()}
            onClick={handleRowClick}
            style={{backgroundColor: selection.includes(item.id) ? 'blue' : undefined }}
          >
            {columns.map((col) => (
              <td key={col.label}>{col.value(item)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const Recovery = () => {
  const { fileStore, locationStore, uiStore } = useContext(StoreContext);

  const locationColums: IColumn<ClientLocation>[] = useMemo(() => [
    { label: 'Name', value: (loc) => path.basename(loc.path) },
    { label: 'Path', value: (loc) => loc.path },
    { label: 'Date added', value: (loc) => formatDateTime(loc.dateAdded) },
    { label: 'Resolve', value: () => <>
        <Button intent="warning" icon="cross">Discard</Button>
        <Button intent="primary" icon="folder-open">Relocate</Button>
      </>
     },
  ], []);

  const fileColums: IColumn<ClientFile>[] = useMemo(() => [
    { label: 'Thumbnail', value: (f) => <img src={f.thumbnailPath} width="64" alt="?" />},
    {
      label: 'Name',
      value: (f) => <span data-right={f.path} className="tooltip">{f.name}</span>,
      onClick: () => uiStore.view.orderBy === 'name' ? uiStore.switchFileOrder() : uiStore.orderFilesBy('name')
    },
    { label: 'Type', value: (f) => f.extension.toUpperCase() },
    {
      label: 'Date modified',
      value: (loc) => formatDateTime(loc.dateModified),
      onClick: () => uiStore.view.orderBy === 'dateModified' ? uiStore.switchFileOrder() : uiStore.orderFilesBy('dateModified')
    },
    {
      label: 'Date added',
      value: (loc) => formatDateTime(loc.dateAdded),
      onClick: () => uiStore.view.orderBy === 'dateAdded' ? uiStore.switchFileOrder() : uiStore.orderFilesBy('dateAdded')
    },
    {
      label: 'Tags',
      value: (f) => f.tags.length ? f.clientTags.map((t) => <Tag key={t.id}>{t.name}</Tag>) : <i>None</i>
    },
  ], [uiStore]);

  const brokenLocations = locationStore.locationList.filter((l) => l.isBroken);

  // const locationsWithBrokenImages = locationStore.locationList
  //   // if the entire location is broken, should not be part of this as well
  //   .filter((l) => !brokenLocations.includes(l))
  //   // .filter((l) => l.)

  // fileStore.fileList.filter((f) => f)

  // Find list of all unique basePaths for missing folders
  const missingSubDirs = useMemo(() => {
    const uniqueDirCount: { [path: string]: number } = {};
    fileStore.fileList.forEach((f) => {
      const dirname = path.dirname(f.path);
      uniqueDirCount[dirname] = (uniqueDirCount[dirname] || 0) + 1;
    });
   return Object.keys(uniqueDirCount)
    .map((dir) => ({ path: dir, count: uniqueDirCount[dir] }))
    .sort((dir1, dir2) => dir2.count - dir1.count);
  }, [fileStore.fileList]);

  return (
    <div>
      <div style={{width: '100%', padding: '4px', backgroundColor: '#333333' }}>
        <H4>Locations: {brokenLocations.length}</H4>
      </div>
      {brokenLocations.length === 0
        ? <span>All good!</span>
        : <Table columns={locationColums} items={brokenLocations} />
      }

      <br />
      <div style={{width: '100%', padding: '4px', backgroundColor: '#333333' }}>
        <H4>Subfolders: {missingSubDirs.length}</H4>
      </div>
      {missingSubDirs.length === 0
        ? <span>All good!</span>
        : <ul>
            {missingSubDirs.map((l) => (
              <li key={l.path}>{l.path}: {l.count}</li>
            ))}
          </ul>
      }

      <br />

      <div style={{width: '100%', padding: '4px', backgroundColor: '#333333' }}>
        <H4>Files: {fileStore.fileList.length}</H4>
      </div>
      {fileStore.fileList.length === 0
        ? <span>All good!</span>
        : <Table columns={fileColums} items={fileStore.fileList} />
      }
    </div>
  )
};

export default Recovery;
