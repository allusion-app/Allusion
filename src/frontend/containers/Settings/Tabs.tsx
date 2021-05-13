import React, { ReactNode, useRef, useState } from 'react';

export type TabItem = {
  label: string;
  content: ReactNode;
};

interface ITabs {
  initTabItems: () => TabItem[];
}

const Tabs = ({ initTabItems }: ITabs) => {
  const [selection, setSelection] = useState(0);
  const items = useRef(initTabItems()).current;

  return (
    <div className="tabs">
      <div role="tablist">
        {items.map((item, index) => (
          <button
            role="tab"
            key={item.label}
            aria-selected={index === selection}
            onClick={() => setSelection(index)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{items[selection].content}</div>
    </div>
  );
};

export default Tabs;
