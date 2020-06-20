import React, { useState, useCallback } from 'react';

import { TextInput } from 'components';

export default {
  component: TextInput,
  title: 'Input/Text',
};

export const Default = () => {
  return <TextInput placeholder="Enter a word!" setText={(value) => console.log(value)} />;
};

export const Readonly = () => {
  return (
    <TextInput
      readOnly
      placeholder="Enter a word..."
      value="You cannot touch me!"
      setText={(value) => console.log(value)}
    />
  );
};

export const Required = () => {
  return (
    <TextInput
      required
      placeholder="Invalid when empty..."
      setText={(value) => console.log(value)}
    />
  );
};

export const Invalid = () => {
  return (
    <TextInput
      required
      placeholder="Enter 'Viva La Vegan'!"
      setText={(value) => console.log(value)}
      isValid={(text) => text === 'Viva La Vegan'}
    />
  );
};

export const Editable = () => {
  const [text, setText] = useState('Press ✏️ to edit!');
  const [isEditing, setIsEditing] = useState(false);

  const disableEditing = useCallback((target) => {
    setIsEditing(false);
    target.setSelectionRange(0, 0);
  }, []);

  const enableEditing = useCallback(() => setIsEditing(true), []);

  return (
    <>
      <TextInput
        autoFocus
        spellCheck={false}
        readOnly={!isEditing}
        placeholder="Enter something nice!"
        defaultValue={text}
        setText={setText}
        onSubmit={disableEditing}
      />
      <button onClick={enableEditing}>✏️</button>
    </>
  );
};

export const Overflow = () => {
  return (
    <TextInput
      placeholder="Overflowing placeholder text gets truncated by ellipsis!"
      value=""
      setText={(value) => console.log(value)}
    />
  );
};
