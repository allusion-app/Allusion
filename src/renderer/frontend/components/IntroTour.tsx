import React, { useCallback, useState, useContext } from 'react';
import Tour, { ReactourStep, ReactourStepContentArgs } from 'reactour';
import StoreContext from '../contexts/StoreContext';
import UiStore from '../UiStore';
import { observer } from 'mobx-react-lite';

import Logo from '../../resources/logo/favicon_512x512.png';

const stepStyle: React.CSSProperties = {
  background: 'rgb(200, 200, 200)',
};

const SearchStep = observer(({ uiStore, goTo, step }: { uiStore: UiStore } & ReactourStepContentArgs) => {
  if (uiStore.isQuickSearchOpen) {
    setTimeout(() => goTo(step), 200);
  }
  return <span>One of Allusion's main goals is letting you easily find the images you are looking for. <br /> Try clicking the Search button!</span>;
});

const steps = (uiStore: UiStore): ReactourStep[] => [
  {
    content: <>This application provides you with tools for visual library management. Take a quick tour to learn the basics.</>,
    style: stepStyle,
  },
  {
    content: (
      <>
         To get started, click on the plus icon to select a folder that you want to manage.
         In Allusion, such folders are called “locations”.
         Allusion will watch your folder and automatically load all images inside.
         You can have multiple locations at once and remove them without difficulty at any time.
      </>
    ),
    selector: '#outliner',
    style: stepStyle,
  },
  {
    content: (
      <>
        Once you have selected a location, all images will be displayed in the main view.
        The images in Allusion are loaded directly from your folder.
        If you want to remove an image from Allusion, you can either remove the image from its folder or remove the location as a whole.
      </>
    ),
    selector: '.gallery-content',
    style: stepStyle,
  },
  {
    content: (
      <>
        With many locations in place, your library will soon contain thousands of images.
        To manage your data, Allusion allows you to create tags in the tag hierarchy.
        Click on the plus icon to create a new tag.
      </>
    ),
    selector: '#outliner',
    style: stepStyle,
  },
  {
    content: (
      <>
        Now that you have created a tag, you can easily drag it onto an image.
        Alternately, select an image and press (T) to quickly assign a new tag.
      </>
    ),
    style: stepStyle,
  },
  {
    content: (
      <>
        To make sure that all your files have been tagged, you can click here to display only untagged images.
        Similarly, click “Show all images” to return to your complete library.
      </>
    ),
    selector: '#system-tags',
    style: stepStyle,
  },
  {
    content: (
      <>
        Eventually, you may want to find an image.
        To access the search panel, click on the icon here or press (F).
      </>
    ),
    selector: '#outliner-toolbar div :nth-child(3)',
    style: stepStyle,
  },
  {
    content: (
      <>
        Use this search field to filter for images that have a certain tag assigned. For more advanced features…
      </>
    ),
    style: stepStyle,
  },
];


const stepsOld = (uiStore: UiStore): ReactourStep[] => [
  {
    content: (
    <span>
      <img src={Logo} height={128} className="center" />
      <br />
      Welcome to Allusion! A tool for managing your <b>Visual library</b>.
      <br />
      Follow these steps to get started, or you can dismiss them at any time.
      {/* TODO: You can revisit this guide at any time through the settings panel. */}
      <br />
      <br />
      <b>Pro tip:</b> Use the arrow keys to move between steps!
    </span>
    )
  },
  {
    selector: '#outliner',
    content: <div>This is the left sidebar, showing the <i>Tag Panel</i></div>,
    style: stepStyle,
  },
  {
    selector: '#outliner-toolbar div :nth-child(3)',
    content: (stepProps) => <SearchStep uiStore={uiStore} {...stepProps} />,
    action: (node) => node.focus(),
    style: stepStyle,
  },
  {
    selector: '.quick-search',
    content: 'You can find files with specific tags in the Quick Search bar. Advanced Search is available through button on the left for searching by other image properties',
    stepInteraction: false,
    style: stepStyle,
  },
  {
    selector: '#inspector-toolbar div :nth-child(2)',
    content: 'Open the settings panel to configure the application to your liking',
    style: stepStyle,
  },
];

const HIDE_TOUR_STORAGE_KEY = 'hideTour';

/**
 * Note: Might need to reconfigure with another library (e.g. https://docs.react-joyride.com/)
 * The Tour component is quite limited in letting the user interact with the app during the tour
 */
const IntroTour = () => {
  const { uiStore } = useContext(StoreContext);

  const [isTourOpen, setTourOpen] = useState(true); // !Boolean(localStorage.getItem(HIDE_TOUR_STORAGE_KEY)));

  const handleHideTour = useCallback(() => {
    setTourOpen(false);
    localStorage.setItem(HIDE_TOUR_STORAGE_KEY, 'true');
  }, [setTourOpen]);
  console.log(steps(uiStore));

  return (
    <Tour
      isOpen={isTourOpen}
      steps={steps(uiStore)}
      onRequestClose={handleHideTour}
      lastStepNextButton={<span onClick={handleHideTour}>Start!</span>}
      badgeContent={(curr, tot) => `${curr} / ${tot}`}
      disableDotsNavigation
      prevButton={undefined}
      closeWithMask={false}
      rounded={1}
    />
  )
};

export default IntroTour;
