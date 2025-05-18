import React, { useReducer } from 'react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '../contexts/StoreContext';

import { Menu, MenuButton, useContextMenu } from 'widgets/menus';
import { ClientScore } from '../entities/Score';
import { FileScoreMenuItems } from '../containers/ContentView/menu-items';
import { useAutorun, useComputed } from '../hooks/mobx';
import { ScoreSelector } from './ScoreSelector';
import { ClientFile } from '../entities/File';
import { IComputedValue, runInAction } from 'mobx';
import { IconSet } from 'widgets/icons';
import { ScoreOverwrite, ScoreRemoval, ScoreUnAssign } from './RemovalAlert';
import { debounce } from 'common/timeout';
import { FloatingPanel } from '../containers/AppToolbar/FileTagEditor';
import { ToolbarButton } from 'widgets/toolbar';
import { IAction } from '../containers/types';
import { ID } from 'src/api/id';
import { useGalleryInputKeydownHandler } from '../hooks/useHandleInputKeydown';

export const FloatingScoreEditor = observer(() => {
  const { uiStore } = useStore();
  return (
    <>
      <ToolbarButton
        icon={IconSet.META_INFO}
        //disabled={uiStore.fileSelection.size === 0 && !uiStore.isScorePopoverOpen}
        onClick={uiStore.toggleScorePopover}
        text="Score selected files"
        tooltip="Add or remove scores from selected images"
      />
      <FloatingPanel
        title="Score Editor"
        dataOpen={uiStore.isScorePopoverOpen}
        onBlur={uiStore.closeScorePopover}
      >
        <ScoreEditor />
      </FloatingPanel>
    </>
  );
});

const ScoreEditor = observer(({ file }: { file?: ClientFile }) => {
  const { uiStore, fileStore } = useStore();
  const [deletableScore, setDeletableScore] = useState<ClientScore>();
  const [removableScore, setRemovableScore] = useState<{
    files: ClientFile[];
    score: ClientScore;
  }>();
  const [assignableScoreValue, setAssignableScoreValue] = useState<{
    files: ClientFile[];
    score: ClientScore;
    value: number;
  }>();
  const [editorState, dispatch] = useReducer(reducer, {
    editableNode: undefined,
  });

  useEffect(() => {
    runInAction(() => {
      if (file && uiStore.fileSelection.size < 1) {
        uiStore.selectFile(file);
      }
    });
  }, [file, uiStore]);

  const counter = useComputed(() => {
    //Map of Clientstores: and a tuple of count, value
    const counter = new Map<ClientScore, [number, number | undefined]>();
    const isMultiple = uiStore.fileSelection.size > 1;
    for (const file of uiStore.fileSelection) {
      for (const [clientScore, value] of file.scores) {
        const entry = counter.get(clientScore) ?? [0, undefined];
        const [count] = entry;
        //update count and if count is bigger than one element set undefined value
        counter.set(clientScore, [count + 1, isMultiple ? undefined : value]);
      }
    }
    return counter;
  });

  const files = Array.from(uiStore.fileSelection);
  const onSelect = useCallback(
    (score: ClientScore) => {
      files.forEach((f) => f.setScore(score));
    },
    [files],
  );
  const onUpdate = useCallback(
    (score: ClientScore, value: number) => {
      setAssignableScoreValue({ files: files, score: score, value: value });
    },
    [files],
  );
  const onRemove = useCallback(
    (score: ClientScore) => {
      setRemovableScore({ files: files, score: score });
    },
    [files],
  );
  const onRename = useCallback(
    (score: ClientScore) =>
      runInAction(() => {
        let found = 0;
        if (files.length > 0) {
          for (const file of files) {
            if (file.scores.has(score)) {
              found = 1;
              break;
            }
          }
        }
        if (found === 0) {
          for (const file of fileStore.fileList) {
            if (file && file.scores.has(score)) {
              found = 2;
              uiStore.selectFile(file);
              break;
            }
          }
        }
        if (found === 0) {
          const firstfile = uiStore.firstFileInView;
          if (firstfile) {
            uiStore.selectFile(firstfile);
            firstfile.setScore(score, -1);
          }
        }
        dispatch(Factory.enableEditing(score.id));
      }),
    [fileStore.fileList, files, uiStore],
  );

  const scoreSelectorButton = useId();
  const scoreSelectorButtonMenuID = useId();
  const handleTagContextMenu = ScoreContextMenu({
    parentPopoverId: scoreSelectorButtonMenuID,
    onDeleteScore: setDeletableScore,
    onRemoveScore: onRemove,
    onRenameScore: onRename,
  });

  // Autofocus
  const buttonParentRef = useRef<HTMLDivElement>(null);
  useAutorun(() => {
    if (uiStore.isScorePopoverOpen) {
      requestAnimationFrame(() => requestAnimationFrame(() => buttonParentRef.current?.focus()));
    }
  });

  return (
    <div className="score-editor">
      {deletableScore && (
        <ScoreRemoval object={deletableScore} onClose={() => setDeletableScore(undefined)} />
      )}
      {removableScore && (
        <ScoreUnAssign object={removableScore} onClose={() => setRemovableScore(undefined)} />
      )}
      {assignableScoreValue && (
        <ScoreOverwrite
          object={assignableScoreValue}
          onClose={() => setAssignableScoreValue(undefined)}
        />
      )}
      <div tabIndex={-1} ref={buttonParentRef}>
        <MenuButton
          icon={IconSet.PLUS}
          text={'Add score to file'}
          id={scoreSelectorButton}
          menuID={scoreSelectorButtonMenuID}
          placement="left-start"
          updateDependency={file}
        >
          <ScoreSelector
            counter={counter}
            onSelect={onSelect}
            onContextMenu={handleTagContextMenu}
          />
        </MenuButton>
      </div>
      {uiStore.fileSelection.size === 0 && (
        <div><i><b>No files selected</b></i></div> // eslint-disable-line prettier/prettier
      )}
      <ScoreListEditor
        editorState={editorState}
        dispatch={dispatch}
        counter={counter}
        onUpdate={onUpdate}
        onContextMenu={handleTagContextMenu}
      />
    </div>
  );
});

export default ScoreEditor;

interface IScoreContextMenu {
  parentPopoverId: string;
  onDeleteScore: (score: ClientScore) => void;
  onRemoveScore: (score: ClientScore) => void;
  onRenameScore: (score: ClientScore) => void;
}

const ScoreContextMenu = ({
  parentPopoverId,
  onDeleteScore,
  onRemoveScore,
  onRenameScore,
}: IScoreContextMenu) => {
  const getFocusableElement = useCallback(() => {
    return document
      .getElementById(parentPopoverId)
      ?.querySelector('input, textarea, button, a, select, [tabindex]') as HTMLElement | null;
  }, [parentPopoverId]);
  const handleMenuBlur = useCallback(
    (e: React.FocusEvent) => {
      if (!e.relatedTarget?.closest('[data-popover="true"]')) {
        const element = getFocusableElement();
        if (element && element instanceof HTMLElement) {
          element.focus();
          element.blur();
        }
      }
    },
    [getFocusableElement],
  );
  const handleMenuKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        const element = getFocusableElement();
        e.stopPropagation();
        if (element && element instanceof HTMLElement) {
          element.focus();
          element.blur();
        }
      }
    },
    [getFocusableElement],
  );
  const handleOnRemove = useCallback(
    (score: ClientScore) => {
      onRemoveScore(score);
      const element = getFocusableElement();
      if (element && element instanceof HTMLElement) {
        element.focus();
      }
    },
    [getFocusableElement, onRemoveScore],
  );
  const handleOnRename = useCallback(
    (score: ClientScore) => {
      const element = getFocusableElement();
      if (element && element instanceof HTMLElement) {
        element.focus();
      }
      onRenameScore(score);
    },
    [getFocusableElement, onRenameScore],
  );
  const handleOnDelete = useCallback(
    (score: ClientScore) => {
      onDeleteScore(score);
      const element = getFocusableElement();
      if (element && element instanceof HTMLElement) {
        element.focus();
      }
    },
    [getFocusableElement, onDeleteScore],
  );
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const divRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (activeMenuId && divRef.current) {
      divRef.current.focus();
    }
  }, [activeMenuId]);

  const show = useContextMenu();
  const handleTagContextMenu = useCallback(
    (event: React.MouseEvent<HTMLElement>, score: ClientScore) => {
      event.stopPropagation();
      show(
        event.clientX,
        event.clientY,
        <div ref={divRef} onBlur={handleMenuBlur} onKeyDown={handleMenuKeyDown} tabIndex={-1}>
          <Menu>
            <FileScoreMenuItems
              score={score}
              onDelete={handleOnDelete}
              onRemove={handleOnRemove}
              onRename={handleOnRename}
            />
          </Menu>
        </div>,
      );
      setActiveMenuId(score.id);
    },
    [show, handleMenuBlur, handleMenuKeyDown, handleOnDelete, handleOnRemove, handleOnRename],
  );

  return handleTagContextMenu;
};

const compareByScoreName = (
  a: [ClientScore, [number, number | undefined]],
  b: [ClientScore, [number, number | undefined]],
) => {
  return a[0].name.localeCompare(b[0].name);
};

interface ScoreListEditorProps {
  editorState: State;
  dispatch: React.Dispatch<Action>;
  counter: IComputedValue<Map<ClientScore, [number, number | undefined]>>;
  onUpdate: (score: ClientScore, value: number) => void;
  onContextMenu?: (e: React.MouseEvent<HTMLElement>, score: ClientScore) => void;
}

const ScoreListEditor = observer(
  ({ editorState, dispatch, counter, onUpdate, onContextMenu }: ScoreListEditorProps) => {
    const { uiStore } = useStore();
    const scores = Array.from(counter.get()).sort(compareByScoreName);
    const SelectionSize = uiStore.fileSelection.size;
    const handleKeyDown = useGalleryInputKeydownHandler();
    const handleRename = useCallback(
      (score: ClientScore) => dispatch(Factory.enableEditing(score.id)),
      [dispatch],
    );
    const onUpdateName = useRef(() => {
      dispatch(Factory.disableEditing());
    }).current;
    return (
      <div className="score-list-editor">
        {scores.map(([score, [count, val]]) => (
          <ScoreListOption
            key={score.id}
            score={score}
            count={SelectionSize > 1 ? `${count}/${SelectionSize}` : ''}
            value={val}
            onUpdate={onUpdate}
            isEditingName={editorState.editableNode === score.id}
            onUpdateName={onUpdateName}
            handleRename={handleRename}
            onContextMenu={onContextMenu}
            handleKeyDown={handleKeyDown}
          />
        ))}
      </div>
    );
  },
);

interface IScoreListOptionProps {
  score: ClientScore;
  count: string | number;
  value?: number;
  isEditingName: boolean;
  onUpdate: (score: ClientScore, value: number) => void;
  onUpdateName: (target: EventTarget & HTMLInputElement) => void;
  handleRename: (score: ClientScore) => void;
  onContextMenu?: (e: React.MouseEvent<HTMLElement>, score: ClientScore) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const ScoreListOption = observer(
  ({
    score,
    count,
    value,
    onUpdate,
    isEditingName,
    onUpdateName,
    handleRename,
    onContextMenu,
    handleKeyDown,
  }: IScoreListOptionProps) => {
    const [inputValue, setInputValue] = useState(value !== undefined ? value : '');

    useEffect(() => {
      setInputValue(value !== undefined ? value : '');
    }, [value]);

    const debounceOnUpdate = useMemo(() => debounce(onUpdate, 500), [onUpdate]);

    const handleValueOnChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const eValue = e.target.value;
        //only accept number values and ignore anything else
        if (/^\d*\.?\d*$/.test(eValue)) {
          const newValue = eValue === '' ? 0 : parseFloat(eValue);
          if (newValue < 100000000) {
            setInputValue(newValue);
            debounceOnUpdate(score, newValue);
          }
        }
      },
      [debounceOnUpdate, score],
    );
    return (
      <div
        className="score-list-option"
        onContextMenu={onContextMenu !== undefined ? (e) => onContextMenu(e, score) : undefined}
      >
        <div className="score-name">
          <div className="label-container" onDoubleClick={() => handleRename(score)}>
            <Label
              text={score.name}
              setText={score.rename}
              isEditing={isEditingName}
              onSubmit={onUpdateName}
              tooltip={score.name}
            />
            <div className="count-hint">{count}</div>
          </div>
        </div>
        <div className="score-value">
          <input
            type="number"
            data-tooltip={inputValue}
            title={inputValue.toString()}
            value={inputValue}
            onChange={handleValueOnChange}
            onKeyDown={handleKeyDown}
            className={'input'}
          />
        </div>
      </div>
    );
  },
);

interface ILabelProps {
  text: string;
  setText: (value: string) => void;
  isEditing: boolean;
  onSubmit: (target: EventTarget & HTMLInputElement) => void;
  tooltip?: string;
}

const Label = (props: ILabelProps) =>
  props.isEditing ? (
    <input
      className="input"
      autoFocus
      type="text"
      defaultValue={props.text}
      onBlur={(e) => {
        const value = e.currentTarget.value.trim();
        if (value.length > 0) {
          props.setText(value);
        }
        props.onSubmit(e.currentTarget);
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        const value = e.currentTarget.value.trim();
        if (e.key === 'Enter' && value.length > 0) {
          props.setText(value);
          props.onSubmit(e.currentTarget);
        } else if (e.key === 'Escape') {
          props.onSubmit(e.currentTarget); // cancel with escape
        }
      }}
      onFocus={(e) => e.target.select()}
      onClick={(e) => e.stopPropagation()}
    />
  ) : (
    <div className="score-label" data-tooltip={props.tooltip}>
      {props.text}
    </div>
  );

const enum Flag {
  EnableEditing,
  DisableEditing,
}

type Action = IAction<Flag.EnableEditing, ID> | IAction<Flag.DisableEditing, undefined>;

const Factory = {
  enableEditing: (data: ID): Action => ({
    flag: Flag.EnableEditing,
    data,
  }),
  disableEditing: (): Action => ({
    flag: Flag.DisableEditing,
    data: undefined,
  }),
};

type State = {
  editableNode: ID | undefined;
};

export function reducer(state: State, action: Action): State {
  switch (action.flag) {
    case Flag.EnableEditing:
      return {
        ...state,
        editableNode: action.data,
      };

    case Flag.DisableEditing:
      return {
        ...state,
        editableNode: action.data,
      };

    default:
      return state;
  }
}
