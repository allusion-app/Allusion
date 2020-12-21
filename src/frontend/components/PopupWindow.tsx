import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

interface IPopupWindowProps {
  onClose?: () => void;
  windowName?: string;
  closeOnEscape?: boolean;
  additionalCloseKey?: string;
}

function copyStyles(sourceDoc: Document, targetDoc: Document) {
  Array.from(sourceDoc.styleSheets).forEach((styleSheet) => {
    const cssStylesheet = styleSheet as CSSStyleSheet;
    if (cssStylesheet.cssRules) {
      const newStyleEl = sourceDoc.createElement('style');

      Array.from(cssStylesheet.cssRules).forEach((cssRule) => {
        newStyleEl.appendChild(sourceDoc.createTextNode(cssRule.cssText));
      });

      targetDoc.head.appendChild(newStyleEl);
    } else if (styleSheet.href) {
      const newLinkEl = sourceDoc.createElement('link');

      newLinkEl.rel = 'stylesheet';
      newLinkEl.href = styleSheet.href;
      targetDoc.head.appendChild(newLinkEl);
    }
  });
}

/**
 * Creates a new external browser window, that renders whatever you pass as children
 */
const PopupWindow: React.FC<IPopupWindowProps> = (props) => {
  const [containerEl] = useState(document.createElement('div'));
  const [win, setWin] = useState<Window>();

  useEffect(() => {
    const externalWindow = window.open('', props.windowName);
    if (!externalWindow) throw new Error('External window not supported!');
    setWin(externalWindow);

    externalWindow.document.body.appendChild(containerEl);

    // Copy style sheets from main window
    copyStyles(document, externalWindow.document);

    externalWindow.addEventListener('beforeunload', () => {
      props.onClose?.();
    });

    if (props.closeOnEscape) {
      externalWindow.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key === props.additionalCloseKey) {
          props.onClose?.();
        }
      });
    }

    return function cleanup() {
      externalWindow?.close();
      setWin(undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (win) {
    return ReactDOM.createPortal(props.children, containerEl);
  }
  return null;
};

export default PopupWindow;
