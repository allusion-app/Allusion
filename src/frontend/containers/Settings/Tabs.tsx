import React, { ReactNode, useState } from 'react';

export type TabItem = {
  label: string;
  content: ReactNode;
};

interface ITabs {
  id?: string;
  className?: string;
  tabItems: TabItem[];
}

const Tabs = ({ id, className, tabItems }: ITabs) => {
  const [selection, setSelection] = useState(0);

  return (
    <div id={id} className={`tabs ${className}`}>
      <div role="tablist">
        {tabItems.map((item, index) => (
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
      <div role="tabpanel">{tabItems[selection].content}</div>
    </div>
  );
};

export default Tabs;
