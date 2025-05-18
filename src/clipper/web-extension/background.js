const apiUrl = 'http://localhost:5454';

let errCount = 0;

///////////////////////////////////
// Communication to Allusion app //
///////////////////////////////////
/**
 *
 * @param {string} filename The filename of the image, e.g. my-image.jpg
 * @param {string} url The url of the image, e.g. https://pbs.twimg.com/media/ASDF1234?format=jpg&name=small
 * @param {string} pageUrl The url of the page where the image is on, e.g. https://twitter.com/User/status/12345
 * @param {string[]} tagNames The tags to assign to the image, e.g. ['cat', 'cute']
 */
async function importImage(filename, url, pageUrl, tagNames = []) {
  // We could just send the URL, but in some cases you need permission to view an image (e.g. pixiv)
  // Therefore we send it base64 encoded

  let lastSubmittedItem = {};
  try {
    // Note: Google extensions don't work with promises, so we'll have to put up with callbacks here and there
    // Todo: url might already be base64
    const { base64, blob } = await imageAsBase64(url);

    let filenameWithExtension = filename;
    const extension = blob.type.split('/')[1];
    if (!filenameWithExtension.endsWith(extension)) {
      filenameWithExtension = `${filename}.${extension}`;
    }

    lastSubmittedItem = {
      filename: filenameWithExtension,
      url,
      imgBase64: base64,
      tagNames: tagNames || [],
      pageUrl,
      error: false,
    };

    chrome.storage.local.set({ lastSubmittedItem });

    await fetch(`${apiUrl}/import-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(lastSubmittedItem),
    });

    // no notification when it works as intended
    // show a badge instead. Resets when opening popup
    chrome.browserAction.setBadgeBackgroundColor({ color: 'rgb(51, 153, 255)' });
    chrome.browserAction.setBadgeText({ text: '1' });
  } catch (e) {
    console.error(e);

    chrome.notifications.create('import-error-' + errCount++, {
      type: 'basic',
      iconUrl: 'favicon_32x32.png',
      title: 'Allusion Clipper',
      message: 'Could not import image, is Allusion running? Click to retry',
      isClickable: true,
      // Buttons are not supported in Firefox https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/Notifications/NotificationOptions
      // buttons: [{ title: 'Retry' }],
    });

    chrome.browserAction.setBadgeBackgroundColor({ color: 'rgb(250, 52, 37)' });
    chrome.browserAction.setBadgeText({ text: '1' });

    lastSubmittedItem.error = true;
    chrome.storage.local.set({ lastSubmittedItem });
  }
}

function imageAsBase64(url) {
  return new Promise(async (resolve, reject) => {
    const response = await fetch(url);
    const blob = await response.blob();
    const reader = new FileReader();

    reader.onerror = reject;
    reader.onload = () => resolve({ base64: reader.result, blob });
    reader.readAsDataURL(blob);
  });
}

function filenameFromUrl(srcUrl, fallback) {
  // Get the filename from the url
  let filename = srcUrl.split('/').pop().split('#')[0].split('?')[0];

  // If the url is purely data or there is no extension, use a fallback (tab title)
  if (srcUrl.startsWith('data:image/') || filename.indexOf('.') === -1) {
    filename = fallback;
  } else {
    filename = filename.slice(0, filename.indexOf('.')); // strip extension
  }
  return filename;
}

////////////////////////////////
// Context menu ////////////////
////////////////////////////////
function setupContextMenus() {
  // Todo: Disable context menu (or change text) when allusion is not open
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create(
      {
        title: 'Add to Allusion',
        id: 'add-image',
        // Todo: Could add page, then look though clicked element to find image (for instagram, they put an invisible div on top of images...)
        contexts: ['image'],
      },
      (...args) => console.log('created context menu', ...args),
    );
  });
}

// Initialize
chrome.runtime.onInstalled.addListener(() => {
  setupContextMenus();
});

const handleMessage = async (msg) => {
  const { lastSubmittedItem } = await new Promise((res) =>
    chrome.storage.local.get('lastSubmittedItem', res),
  );

  if (msg.type === 'setTags' && lastSubmittedItem !== undefined) {
    const tagNames = msg.tagNames;
    lastSubmittedItem.tagNames = tagNames;
    chrome.storage.local.set({ lastSubmittedItem });

    try {
      await fetch(`${apiUrl}/set-tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tagNames,
          filename: lastSubmittedItem.filename,
        }),
      });
      return true;
    } catch (e) {
      return false;
    }
  } else if (msg.type === 'getLastSubmittedItem') {
    return lastSubmittedItem;
  } else if (msg.type === 'getTags') {
    try {
      const tagData = await fetch(`${apiUrl}/tags`);
      const tags = await tagData.json();
      return tags.map((t) => t.name) || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  } else if (msg.type === 'picked-image') {
    const { src, alt, pageTitle, pageUrl } = msg;
    const filename = filenameFromUrl(src, alt || pageTitle);
    importImage(filename, src, pageUrl);
    return true;
  }
};

// Communication with popup and content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.debug('Received message', msg);
  handleMessage(msg).then(sendResponse);

  return true; // indicate the sendResponse is called asynchronously
});

chrome.contextMenus.onClicked.addListener(async (props, tab) => {
  const srcUrl = props.srcUrl;
  const filename = filenameFromUrl(srcUrl, tab.title);
  const pageUrl = props.pageUrl || '';

  importImage(filename, srcUrl, pageUrl);

  // Otherwise: https://stackoverflow.com/questions/7703697/how-to-retrieve-the-element-where-a-contextmenu-has-been-executed
});

chrome.notifications.onClicked.addListener(async (id, buttonIndex) => {
  const { lastSubmittedItem } = await new Promise((res) =>
    chrome.storage.local.get('lastSubmittedItem', res),
  );

  // retry importing image
  console.log('Clicked notification button', id, buttonIndex, lastSubmittedItem);
  if (id.startsWith('import-error') && buttonIndex === 0 && lastSubmittedItem) {
    importImage(lastSubmittedItem.filename, lastSubmittedItem.url);
  }
});

chrome.commands.onCommand.addListener((command) => {
  console.log(command);
  // Pick an image from the current tab
  if (command === 'pick-image') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      chrome.tabs.sendMessage(tab.id, { type: 'pick-image' });
    });
  }
});

/// Add support for the following:
/// Allow a normal web page to emit a specific event ('send-allusion-image') to send a specific image to Allusion
chrome.runtime.onMessageExternal.addListener(async function (message, sender, sendResponse) {
  console.log('Received external message', message, sender, sendResponse);
  if (message.type === 'send-allusion-image') {
    const { src, alt, pageUrl = '', prompt = undefined } = message.payload;
    console.log('Received data.');
    console.log('Src', src);
    console.log('Alt', alt);
    console.log('PageURL', pageUrl);
    const filename = filenameFromUrl(src, sender.tab?.title || alt);
    console.log('Generated filename', filename);

    // Get all of the tags that exist
    const existingTags = await fetch(`${apiUrl}/tags`)
      .then((response) => response.json())
      .then((tags) => tags.map((tag) => tag.name));

    let promptTags = [];

    // If the prompt is set, then we automatically assign all tags that are in the prompt
    if (prompt) {
      // Prompt is multi-line and could contain commented out lines (starting with #, but keep #!allusion lines)
      // We remove those lines
      let promptLines = prompt
        .split('\n')
        .filter((line) => !line.trim().startsWith('#') || line.trim().startsWith('#!allusion '));

      promptLines = promptLines.map(
        (line) => line.replace('#!allusion ', '') /* Remove the "#!allusion" from all lines */,
      );

      // Some tags can be combined into groups (example: "(cat, cute:1.2)"), or simply have added weights (example: "cat:1.2")
      // We have to make sure that the parentheses and the weights are removed, so the tags get parsed correctly, we do want to keep the tags though
      promptLines = promptLines.map((line) => {
        // Replace escaped parentheses with temporary placeholders
        let cleanedLine = line
          .replace(/\\\(/g, 'TEMP_OPEN_PAREN')
          .replace(/\\\)/g, 'TEMP_CLOSE_PAREN');

        // Remove actual parentheses
        cleanedLine = cleanedLine.replace(/[()]/g, '');

        // Restore the placeholders to normal parentheses
        cleanedLine = cleanedLine
          .replace(/TEMP_OPEN_PAREN/g, '(')
          .replace(/TEMP_CLOSE_PAREN/g, ')');

        // Remove any weights indicated by a colon followed by numbers
        cleanedLine = cleanedLine.replace(/:\d+(\.\d+)?/g, '');

        // Split any remaining parts inside parentheses into separate tags
        const parts = cleanedLine
          .split(', ')
          .flatMap((part) => part.split(/ \(|\)/).filter(Boolean));

        // Generate permutations for multi-word tags and join them
        const processedParts = parts.flatMap((part) => {
          const words = part.trim().split(' ');
          if (words.length > 1) {
            return permute(words).map((perm) => perm.join(' '));
          }
          return [part];
        });

        return processedParts.join(', ');
      });

      const filteredPrompt = promptLines.join(', ');

      console.log('Received Prompt', prompt);
      console.log('Prompt filtered to', filteredPrompt);

      promptTags = filteredPrompt
        .split(',') // Split the prompt by comma and space to get individual tag names
        .map((tagName) => tagName.trim().toLowerCase()) // Trim and convert tag names to lowercase
        .filter((value, index, self) => self.indexOf(value) === index) // Remove duplicate tag names
        .filter((tagName) => tagName.length > 0) // Remove empty tag names
        .map((tagName) => {
          let existingTag = existingTags.find((tag) => tag.toLowerCase() === tagName); // Check if the tag already exists
          if (existingTag) {
            return existingTag; // Return the tag name if it already exists
          } else return null; // Return null if the tag doesn't exist
        })
        .filter((tagName) => tagName !== null); // Remove null values from the array

      console.log('Applying tags', promptTags);
      console.log('Existing tags', existingTags);
    }

    importImage(filename, src, pageUrl, promptTags);
    console.log('Imported image.');
    sendResponse({ status: 'ok' });
  }
});

const permute = (arr) => {
  if (arr.length <= 1) return [arr];
  const permutations = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = permute(arr.slice(0, i).concat(arr.slice(i + 1)));
    for (const perm of rest) {
      permutations.push([arr[i], ...perm]);
    }
  }
  return permutations;
};
