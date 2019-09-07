import React, { useCallback, useContext } from 'react';
import { observer } from 'mobx-react-lite';

import MultiTagSelector from '../../components/MultiTagSelector';
import { FormGroup, Button, ButtonGroup } from '@blueprintjs/core';
import StoreContext from '../../contexts/StoreContext';
import { ClientTag } from '../../../entities/Tag';
import { ITagSearchQuery } from '../../stores/UiStore';
import IconSet from '../../components/Icons';

const SearchForm = () => {
  const { uiStore, tagStore } = useContext(StoreContext);

  const existingQueryFields = uiStore.searchQueryList.map((q, qIndex) => {
    // Todo: fix this later
    const includedTags = (q as ITagSearchQuery).value;

    const handleIncludeTag = (tag: ClientTag) => includedTags.push(tag.id);
    const handleExcludeTag = (tag: ClientTag) => includedTags.splice(tagStore.tagList.indexOf(tag), 1);
    const handleClearIncludedTags = () => includedTags.splice(0, includedTags.length);

    return (
      <MultiTagSelector
        key={`query-field-${qIndex}`}
        selectedTags={includedTags.map((id) => tagStore.getTag(id) as ClientTag)}
        onTagSelect={handleIncludeTag}
        onTagDeselect={handleExcludeTag}
        onClearSelection={handleClearIncludedTags}
        placeholder="Include"
        autoFocus
      />
    );
  });

  const addSearchQuery = useCallback(
    () => uiStore.addSearchQuery({ action: 'include', operator: 'or', value: [] } as ITagSearchQuery),
    []);

  return (
    <div id="search-form">
      <FormGroup label="Query">
        {existingQueryFields}
      </FormGroup>

      {/*
        <FormGroup label="Tags" >
          // Todo: Also search through collections
          <MultiTagSelector
            selectedTags={[]}
            onTagSelect={() => console.log('select')}
            onTagDeselect={() => console.log('deselect')}
            onClearSelection={() => console.log('clear')}
            placeholder="Include (WIP)"
          />
          <MultiTagSelector
            selectedTags={[]}
            onTagSelect={() => console.log('select')}
            onTagDeselect={() => console.log('deselect')}
            onClearSelection={() => console.log('clear')}
            placeholder="Exclude (WIP)"
          />
        </FormGroup>

        <FormGroup label="Filename">
          <InputGroup placeholder="Include" disabled />
          <InputGroup placeholder="Exclude" disabled />
        </FormGroup>

        <FormGroup label="Location">
          <InputGroup placeholder="Include" disabled />
          <InputGroup placeholder="Exclude" disabled />
        </FormGroup>

        <FormGroup label="File type" labelFor="file-type-input">
          <InputGroup placeholder="Include" disabled />
          <InputGroup placeholder="Exclude" disabled />
        </FormGroup>
        */}

        <Button icon={IconSet.ADD} onClick={addSearchQuery} fill text="Query"/>
        <ButtonGroup vertical fill>
        <Button
          intent="primary"
          onClick={uiStore.viewContentQuery}
          disabled={uiStore.searchQueryList.length === 0}
          text="Search"
          icon={IconSet.SEARCH}
          fill
        />
        <Button
          // intent="warning"
          onClick={uiStore.clearSearchQueryList}
          disabled={uiStore.searchQueryList.length === 0}
          text="Reset"
          icon={IconSet.CLOSE}
          fill
        />
      </ButtonGroup>
    </div>
  );
};

export default observer(SearchForm);
