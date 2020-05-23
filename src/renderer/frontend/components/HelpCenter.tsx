import { Classes, Drawer, IPanelProps, PanelStack, Button, ButtonGroup } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';
import React, { ReactNode, useContext, useRef, useEffect } from 'react';
import StoreContext from '../contexts/StoreContext';
import IconSet from './Icons';

// Some placeholder content
const generatePlaceholderContent = () => <>
  {Array.from(Array(1 + Math.round(Math.random() * 4))).map((_, i) =>
    <p key={i}>{Array.from(Array(Math.round(Math.random() * 100) + 10)).map(() => 'placeholder').join(' ')}</p>
  )}</>

interface ISection {
  title: string;
  icon: ReactNode;
  subSections: { title: string, content: ReactNode }[];
}

const sections: ISection[] = [
  {
    title: 'About Allusion',
    icon: 'Icon',
    subSections: [
      {
        title: 'What is Allusion',
        content: <>
          <p>
            Allusion is a tool designed to help artists organize their visual library. It is
            very common for creative people to use reference images throughout their projects.
          </p>
          <p>
            Finding such images has become relatively easy through the use of internet
            technology. Managing such images on the other hand, has remained a challenge.
            Clearly, it is not the amount of images that we can store, but a question of what we
            can effectively access, that matters. If only a handful of images were relevant to
            us, it would be easy to keep them in mind, but many artists are interested in
            creating their own curated library, and in such, it becomes increasingly difficult
            to remember where images were. Again, Allusion was created to help artists organize
            their visual library. To learn more about how Allusion works, please read on.
          </p>
        </>,
      },
    ],
  }, {
    title: 'Library Setup',
    icon: IconSet.LOCATIONS,
    subSections: [
      { title: 'Getting Started', content: generatePlaceholderContent() },
      { title: 'Locations', content: generatePlaceholderContent() },
      { title: 'Drag \& Drop', content: generatePlaceholderContent() },
    ],
  }, {
    title: 'Tagging',
    icon: IconSet.TAG,
    subSections: [
      { title: 'Tag Setup', content: generatePlaceholderContent() },
      { title: 'How to Tag an Image', content: generatePlaceholderContent() },
    ],
  }, {
    title: 'Search',
    icon: IconSet.SEARCH,
    subSections: [
      { title: 'Quick Search', content: generatePlaceholderContent() },
      { title: 'Advanced Search', content: generatePlaceholderContent() },
    ]
  },
];

type SectionPanelProps = { section: ISection, subSectionIndex?: number } & IPanelProps;

const SectionPanel = ({ section, subSectionIndex, openPanel, closePanel }: SectionPanelProps) => {
  const sectionIndex = sections.indexOf(section);
  const nextSection = sectionIndex !== sections.length - 1 ? sections[sectionIndex + 1] : undefined;

  const parentRef = useRef<HTMLDivElement>(null);

  // Scroll to subsection when a subSectionIndex is passed as a prop. Scroll to top if not passed
  const subSectionRefs = useRef(section.subSections.map(() => React.createRef<HTMLHeadingElement>()));
  useEffect(() => {
    console.log(parentRef.current)
    if (parentRef.current) {
      if (subSectionIndex !== undefined) {
        const ref = subSectionRefs.current[subSectionIndex];
        parentRef.current.scrollTo(0, (ref.current?.offsetTop || 0) - 50);
      } else {
        parentRef.current.scrollTo(0, 0);
      }
    }
  }, [section, subSectionIndex]);

  return (
    <div className="pageContent" ref={parentRef}>
      {section.subSections.map((subSec, subSectionIndex) => (
        <div key={subSec.title}>
            <h2 ref={subSectionRefs.current[subSectionIndex]}>
              {subSec.title}
            </h2>
            {subSec.content}
        </div>
      ))}
      <br />
      <ButtonGroup>
        <Button intent="primary" onClick={closePanel}>Back</Button>
        {nextSection && (
          <Button
            intent="primary"
            onClick={() => {
              // Close and open a new panel, with a delay to get the sweet animation
              closePanel();
              setTimeout(() => openPanel({
                title: nextSection.title,
                component: SectionPanel,
                props: { section: nextSection },
              }), 300);
            }}
          >
            Next: {nextSection.title}
          </Button>
        )}
      </ButtonGroup>
    </div>
  );
};

const HelpCenterHome = (props: IPanelProps) => {
  return (
    <div className="helpCenterHome">
      <div className="opening">
        <h2>Learn Allusion</h2>
        <p>Some documents to get you started</p>
      </div>
      <div className="navigation">
        <ul>
          {sections.map(section => (
            <React.Fragment key={section.title}>
              <li
                onClick={() => props.openPanel({
                  title: section.title,
                  component: SectionPanel,
                  props: { section },
                })}
              >
                <span>{section.title}</span>
                <span>{section.icon}</span>
              </li>
              <ul>
                {section.subSections.map((subSec, subSectionIndex) => (
                  <li
                    key={subSec.title}
                    onClick={() => props.openPanel({
                      title: section.title,
                      component: SectionPanel,
                      props: { section, subSectionIndex },
                    })}
                  >
                    {subSec.title}
                  </li>
                ))}
              </ul>
            </React.Fragment>
          ))}
        </ul>
      </div>
    </div>
  );
};

const HelpCenter = observer(() => {
  const { uiStore } = useContext(StoreContext);
  const themeClass = uiStore.theme === 'DARK' ? 'bp3-dark' : 'bp3-light';

  return (
    <Drawer
      isOpen={uiStore.isHelpCenterOpen}
      // icon={IconSet.OPEN_EXTERNAL}
      onClose={uiStore.toggleHelpCenter}
      // title="HelpCenter"
      className={themeClass}
    >
      <div className={Classes.DRAWER_BODY} id="help-center-drawer">
        <PanelStack
          initialPanel={{
            component: HelpCenterHome,
            title: 'Help Center'
          }}
        />
      </div>
    </Drawer>
  );
});

export default HelpCenter;
