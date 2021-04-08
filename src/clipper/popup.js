const tagForm = document.forms.namedItem('tagForm');
const tagsInput = document.getElementById('tags-input');
const tagsDatalist = document.getElementById('tags-datalist');
const formInfo = document.getElementById('form-info');
const previewImg = document.getElementById('preview-img');
const tagFormSubmit = document.getElementById('tag-form-submit');
const submissionStatus = document.getElementById('submission-status');

tagForm.onsubmit = async function (e) {
  e.preventDefault();
  const formData = new FormData(tagForm);
  const tagNames = formData
    .get('tags')
    .split(',')
    .map((tag) => tag.trim());

  submissionStatus.innerText = 'Loading...';
  chrome.runtime.sendMessage({ type: 'setTags', tagNames }, (success) => {
    // Confirm success to user
    submissionStatus.innerText = success
      ? 'Saved!'
      : 'Something went wrong... \nIs Allusion running?';
  });
};

tagsInput.addEventListener('keydown', (e) => {
  // Submit with enter
  if (e.keyCode === 13) {
    tagForm.onsubmit(e);
  }
});

window.onload = function () {
  // When the popup is opened, fill in previously entered info
  chrome.runtime.sendMessage({ type: 'getLastSubmittedItem' }, (lastSubmittedItem) => {
    if (lastSubmittedItem) {
      // Todo: Fill in custom filename
      tagsInput.value = lastSubmittedItem.tagNames.join(', ');
      formInfo.innerHTML = `Imported <i>${lastSubmittedItem.filename}</i> !`;
      previewImg.src = lastSubmittedItem.url;

      chrome.runtime.sendMessage({ type: 'getTags' }, (tagNames) => {
        // Store/recover tags for when main window is closed
        if (tagNames.length) {
          window.localStorage.setItem('tags', JSON.stringify(tagNames));
        } else {
          tagNames = JSON.parse(window.localStorage.getItem('tags') || '[]');
        }
        // TODO: datalist doesn't allow you to choose multiple items
        // Could do it with jquery: https://gitlab.com/energiebespaarders/graphql-api/blob/develop/src/houses/resolvers.ts#L264
        // Or make this a react app and import the MultiTagSelector...
        tagsDatalist.append(
          ...tagNames.map((name) => {
            const el = document.createElement('option');
            el.innerHTML = name;
            return el;
          }),
        );
      });
    } else {
      tagsInput.disabled = true;
      tagFormSubmit.disabled = true;
      formInfo.innerText =
        'Use the "Add to Allusion" option in the context menu of any image to import it.';
    }
  });
};
