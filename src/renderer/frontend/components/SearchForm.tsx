import React, { useCallback, useContext } from 'react';
import { observer } from 'mobx-react-lite';

import MultiTagSelector from './MultiTagSelector';
import { FormGroup, InputGroup, Button } from '@blueprintjs/core';
import StoreContext from '../contexts/StoreContext';
import { ClientTag } from '../../entities/Tag';
import { ITagSearchQuery } from '../stores/UiStore';

const SearchForm = () => {

  const { uiStore, tagStore } = useContext(StoreContext);

  // Todo: refactor later (when search has been properly implemented in backend)
  const query = (uiStore.searchQueryList[0] as ITagSearchQuery);
  const includedTags = query.value;

  const handleIncludeTag = useCallback((tag: ClientTag) => includedTags.push(tag.id), []);
  const handleExcludeTag = useCallback((tag: ClientTag) => includedTags.splice(tagStore.tagList.indexOf(tag), 1), []);
  const handleClearIncludedTags = useCallback(() => includedTags.splice(0, includedTags.length), []);
  return (
    <div id="search-form">
      {/* Tags */}
      <FormGroup label="Tags" >
        {/* Todo: Also search through collections */}
        <MultiTagSelector
          selectedTags={includedTags.map((id) => tagStore.tagList.find((t) => t.id === id) as ClientTag)}
          onTagSelect={handleIncludeTag}
          onTagDeselect={handleExcludeTag}
          onClearSelection={handleClearIncludedTags}
          placeholder="Include"
          autoFocus
        />
        <MultiTagSelector
          selectedTags={[]}
          onTagSelect={() => console.log('select')}
          onTagDeselect={() => console.log('deselect')}
          onClearSelection={() => console.log('clear')}
          placeholder="Exclude (future feature)"
        />
      </FormGroup>

      {/* Filenames */}
      <FormGroup label="Filename">
        <InputGroup placeholder="Include" disabled />
        <InputGroup placeholder="Exclude" disabled />
      </FormGroup>

      {/* Location */}
      <FormGroup label="Location">
        <InputGroup placeholder="Include" disabled />
        <InputGroup placeholder="Exclude" disabled />
      </FormGroup>

      {/* File type */}
      <FormGroup label="File type" labelFor="file-type-input">
        <InputGroup placeholder="Include" disabled />
        <InputGroup placeholder="Exclude" disabled />
      </FormGroup>

      <Button fill disabled>Reset</Button>
    </div>
  );
};

export default observer(SearchForm);
