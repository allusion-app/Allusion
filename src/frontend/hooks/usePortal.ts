import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../contexts/StoreContext';
import { observer } from 'mobx-react-lite';

// From: https://www.jayfreestone.com/writing/react-portals-with-hooks/

/**
 * Creates DOM element to be used as React root.
 * @returns {HTMLElement}
 */
function createParentElement(id: string, className: string): HTMLElement {
  const rootContainer = document.createElement('div');
  rootContainer.setAttribute('id', id);
  rootContainer.className = className;
  return rootContainer;
}

/**
 * Hook to create a React Portal.
 * Automatically handles creating and tearing-down the root elements (no SRR
 * makes this trivial), so there is no need to ensure the parent target already
 * exists.
 * @example
 * const target = usePortal(id, [id]);
 * return createPortal(children, target);
 * @param {String} id The id of the target container, e.g 'modal' or 'spotlight'
 * @returns {HTMLElement} The DOM node to use as the Portal target.
 */
function usePortal(id: string, className: string): HTMLElement {
  const rootElementRef = useRef<HTMLElement>();

  useEffect(
    function setupElement() {
      // Look for existing target dom element to append to
      const existingParent = document.querySelector(`#${id}`) as HTMLElement | null;
      // Parent is either a new root or the existing dom element
      const parentElement = existingParent ?? createParentElement(id, className);

      if (existingParent === null) {
        document.body.appendChild(parentElement);
      } else {
        existingParent.className = className;
      }

      // Add the detached element to the parent
      if (
        rootElementRef.current !== undefined &&
        rootElementRef.current.parentElement !== parentElement
      ) {
        parentElement.appendChild(rootElementRef.current);
      }

      return function removeElement() {
        rootElementRef.current?.remove();
        if (parentElement.childElementCount === 0) {
          parentElement.remove();
        }
      };
    },
    [className, id],
  );

  /**
   * It's important we evaluate this lazily:
   * - We need first render to contain the DOM element, so it shouldn't happen
   *   in useEffect. We would normally put this in the constructor().
   * - We can't do 'const rootElemRef = useRef(document.createElement('div))',
   *   since this will run every single render (that's a lot).
   * - We want the ref to consistently point to the same DOM element and only
   *   ever run once.
   * @link https://reactjs.org/docs/hooks-faq.html#how-to-create-expensive-objects-lazily
   */
  function getRootElement(): HTMLElement {
    if (rootElementRef.current === undefined) {
      rootElementRef.current = document.createElement('div');
    }
    return rootElementRef.current;
  }

  return getRootElement();
}

/**
 * @example
 * <Portal id="modal">
 *   <p>Thinking with portals</p>
 * </Portal>
 */
export const Portal = observer(({ id, children }: { id: string; children: React.ReactNode }) => {
  const { uiStore } = useStore();

  const target = usePortal(id, uiStore.theme);
  return createPortal(children, target);
});

export default usePortal;
