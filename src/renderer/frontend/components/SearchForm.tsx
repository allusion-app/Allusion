import React from 'react';
import { observer } from 'mobx-react-lite';

import MultiTagSelector from './MultiTagSelector';
import { FormGroup, InputGroup, Button } from '@blueprintjs/core';

const SearchForm = () => {
  return (
    <>
      {/* Tags */}
      <FormGroup label="Tags" >
        {/* Todo: Also search through collections */}
        <MultiTagSelector
          selectedTags={[]}
          onTagSelect={() => console.log('select')}
          onTagDeselect={() => console.log('deselect')}
          onClearSelection={() => console.log('clear')}
        />
        <MultiTagSelector
          selectedTags={[]}
          onTagSelect={() => console.log('select')}
          onTagDeselect={() => console.log('deselect')}
          onClearSelection={() => console.log('clear')}
        />
      </FormGroup>

      {/* Filenames */}
      <FormGroup label="Filename">
        <InputGroup placeholder="Include" />
        <InputGroup placeholder="Exclude" />
      </FormGroup>

      {/* Location */}
      <FormGroup label="Location" >
        <InputGroup placeholder="Include" />
        <InputGroup placeholder="Exclude" />
      </FormGroup>

      {/* File type */}
      <FormGroup label="File type" labelFor="file-type-input">
        <InputGroup id="file-type-input" placeholder="Include" />
        <InputGroup id="file-type-input" placeholder="Exclude" />
      </FormGroup>

      <Button fill disabled>Reset</Button>
    </>
  );
};

export default observer(SearchForm);
