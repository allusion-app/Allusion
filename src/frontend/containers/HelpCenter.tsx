/* eslint-disable react/no-unescaped-entities */
import React, { useCallback, useRef, useState, memo } from 'react';
import { observer } from 'mobx-react-lite';
import { Button, ButtonGroup, IconSet, Split } from 'widgets';
import Logo_About from 'resources/images/helpcenter/logo-about-helpcenter-dark.jpg';
import { clamp } from 'common/core';
import { useStore } from '../contexts/StoreContext';
import PopupWindow from '../components/PopupWindow';
import { shell } from 'electron';
import { chromeExtensionUrl } from 'common/config';
import { ToolbarButton } from 'widgets/Toolbar';

const HelpCenter = observer(() => {
  const { uiStore } = useStore();

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
      <Documentation
        id="help-center"
        overviewId="help-center-overview"
        className={uiStore.theme}
        initPages={PAGE_DATA}
      />
    </PopupWindow>
  );
});

export default HelpCenter;

interface IDocumentation {
  id?: string;
  overviewId: string;
  className?: string;
  initPages: () => IPageData[];
}

const Documentation = ({ id, overviewId, className, initPages }: IDocumentation) => {
  const [pageIndex, setPageIndex] = useState(0);
  const pages = useRef(initPages()).current;

  const [isIndexOpen, setIndexIsOpen] = useState(true);
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
        primary={<Overview id={overviewId} pages={pages} openPage={setPageIndex} />}
        secondary={
          <Page
            toolbar={
              <PageToolbar
                isIndexOpen={isIndexOpen}
                toggleIndex={setIndexIsOpen}
                controls={overviewId}
              />
            }
            pages={pages}
            openPage={setPageIndex}
            pageIndex={pageIndex}
          />
        }
        axis="vertical"
        align="left"
        splitPoint={splitPoint}
        isExpanded={isIndexOpen}
        onMove={handleMove}
      />
    </div>
  );
};

interface IOverview {
  id: string;
  pages: IPageData[];
  openPage: (page: number) => void;
}

const Overview = memo(function Overview({ id, pages, openPage }: IOverview) {
  return (
    <nav id={id} className="doc-overview">
      {pages.map((page, pageIndex) => (
        <details open key={page.title}>
          <summary>
            {page.icon}
            {page.title}
          </summary>
          {page.sections.map((section) => (
            <a
              key={section.title}
              href={`#${section.title.toLowerCase().replaceAll(' ', '-')}`}
              onClick={() => openPage(pageIndex)}
            >
              {section.title}
            </a>
          ))}
        </details>
      ))}
    </nav>
  );
});

interface IPage {
  toolbar: React.ReactNode;
  pages: IPageData[];
  pageIndex: number;
  openPage: (page: number) => void;
}

const Page = (props: IPage) => {
  const { toolbar, pages, pageIndex, openPage } = props;

  const buttons = [];
  if (pageIndex > 0) {
    const previousPage = () => openPage(pageIndex - 1);
    buttons.push(
      <Button key="previous" styling="outlined" onClick={previousPage} text="Previous" />,
    );
  }
  if (pageIndex < pages.length - 1) {
    const nextPage = () => openPage(pageIndex + 1);
    buttons.push(<Button key="next" styling="outlined" onClick={nextPage} text="Next" />);
  }

  return (
    <div className="doc-page">
      {toolbar}
      <article className="doc-page-content">
        {pages[pageIndex].sections.map((section) => (
          <section id={section.title.toLowerCase().replaceAll(' ', '-')} key={section.title}>
            <h2>{section.title}</h2>
            {section.content}
          </section>
        ))}
        <ButtonGroup>{buttons}</ButtonGroup>
      </article>
    </div>
  );
};

interface IPageToolbar {
  isIndexOpen: boolean;
  toggleIndex: React.Dispatch<React.SetStateAction<boolean>>;
  controls: string;
}

const PageToolbar = ({ isIndexOpen, toggleIndex, controls }: IPageToolbar) => {
  return (
    <div role="toolbar" className="doc-page-toolbar" data-compact>
      <ToolbarButton
        text="Toggle Index"
        icon={isIndexOpen ? IconSet.DOUBLE_CARET : IconSet.MENU_HAMBURGER}
        pressed={isIndexOpen}
        controls={controls}
        onClick={() => toggleIndex((value) => !value)}
        tabIndex={0}
      />
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
              Library setup refers to the process of getting your images into Allusion, so that they
              are available to be managed and viewed. Rather than manually importing images from
              your filesystem, Allusion focuses on linked folders, which we refer to as{' '}
              <b>Locations</b>. Read on to find out about how to add images to your Allusion
              library.
            </p>
          </>
        ),
      },
      {
        title: 'Locations',
        content: (
          <>
            <p>
              In Allusion, the primary way of adding images to your library is the use of
              "Locations". A location in this context is a link to a folder on your computer. This
              means that all images in that folder as well as any subfolders will be automatically
              loaded once it is added to your list of locations.
              <br />
              The benefit of this system is that you can have full control over where your data is
              stored, while not having to tediously import images manually from various places. To
              add more images, simply place them into the linked folder, and they will automatically
              show up in Allusion.
              <br />
              However, removing images from a linked folder will not automatically remove them from
              Allusion in order to prevent you from losing the tags you assigned to them when you
              accidentially remove your images, or move them elsewhere. To confirm to Allusion the
              files were deleted intentionally, you can select those images in the "Missing images"
              view and pressing the delete button in the toolbar. Otherwise, you can simply place
              the images back to their original path so that Allusion will automatically detect them
              again.
              <br />
              You are free to rename your images, and to move them to a different folder, as long as
              they remain within the same location. Allusion will automatically detect those changes
              upon you restarting the application.
            </p>
            <p>
              To add a new location, open the outliner and hover with your mouse over the location's
              header. You will see a small plus icon to the right. Once you click the icon, go ahead
              and browse the folder that contains images. Confirm your selection and select your
              location preferences in the following popup. You have the option to exclude subfolders
              during this process. Excluding subfolders later is also possible but keep in mind that
              Allusion does not store tag data for excluded folders. Any existing tag data will be
              removed when you choose to exclude a subfolder. Once you confirm, your images will
              show up in the content area.
            </p>
            <p>
              To remove a location, open the outliner and right click on a location. A context menu
              will open with the option to remove your location. You have to confirm this action.
              Please be aware that removing a location will delete all tagging information that may
              have been attached to images of that location. The images themselves on your
              filesystem however, will of course remain.
            </p>
          </>
        ),
      },
      {
        title: 'Drag & Drop',
        content: (
          <>
            <p>
              Another way of quickly importing images is by dragging them into your list of
              locations in the the application window. You can drag them from your file explorer,
              but also from any other sources like a web browser. When dropping those images, they
              will be copied in into the (sub)folder you chose.
            </p>
          </>
        ),
      },
      {
        title: 'Browser Extension',
        content: (
          <>
            <p>
              A browser extension for Chromium-based browsers such as Google Chrome and Edge is
              available. It allows you to import images into Allusion directly from your web browser
              and immediately tag them as well. Take a look in the "Background Processes" section in
              the settings window for more information. Get the extension here from{' '}
              <a
                href={chromeExtensionUrl}
                onClick={(e) => {
                  e.preventDefault();
                  shell.openExternal(chromeExtensionUrl);
                }}
              >
                Chrome Webstore.
              </a>
            </p>
          </>
        ),
      },
      {
        title: 'Tag Import/Export',
        content: (
          <>
            <p>
              You can save the tags stored in Allusion's internal database to the metadata of your
              image files. This allows you to view them in other applications, such as your file
              browser and tools like Adobe Bridge. This option is available in the "Import/Export"
              section of the settings window. Importing tags from file metadata can be performed in
              the same place.
              <br />
              Note that only the images shown in the gallery are affected by these operations!
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
              Although it is possible to create tags on the fly, it is recommended to set up useful
              tags in advance to take full advantage of the organized tag structures that can be
              created in the outliner. The outliner has a tag related section below your locations.
              In this section you are able to create, edit and organize your tags.
            </p>
            <p>
              To create a new tag, simply press the plus icon next to the header. You have to hover
              the mouse over the region for the icon to become visible.
            </p>
            <p>
              To organize your tags, simply drag the list items across the outliner. You can drop
              items onto one another to create a hierarchy. In this way you can turn a list of many
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
              onto an image. This also works on a selection of multiple images. Next, you can select
              an image, press T to open the tag editor, and assign or remove tags from the list.
              This method also allows you to tag multiple images at once. Finally, you can add tags
              by adding them to the list in the inspector panel - the sidebar on the right when
              viewing images at at full size.
            </p>
            <p>
              To remove tags from one or more images, you have to access either the tag editor or
              the inspector. In both places you will be able to remove individual tags or clear the
              entire set of tags on the selected image(s).
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
              In Allusion there are several ways to find specific images. By default, the search bar
              lets you look for images based on their tags. You can press Ctrl-F to focus on the
              searchbar quickly. The advanced search can be accessed from the three dots icon in the
              upper right corner of Allusion.
            </p>
            <p>
              The searchbar that is always visible in the toolbar is the quickest way to search.
              Once you start typing, Allusion will make suggestions with an indication of any parent
              tags. Select the item from the list to add it to your search. You can narrow down an
              image by searching for several tags at once. If you search for two tags, by default,
              Allusion will return all images that have both tags assigned. You can change this
              behavior with the two circles icon on the right side of the search bar to return all
              images that have any of the two tags assigned instead. Finally keep in mind that
              Allusion will search for child tags recursivly by default. You can use the advanced
              search to exclude child tags from the result.
            </p>
          </>
        ),
      },
      {
        title: 'Advanced Search',
        content: (
          <>
            <p>
              The advanced search can be opened by pressing the three dots icon in the upper right
              corner of Allusion, or by using the Ctrl-Shift-F shortcut. In that window you are able
              to create as many search criteria as you wish by listing them up. Enter your criteria
              in the criteria builder section of the advanced search. Then use the plus icon on the
              right side to add the finished criteria to the query editor below. Clicking on search
              will return all images that match with the criteria in the query editor, not with
              anything that is entered in the criteria builder.
            </p>
            <p>
              To take a closer look, each row in the interface represents one criteria and consists
              of three input fields. First select the type of information you want to look for. You
              can search for tags and file properties such as their name, size, type and creation
              date. You can then select an operator such as &quote;equals&quote;, &quote;greater
              than&quote;, &quote;includes&quote; etc. Finally you can enter the value of the
              selected property you wish to look for. Adding multiple criteria will again help you
              narrow down a search result.
            </p>
            <p>
              To provide some extra control when searching with multiple queries, you can swap
              between finding images that match all entered queries, or any of them. This toggle is
              available at the bottom of the advanced search panel, and at the right in the search
              bar when two or more queries have been entered.
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
              the way your images are listed. You can choose between several view modes by using the
              dropdown menu in the toolbar, or by right clicking anywhere in the content area. You
              can also sort the images according to various criteria. Finally, you can also change
              the size of your thumbnails. This can be changed in the context menu too, as well as
              in the settings menu.
            </p>
          </>
        ),
      },
      {
        title: 'Image Details',
        content: (
          <>
            <p>
              Each image carries a lot of information with it such as the file name, url,
              dimensions, etc. Such information can be viewed through the inspector. The inspector
              is a panel that is shown when viewing the image at full size, which can be performed
              by choosing said option in the context menu of an image, or simply by double clicking
              on it. This panel will allow you to see relevant meta-data of the file as well as the
              list of tags assigned to the image. If the inspector is not visible in the full size
              view, find the information icon in the toolbar.
            </p>
          </>
        ),
      },
      {
        title: 'Image Preview Window',
        content: (
          <>
            <p>
              You can also preview images in a separate window by selecting an image and pressing
              the spacebar. The preview window will open and display your images. It is however
              important to take note that the preview window will only allow you to cycle through
              images in your selection. You can therefore select multiple images and preview just
              those in the new window. Press spacebar again to close the window.
            </p>
          </>
        ),
      },
    ],
  },
];
