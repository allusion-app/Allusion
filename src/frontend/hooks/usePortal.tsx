import React, { useRef, useEffect, useState, useContext } from 'react';
import { createPortal } from 'react-dom';
import StoreContext from '../contexts/StoreContext';
import { observer } from 'mobx-react-lite';

// From: https://www.jayfreestone.com/writing/react-portals-with-hooks/

/**
 * Creates DOM element to be used as React root.
 * @returns {HTMLElement}
 */
function createRootElement(id: string, className?: string) {
  const rootContainer = document.createElement('div');
  rootContainer.setAttribute('id', id);
  rootContainer.setAttribute('class', className || '');
  return rootContainer;
}

/**
 * Appends element as last child of body.
 * @param {HTMLElement} rootElem
 */
function addRootElement(rootElem: HTMLElement) {
  document.body.insertBefore(rootElem, document.body.lastElementChild!.nextElementSibling);
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
function usePortal(id: string, className?: string) {
  const rootElemRef = useRef<HTMLElement>();

  useEffect(
    function setupElement() {
      // Look for existing target dom element to append to
      const existingParent = document.querySelector(`#${id}`) as HTMLElement;
      // Parent is either a new root or the existing dom element
      const parentElem = existingParent || createRootElement(id, className);

      // If there is no existing DOM element, add a new one.
      if (!existingParent) {
        addRootElement(parentElem);
      }

      // Add the detached element to the parent
      parentElem.appendChild(rootElemRef.current!);

      return function removeElement() {
        rootElemRef.current!.remove();
        if (!parentElem.childElementCount) {
          parentElem.remove();
        }
      };
    },
    [id],
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
  function getRootElem() {
    if (!rootElemRef.current) {
      rootElemRef.current = document.createElement('div');
    }
    return rootElemRef.current;
  }

  return getRootElem();
}

let portalIndex = 0;

/**
 * @example
 * <Portal id="modal">
 *   <p>Thinking with portals</p>
 * </Portal>
 */
export const Portal = observer(({ id, children }: { id?: string; children: React.ReactNode }) => {
  const { uiStore } = useContext(StoreContext);
  const [portalId] = useState(id || `portal-${portalIndex++}`); // create a default unique portal ID as fallback

  const themeClass = uiStore.theme === 'DARK' ? 'bp3-dark' : 'bp3-light';
  const target = usePortal(id || portalId, themeClass);
  return createPortal(children, target);
});

export default usePortal;
