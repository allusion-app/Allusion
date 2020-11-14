import React, { useCallback, useContext, useState } from 'react';
import { observer } from 'mobx-react-lite';
import StoreContext from '../contexts/StoreContext';
import { ClientTag } from 'src/renderer/entities/Tag';

// interface TagPopupPanelProps {

// }

const TagPopupPanel = observer(() => {
  const { tagStore, uiStore, fileStore } = useContext(StoreContext);
  const [inputText, setInputText] = useState('');
  const [tagList, setTagList] = useState<ClientTag[]>([]);

  // Count how often tags are used
  const counter = new Map<ClientTag, number>();
  for (const file of uiStore.fileSelection) {
    for (const tag of file.tags) {
      const count = counter.get(tag);
      counter.set(tag, count !== undefined ? count + 1 : 1);
    }
  }

  const selection = Array.from(counter.entries())
    // Sort based on count
    .sort((a, b) => b[1] - a[1])
    .map((pair) => pair[0]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputText(e.target.value);

    const textLower = text.toLowerCase();
    const matchingTags = tagStore.tagList.filter((t) => t.name.toLowerCase().includes(textLower));
  }, []);

  return (
    <div>
      <input value={inputText} onChange={handleInput} />
      <ul>
        {(inputText ? selection : tagList).map((t) => (
          <li key={t.id}>{t.name}</li>
        ))}
      </ul>
      <ul>
        {selection.map((t) => (
          <li key={t.id}>{t.name}</li>
        ))}
      </ul>
    </div>
  );
});

export default TagPopupPanel;
