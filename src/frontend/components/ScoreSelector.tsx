import React, {
  ForwardedRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ClientScore } from '../entities/Score';
import { Grid, GridCell, Row, RowSeparator, useGridFocus } from 'widgets/combobox/Grid';
import { observer } from 'mobx-react-lite';
import { useStore } from '../contexts/StoreContext';
import { computed, IComputedValue, runInAction } from 'mobx';
import { IconSet } from 'widgets/icons';
import { debounce } from 'common/timeout';
import { useGalleryInputKeydownHandler } from '../hooks/useHandleInputKeydown';

interface IScoreSelectorProps {
  counter?: IComputedValue<Map<ClientScore, [number, number | undefined]>>;
  onSelect: (item: ClientScore) => void;
  disabled?: boolean;
  onContextMenu?: (e: React.MouseEvent<HTMLElement>, score: ClientScore) => void;
}

export const ScoreSelector = (props: IScoreSelectorProps) => {
  const gridId = useId();
  const tagSelectorID = useId();
  const { counter, onSelect, onContextMenu } = props;
  const [inputText, setInputText] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  const handleInput = useRef((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
  }).current;

  const gridRef = useRef<HTMLDivElement>(null);
  const [activeDescendant, handleGridFocus] = useGridFocus(gridRef);

  const resetTextBox = useRef(() => {
    setInputText('');
    inputRef.current?.focus();
  }).current;

  const baseHandleKeyDown = useGalleryInputKeydownHandler();
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setInputText('');
      } else {
        baseHandleKeyDown(e);
      }
      handleGridFocus(e);
    },
    [baseHandleKeyDown, handleGridFocus],
  );

  const handleBlur = useRef((e: React.FocusEvent<HTMLDivElement>) => {
    // If anything is blurred, and the new focus is not the input nor the flyout, close the flyout
    const isFocusingOption =
      e.relatedTarget instanceof HTMLElement && e.relatedTarget.matches('div[role="row"]');
    if (isFocusingOption || e.relatedTarget === inputRef.current) {
      return;
    }
    setInputText('');
  }).current;

  const handleBackgroundClick = useCallback(() => inputRef.current?.focus(), []);

  // Remember the height when panel is resized
  const panelRef = useRef<HTMLDivElement>(null);
  const [storedHeight] = useState(localStorage.getItem('score-selector-height'));
  useEffect(() => {
    if (!panelRef.current) {
      return;
    }
    const storeHeight = debounce((val: string) =>
      localStorage.setItem('score-selector-height', val),
    );
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type == 'attributes' &&
          mutation.attributeName === 'style' &&
          panelRef.current
        ) {
          storeHeight(panelRef.current.style.height);
        }
      });
    });
    observer.observe(panelRef.current, { attributes: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={panelRef}
      id={tagSelectorID}
      role="combobox"
      className="score-selector-pane"
      aria-expanded="true"
      aria-haspopup="grid"
      aria-owns={gridId}
      style={{ height: storedHeight ?? undefined }}
      onClick={handleBackgroundClick}
      onBlur={handleBlur}
    >
      <input
        //disabled={disabled}
        role="menuitem"
        type="text"
        className={'input'}
        spellCheck={false}
        value={inputText}
        aria-autocomplete="list"
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        aria-controls={gridId}
        aria-activedescendant={activeDescendant}
        ref={inputRef}
      />
      <ScoreList
        counter={counter}
        ref={gridRef}
        id={gridId}
        inputText={inputText}
        resetTextBox={resetTextBox}
        onSelect={onSelect}
        onContextMenu={onContextMenu}
      />
    </div>
  );
};

interface ScoreListProps {
  id: string;
  counter?: IComputedValue<Map<ClientScore, [number, number | undefined]>>;
  inputText: string;
  resetTextBox: () => void;
  onSelect: (score: ClientScore) => void;
  onContextMenu?: (e: React.MouseEvent<HTMLElement>, score: ClientScore) => void;
}

const ScoreList = observer(
  React.forwardRef(function MatchingTagsList(
    { id, counter, inputText, resetTextBox, onSelect, onContextMenu }: ScoreListProps,
    ref: ForwardedRef<HTMLDivElement>,
  ) {
    const { scoreStore } = useStore();

    const matches = useMemo(
      () =>
        computed(() => {
          if (inputText.length === 0) {
            return scoreStore.scoreList;
          } else {
            const textLower = inputText.toLowerCase();
            return scoreStore.scoreList.filter((t) => t.name.toLowerCase().includes(textLower));
          }
        }),
      [inputText, scoreStore],
    ).get();

    return (
      <Grid ref={ref} id={id} multiselectable>
        {matches.map((score) => {
          const selected = counter !== undefined ? (counter.get().get(score)?.[0] ?? 0) > 0 : false;
          const scoreCount = counter?.get()?.get(score)?.[0] ?? 0;
          const hint = scoreCount > 1 ? scoreCount.toString() : '';
          return (
            <ScoreOption
              key={score.id}
              id={`${id}-${score.id}`}
              score={score}
              hint={hint}
              selected={selected}
              onSelect={onSelect}
              resetTextBox={resetTextBox}
              onContextMenu={onContextMenu}
            />
          );
        })}
        <CreateOption
          inputText={inputText}
          hasMatches={matches.length > 0}
          resetTextBox={resetTextBox}
        />
      </Grid>
    );
  }),
);

interface ScoreOptionProps {
  id?: string;
  score: ClientScore;
  hint?: string;
  selected?: boolean;
  onSelect: (score: ClientScore) => void;
  resetTextBox?: () => void;
  onContextMenu?: (e: React.MouseEvent<HTMLElement>, score: ClientScore) => void;
}

export const ScoreOption = observer(
  ({ id, score, hint, selected, onSelect, resetTextBox, onContextMenu }: ScoreOptionProps) => {
    const onclick = useCallback(() => {
      onSelect(score);
      resetTextBox?.();
    }, [onSelect, resetTextBox, score]);
    return (
      <Row
        id={id}
        value={score.name}
        selected={selected}
        icon={<span>{IconSet.SMALL_ARROW_RIGHT}</span>}
        onClick={onclick}
        tooltip={score.name}
        onContextMenu={onContextMenu !== undefined ? (e) => onContextMenu(e, score) : undefined}
        valueIsHtml
      >
        {hint !== undefined && hint.length > 0 ? (
          <GridCell className="tag-option-hint" __html={hint}></GridCell>
        ) : (
          <GridCell />
        )}
      </Row>
    );
  },
);

interface CreateOptionProps {
  inputText: string;
  hasMatches: boolean;
  resetTextBox: () => void;
}

const CreateOption = ({ inputText, hasMatches, resetTextBox }: CreateOptionProps) => {
  const { scoreStore, uiStore } = useStore();

  const createScore = useCallback(async () => {
    const newScore = await scoreStore.createScore(inputText);
    runInAction(() => uiStore.fileSelection.forEach((f) => f.setScore(newScore)));
    resetTextBox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputText, resetTextBox]);

  if (inputText.length === 0) {
    return null;
  }

  return (
    <>
      {hasMatches && <RowSeparator />}
      <Row
        id="score-create-option"
        selected={false}
        value={`Create Score "${inputText}"`}
        onClick={createScore}
        icon={IconSet.PLUS}
      />
    </>
  );
};
