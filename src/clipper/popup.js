const apiUrl = 'http://localhost:5454';

const tagForm = document.forms.namedItem('tagForm');
const tagsInput = document.getElementById('tags-input');
const formInfo = document.getElementById('form-info');
const previewImg = document.getElementById('preview-img');
const tagFormSubmit = document.getElementById('tag-form-submit');
const submissionStatus = document.getElementById('submission-status');

tagForm.onsubmit = async function(e) {
  e.preventDefault();
  const formData = new FormData(tagForm);
  const tagNames = formData.get('tags').split(',').map((tag) => tag.trim());

  submissionStatus.innerText = 'Loading...';
  chrome.runtime.sendMessage({ type: 'setTags', tagNames }, (success) => {
    // Confirm success to user
    submissionStatus.innerText = 'Saved!';
  });
}

tagsInput.addEventListener('keydown', (e) => {
  // Submit with enter
  if (e.keyCode === 13) { tagForm.onsubmit(e); }
});

window.onload = function() {
  // When the popup is opened, fill in previously entered info
  chrome.runtime.sendMessage({ type: 'getLastSubmittedItem' }, (lastSubmittedItem) => {
    if (lastSubmittedItem) {
      // Todo: Fill in filename + tags (+ image preview?)
      tagsInput.value = lastSubmittedItem.tagNames.join(', ');
      formInfo.innerText = `${lastSubmittedItem.filename} has been imported!`;
      previewImg.src = lastSubmittedItem.url;
    } else {
      tagsInput.disabled = true;
      tagFormSubmit.disabled = true;
      formInfo.innerText = 'Use the "Add to Allusion" option in the context menu of any image to import it.';
    }
  });
}
  