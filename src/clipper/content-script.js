////////////////////////////////////////
// Image picker using shortcut action //
////////////////////////////////////////

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  sendResponse({ status: 'ok' });

  if (request.type === 'pick-image') {
    let picker = undefined;

    const escapeListener = (e) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keyup', escapeListener);
        if (picker) {
          picker.clean();
        }
      }
    };
    document.addEventListener('keyup', escapeListener);

    picker = new ElementPicker({
      selectors: '*',
      preventDefault: true,
      action: {
        trigger: 'click', // click, dblclick, mouseover
        /**
         * @param {HTMLElement} target
         */
        callback: function (target) {
          picker.clean();
          document.removeEventListener('keyup', escapeListener);

          // Attempt to find the image that was clicked

          let img = target.tagName === 'IMG' ? target : target.querySelector('img');

          if (!img) {
            // Some websites attempt to fool us by putting a Div on top of the image
            // but we can find the image by looking for the first image in the parent
            img = target.parentElement.querySelector('img');
          }

          if (img?.src) {
            chrome.runtime.sendMessage({
              type: 'picked-image',
              src: img.src,
              alt: img.alt,
              pageTitle: document.title,
              pageUrl: document.location.href,
            });
          }
        },
      },
    });
  }
});
