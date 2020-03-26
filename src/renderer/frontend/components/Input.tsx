import React, { useEffect, useRef } from 'react';

interface ITextInputProps {
  focusOnEdit?: boolean;
  className?: string;
  disabled?: boolean;
  placeholder: string;
  editable?: boolean;
  required?: boolean;
  text: string;
  setText: (text: string) => void;
  isValid?: (text: string) => boolean;
  onSubmit?: (target: EventTarget & HTMLInputElement) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onInput?: (event: React.FormEvent<HTMLInputElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onInvalid?: (event: React.FormEvent<HTMLInputElement>) => void;
  onAbort?: (rawValue: string) => void;
}

/**
 * Editable text input.
 *
 * The text cannot be null, undefined or empty.
 * @param param0
 */
const TextInput = ({
  focusOnEdit = false,
  className = '',
  disabled,
  placeholder,
  editable = true,
  required,
  text,
  setText,
  isValid = () => true,
  onAbort = () => {},
  onBlur,
  onInput,
  onFocus,
  onInvalid,
  onSubmit = () => {},
}: ITextInputProps) => {
  const input = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (input.current) {
      if (focusOnEdit && editable) {
        input.current.focus();
      }
      if (!editable) {
        input.current.setSelectionRange(0, 0);
      }
    }
  }, [editable, focusOnEdit]);

  const handleOnBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    if (onBlur) {
      return onBlur(event);
    }
    if (editable) {
      const element = event.target as HTMLInputElement;
      if (isValid(element.value)) {
        setText(element.value.trim());
        onSubmit(element);
      } else {
        element.value = text;
      }
    }
  };

  const handleOnInput = (event: React.FormEvent<HTMLInputElement>) => {
    if (onInput) {
      return onInput(event);
    }
    const element = event.target as HTMLInputElement;
    element.setCustomValidity(isValid(element.value) ? '' : 'INVALID');
  };

  const handleOnEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return;
    }
    if (editable) {
      const element = event.target as HTMLInputElement;
      if (isValid(element.value)) {
        setText(element.value.trim());
        onSubmit(element);
        event.currentTarget.setSelectionRange(0, 0);
      } else {
        onAbort(element.value);
      }
    }
  };

  const handleOnFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    if (onFocus) {
      return onFocus(event);
    }
    if (editable) {
      event.target.select();
    }
  };

  const handleOnInvalid = (event: React.FormEvent<HTMLInputElement>) => {
    if (onInvalid) {
      return onInvalid(event);
    }
    event.preventDefault();
  };

  return (
    <input
      spellCheck={false}
      ref={input}
      className={className}
      defaultValue={text}
      type="text"
      disabled={disabled}
      placeholder={placeholder}
      required={required}
      readOnly={!editable}
      onBlur={handleOnBlur}
      onInput={handleOnInput}
      onFocus={handleOnFocus}
      onInvalid={handleOnInvalid}
      onKeyUp={handleOnEnter}
    />
  );
};

export { TextInput };
