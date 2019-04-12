import React, { useCallback, useContext } from 'react';
import { observer } from 'mobx-react-lite';

import MultiTagSelector from './MultiTagSelector';
import { FormGroup, InputGroup, Button } from '@blueprintjs/core';
import StoreContext from '../contexts/StoreContext';
import { ClientTag } from '../../entities/Tag';

const SearchForm = () => {

  const { uiStore } = useContext(StoreContext);

  const handleIncludeTag = useCallback((tag: ClientTag) => uiStore.selectTag(tag), []);
  const handleExcludeTag = useCallback((tag: ClientTag) => uiStore.deselectTag(tag), []);
  const handleClearIncludedTags = useCallback(() => uiStore.clearTagSelection(), []);

  return (
    <div id="search-form">
      {/* Tags */}
      <FormGroup label="Tags" >
        {/* Todo: Also search through collections */}
        <MultiTagSelector
          selectedTags={uiStore.clientTagSelection}
          onTagSelect={handleIncludeTag}
          onTagDeselect={handleExcludeTag}
          onClearSelection={handleClearIncludedTags}
          placeholder="Include"
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
