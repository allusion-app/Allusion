const apiUrl = 'http://localhost:5454';

///////////////////////////////////
// Communication to Allusion app //
///////////////////////////////////
async function importImage(filename, url) {
  // We could just send the URL, but in some cases you need permission to view an image (e.g. pixiv)
  // Therefore we send it base64 encoded
  
  // Note: Google extensions don't work with promises, so we'll have to put up with callbacks
  const imgData = await imageAsBase64(url);
  
  await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filename,
      url,
      imgBase64: imgData,
    }),
  });
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

////////////////////////////////
// Context menu /// ////////////
////////////////////////////////
function setupContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      title: 'Add to Allusion',
      id: 'add-image',
      // Todo: Could add page, then look though clicked element to find image (for instagram, they put an invisible div on top of images...)
      contexts: ['image'],
    }, (...args) => console.log('created context menu', ...args));
  });
}

chrome.runtime.onInstalled.addListener(() => {
  setupContextMenus();
});

chrome.contextMenus.onClicked.addListener((props, tab) => {
  const srcUrl = props.srcUrl;

  // Todo: doesn't work if no filename specified, will result in whole url
  const filename = srcUrl.split('/').pop().split('#')[0].split('?')[0];

  importImage(filename, srcUrl);

  // Otherwise: https://stackoverflow.com/questions/7703697/how-to-retrieve-the-element-where-a-contextmenu-has-been-executed
});
