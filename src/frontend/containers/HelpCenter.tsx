import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Button, ButtonGroup, IconSet, Split } from 'widgets';
import Logo_About from 'resources/images/helpcenter/logo-about-helpcenter.jpg';
import { clamp } from '../utils';
import StoreContext from '../contexts/StoreContext';
import PopupWindow from '../components/PopupWindow';

const HelpCenter = observer(() => {
  const { uiStore } = useContext(StoreContext);

  if (!uiStore.isHelpCenterOpen) {
    return null;
  }
  return (
    <PopupWindow
      onClose={uiStore.closeHelpCenter}
      windowName="help-center"
      closeOnEscape
      additionalCloseKey={uiStore.hotkeyMap.toggleHelpCenter}
    >
      <Documentation id="help-center" className="light" initPages={PAGE_DATA} />
    </PopupWindow>
  );
});

export default HelpCenter;

interface IDocumentation {
  id?: string;
  className?: string;
  initPages: () => IPageData[];
}

const Documentation = ({ id, className, initPages }: IDocumentation) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [sectionIndex, setSectionIndex] = useState(0);
  const data = useRef(initPages());

  const openPage = useCallback((page: number, section: number) => {
    setPageIndex(page);
    setSectionIndex(section);
  }, []);

  const [isIndexOpen, setIndexIsOpen] = useState(true);
  const toggleIndex = useCallback(() => setIndexIsOpen((value) => !value), []);
  const [splitPoint, setSplitPoint] = useState(224); // 14rem
  const handleMove = useCallback(
    (x: number, width: number) => {
      const minWidth = 224;
      if (isIndexOpen) {
        const w = clamp(x, minWidth, width * 0.75);
        setSplitPoint(w);

        if (x < minWidth * 0.75) {
          setIndexIsOpen(false);
        }
      } else if (x >= minWidth) {
        setIndexIsOpen(true);
      }
    },
    [isIndexOpen],
  );

  return (
    <div id={id} className={className}>
      <Split
        primary={<Overview pages={data.current} openPage={openPage} />}
        secondary={
          <Page
            isIndexOpen={isIndexOpen}
            toggleIndex={toggleIndex}
            pages={data.current}
            openPage={openPage}
            pageIndex={pageIndex}
            sectionIndex={sectionIndex}
          />
        }
        axis="vertical"
        splitPoint={splitPoint}
        isExpanded={isIndexOpen}
        onMove={handleMove}
      />
    </div>
  );
};

interface IOverview {
  pages: IPageData[];
  openPage: (page: number, section: number) => void;
}

const Overview = ({ pages, openPage }: IOverview) => {
  return (
    <nav className="overview">
      {pages.map((page, pageIndex) => (
        <details open key={page.title}>
          <summary>
            {page.icon}
            {page.title}
          </summary>
          <ul>
            {page.sections.map((section, sectionIndex) => (
              <li key={section.title}>
                <a onClick={() => openPage(pageIndex, sectionIndex)}>{section.title}</a>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </nav>
  );
};

interface IPage {
  isIndexOpen: boolean;
  toggleIndex: () => void;
  pages: IPageData[];
  pageIndex: number;
  sectionIndex: number;
  openPage: (page: number, section: number) => void;
}

const Page = (props: IPage) => {
  const { isIndexOpen, toggleIndex, pages, pageIndex, sectionIndex, openPage } = props;
  const page = useRef<HTMLElement>(null);

  useEffect(() => {
    if (page.current !== null) {
      const section = page.current.children[sectionIndex];
      section.scrollIntoView();
    }
  }, [sectionIndex]);

  const buttons = [];
  if (pageIndex > 0) {
    buttons.push(
      <Button
        key="previous"
        styling="outlined"
        onClick={() => openPage(pageIndex - 1, 0)}
        text="Previous"
      />,
    );
  }
  if (pageIndex < pages.length - 1) {
    buttons.push(
      <Button
        key="next"
        styling="outlined"
        onClick={() => openPage(pageIndex + 1, 0)}
        text="Next"
      />,
    );
  }

  return (
    <div className="page">
      <div className="page-toolbar">
        <button
          autoFocus
          className="btn toolbar-button"
          aria-pressed={isIndexOpen}
          onClick={toggleIndex}
          tabIndex={0}
        >
          <span className="btn-content-icon" aria-hidden="true">
            {isIndexOpen ? IconSet.DOUBLE_CARET : IconSet.MENU_HAMBURGER}
          </span>
          <span className="btn-content-text hidden">Toggle Index</span>
        </button>
      </div>
      <article className="page-content" ref={page}>
        {pages[pageIndex].sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            {section.content}
          </section>
        ))}
      </article>
      <ButtonGroup>{buttons}</ButtonGroup>
    </div>
  );
};

interface IPageData {
  title: string;
  icon: React.ReactNode;
  sections: { title: string; content: React.ReactNode }[];
}

const PAGE_DATA: () => IPageData[] = () => [
  {
    title: 'About Allusion',
    icon: IconSet.LOGO,
    sections: [
      {
        title: 'What is Allusion',
        content: (
          <>
            <img className="centered" src={Logo_About} alt="Logo" />
            <p>
              <strong>
                Allusion is a tool designed to help artists organize their visual library. It is
                very common for creative people to use reference images throughout their projects.
              </strong>
            </p>
            <p>
              Finding such images has become relatively easy through the use of internet technology.
              Managing such images on the other hand, has remained a challenge. Clearly, it is not
              the amount of images that we can store, but a question of what we can effectively
              access, that matters. If only a handful of images were relevant to us, it would be
              easy to keep them in mind, but many artists are interested in creating their own
              curated library, and in such, it becomes increasingly difficult to remember where
              images were. Again, Allusion was created to help artists organize their visual
              library. To learn more about how Allusion works, please read on.
            </p>
          </>
        ),
      },
    ],
  },
  {
    title: 'Library Setup',
    icon: IconSet.META_INFO,
    sections: [
      {
        title: 'Getting Started',
        content: (
          <>
            <p>
              Library setup refers to the process of importing images to Allusion so that they are
              available to be managed and viewed. Importing, may however be not the most suitable
              term, as Allusion focuses on linked folders rather than copying images to a predefined
              folder. Read on to find out about how to add images to your Allusion library.
            </p>
          </>
        ),
      },
      {
        title: 'Locations',
        content: (
          <>
            <p>
              {`In Allusion, the primary way of adding images to your library is the use of
                "Locations". A location in this context is a link to a folder on your computer. This
                means that all images in that folder as well as any subfolders will be automatically
                loaded once it is added to your list of locations. The benefit of this system is that
                you can have full control over where your data is stored, while not having to
                tediously import images manually from various places. To add more images, simply place
                them into the linked folder, and they will show up in Allusion. Similarly, by removing
                images from a linked folder, the images will be removed from your library. In
                Allusion, such a linked folder is called a location.`}
            </p>
            <p>
              {`To add a new location, open the outliner and hover with your mouse over the location's
                header. You will see a small plus icon to the right. Once you click the icon, go ahead
                and browse the folder that contains images. Confirm your selection and select your
                location preferences in the following popup. Once you confirm, your images will show
                up in the content area.`}
            </p>
            <p>
              To remove a location, open the outliner and right click on a location. A context menu
              will open with the option to remove your location. You have to confirm this action.
              Please be aware that removing a location will delete all tagging information that may
              have been attached to images of that location. The images themselves however, will
              remain.
            </p>
          </>
        ),
      },
      {
        title: 'Drag & Drop',
        content: (
          <>
            <p>
              Another way of quickly importing images is by dragging them onto the application
              window. When doing so, a popup will show up with a list of your tags. If you drag and
              drop an image on top of a tag, the imported images will automatically have that tag
              assigned. To import an image without assigning a tag, simply drop the image anywhere
              else. Finally it is important to note that images will be imported to the import
              directory that is specified in the settings.
            </p>
          </>
        ),
      },
    ],
  },
  {
    title: 'Tagging',
    icon: IconSet.TAG,
    sections: [
      {
        title: 'Tag Setup',
        content: (
          <>
            <p>
              Although it is possible to create tags while tagging, it is recommended to create
              useful tags in advance to take full advantage of the organized tag structures that can
              be set up in the outliner. The outliner has a tag related section below your
              locations. In this section you are able to create, edit and organize your tags.
            </p>
            <p>
              To create a new tag, simply press the icon next to the header. You have to hover the
              mouse over the region for the icon to become visible. Similarly, you can create a tag
              category by pressing the icon next to it. A tag is used to label images while a tag
              category can be thought of as a folder for tags.{' '}
            </p>
            <p>
              To organize your tags, simply drag the list items across the outliner. You can drop an
              item onto a tag category to place it inside. In this way you can turn a list of many
              tags into a structured shape, so that it is easy for you to find the specific tags you
              were looking for.
            </p>
            <p>
              Finally, to remove or edit an entry, right-click it and choose an action from the
              context menu.
            </p>
          </>
        ),
      },
      {
        title: 'How to Tag an Image',
        content: (
          <>
            <p>
              There are several ways to tag an image. First, you can drag a tag from the outliner
              onto an image. Next, you can select an image, press T to open the tag editor, and
              assign or remove tags from the list. Keep in mind that this method also allows you to
              tag multiple images at once. Finally, you can add tags by adding them to the list in
              the inspector panel.
            </p>
            <p>
              To remove tags, you have to access either the tag editor or the inspector. In both
              places you will be able to remove individual tags or all at once.
            </p>
          </>
        ),
      },
    ],
  },
  {
    title: 'Search',
    icon: IconSet.SEARCH,
    sections: [
      {
        title: 'Quick Search',
        content: (
          <>
            <p>
              In Allusion there are many ways to find images. The quick search allows you to search
              for tags or collections. The advanced search can be accessed from within the quick
              search and allows for more advanced search queries.
            </p>
            <p>
              To open the quick search, click on the magnifying glass icon in the toolbar, or use
              the shortcut Ctrl-F. A search bar will appear near the top of the window. Once you
              start typing, Allusion will make suggestions with an indication of where the item is a
              tag or a collection. Select the item from the list to add it to your search. You can
              narrow down an image by searching for several tags at once.
            </p>
          </>
        ),
      },
      {
        title: 'Advanced Search',
        content: (
          <>
            <p>
              {`The advanced search can be opened by pressing on the icon on the far left side of the
                quick search bar. In the popup you are able to create as many search criteria as you
                wish by listing them up. Each row in the interface represents one criteria and
                consists of three input fields. First select the type of information you want to look
                for. You can search for tags, collections but also file size, file format, etc. You
                can then select an operator such as "equals", "greater than", "includes" etc. Finally
                you can enter a value which will be searched for. Adding multiple criteria will again
                help you narrow down a search result.`}
            </p>
          </>
        ),
      },
    ],
  },
  {
    title: 'Inspection',
    icon: IconSet.INFO,
    sections: [
      {
        title: 'Content Area',
        content: (
          <>
            <p>
              The content area is the area in which your images are listed in the center of the
              window. There are several preferences you can set in the toolbar that will influence
              the way your images are listed. You can choose between grid and list view by using the
              icons towards the right. You can also sort the results according to various criteria
              by clicking the funnel icon. Finally, you can also change the size of your thumbnails.
              This can be changed in the settings which can be accessed by clicking the gear icon in
              the toolbar.
            </p>
          </>
        ),
      },
      {
        title: 'Image Details',
        content: (
          <>
            <p>
              {`Each image carries a lot of information with it such as the file name, url,
                dimensions, etc. Such information can be viewed through the inspector. The inspector
                is a panel that can be accessed by pressing the information icon on the far right of
                the toolbar, or by right-clicking an image and selecting "Inspect". This panel will
                allow you to see such information as well as a list of tags the image was assigned to.`}
            </p>
          </>
        ),
      },
      {
        title: 'Image Preview',
        content: (
          <>
            <p>
              Most importantly however, an image needs to be viewed from time to time. There are two
              ways to view an image. First, you can double click any images in the content area to
              open the image across the entire view. While looking at an image you can still use
              your arrow keys to navigate to the previous or next images. Secondly, you can also
              preview images in a separate window by selecting an image and pressing the spacebar.
              The preview window will open and display your images. It is however important to take
              note that the preview window will only allow you to cycle through images in your
              selection. You can therefore select multiple images and preview just those in the new
              window. For both ways or viewing, the escape key will quickly bring you back to the
              previous view.
            </p>
          </>
        ),
      },
    ],
  },
];
