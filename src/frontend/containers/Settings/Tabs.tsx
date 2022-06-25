import React, { ReactNode, useMemo, useState } from 'react';
import { TFunction, useTranslation } from 'react-i18next';

export type TabItem = {
  label: string;
  content: ReactNode;
};

interface ITabs {
  initTabItems: (t: TFunction<'settings'>) => TabItem[];
}

const Tabs = ({ initTabItems }: ITabs) => {
  const [selection, setSelection] = useState(0);
  const { t } = useTranslation('settings');
  const items = useMemo(() => initTabItems(t), [initTabItems, t]);

  return (
    <div className="tabs">
      <div role="tablist">
        {items.map((item, index) => (
          <button
            role="tab"
            key={item.label}
            aria-selected={index === selection}
            onClick={() => setSelection(index)}
            className="align-left"
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
