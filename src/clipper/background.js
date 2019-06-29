const apiUrl = 'http://localhost:5454';

let lastSubmittedItem = undefined;

///////////////////////////////////
// Communication to Allusion app //
///////////////////////////////////
async function importImage(filename, url) {
  // We could just send the URL, but in some cases you need permission to view an image (e.g. pixiv)
  // Therefore we send it base64 encoded
  
  // Note: Google extensions don't work with promises, so we'll have to put up with callbacks here and there
  // Todo: url might already be base64
  const imgData = await imageAsBase64(url);

  const item = {
    filename,
    url,
    imgBase64: imgData,
    tagNames: [],
  };

  lastSubmittedItem = item;
  
  try {
    await fetch(`${apiUrl}/import-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(item),
    });

    // Todo: Maybe no notification when it works as intended?
    chrome.notifications.create(null, {
      type: 'basic',
      iconUrl: 'favicon_32x32.png',
      title: 'Allusion Clipper',
      message: 'Image imported successfully!'
    });

    // Todo: Show popup to add tags
  } catch (e) {
    console.error(e);

    chrome.notifications.create(null, {
      type: 'basic',
      iconUrl: 'favicon_32x32.png',
      title: 'Allusion Clipper',
      message: 'Could not import image. Is Allusion running?',
      buttons: [{ title: 'Retry' }],
    });
  }
}

function imageAsBase64(url) {
  return new Promise(async (resolve, reject) => {
    const response = await fetch(url);
    const blob = await response.blob();
    const reader = new FileReader;
  
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  })
}

async function fetchTags() {
  const tags = await fetch(`${apiUrl}/tags`);
}

////////////////////////////////
// Context menu ////////////////
////////////////////////////////
function setupContextMenus() {
  // Todo: Disable context menu (or change text) when allusion is not open
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      title: 'Add to Allusion',
      id: 'add-image',
      // Todo: Could add page, then look though clicked element to find image (for instagram, they put an invisible div on top of images...)
      contexts: ['image'],
    }, (...args) => console.log('created context menu', ...args));
  });
}

// Initialize
chrome.runtime.onInstalled.addListener(() => {
  setupContextMenus();
});

// Communication with popup script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'setTags' && lastSubmittedItem !== undefined) {
    const tagNames = msg.tagNames;

    lastSubmittedItem.tagNames = tagNames;
    
    fetch(`${apiUrl}/set-tags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tagNames,
        filename: lastSubmittedItem.filename,
      }),
    })
    .then(() => sendResponse(true))
    .catch(() => sendResponse(false));
    return true;
  } else if (msg.type === 'getLastSubmittedItem') {
    sendResponse(lastSubmittedItem);
    return true;
  }
});

chrome.contextMenus.onClicked.addListener((props, tab) => {
  const srcUrl = props.srcUrl;

  // Todo: doesn't work if no filename specified, will result in whole url
  const filename = srcUrl.split('/').pop().split('#')[0].split('?')[0];

  importImage(filename, srcUrl);

  // Otherwise: https://stackoverflow.com/questions/7703697/how-to-retrieve-the-element-where-a-contextmenu-has-been-executed
});

// chrome.notifications.onButtonClicked((id, buttonIndex) => {
//   // Todo: retry importing image
// });

