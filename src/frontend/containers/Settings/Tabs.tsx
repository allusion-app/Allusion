import React, { ReactNode, useState } from 'react';

export type TabItem = {
  label: string;
  content: ReactNode;
};

interface ITabs {
  items: TabItem[];
}

const Tabs = ({ items }: ITabs) => {
  const [selection, setSelection] = useState(0);

  return (
    <div className="tabs">
      <div>
        {items.map((item, index) => (
          <span
            key={`${item.label}-${index}`}
            aria-selected={index === selection}
            onClick={() => setSelection(index)}
          >
            {item.label}
          </span>
        ))}
      </div>
      <div>{items[selection].content}</div>
    </div>
  );
};

export default Tabs;
