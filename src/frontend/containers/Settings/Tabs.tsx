import React, { ReactNode, useState } from 'react';

export type TabItem = {
  label: string;
  content: ReactNode;
};

interface ITabs {
  tabItems: TabItem[];
}

const Tabs = ({ tabItems }: ITabs) => {
  const [selection, setSelection] = useState(0);

  return (
    <div className="tabs">
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
