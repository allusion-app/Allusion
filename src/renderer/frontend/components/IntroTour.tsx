import React, { useCallback, useState, useContext } from 'react';
import Tour, { ReactourStep, ReactourStepContentArgs } from 'reactour';
import StoreContext from '../contexts/StoreContext';
import UiStore from '../UiStore';
import { observer } from 'mobx-react-lite';

import Logo from '../../resources/logo/favicon_512x512.png';

const stepStyle: React.CSSProperties = {
  background: 'rgb(200, 200, 200)',
};

const SearchStep = observer(
  ({ uiStore, goTo, step }: { uiStore: UiStore } & ReactourStepContentArgs) => {
    if (uiStore.isQuickSearchOpen) {
      setTimeout(() => goTo(step), 200);
    }
    return (
      <span>
        One of Allusion's main goals is letting you easily find the images you are looking for.{' '}
        <br /> Try clicking the Search button!
      </span>
    );
  },
);

const steps = (uiStore: UiStore): ReactourStep[] => [
  {
    content: <>Welcome! This tour will help you familiarize yourself with Allusion!</>,
    style: stepStyle,
  },
  {
    content: (
      <>
        In Allusion you can tag your images, based on Locations. Such Locations are watched folders,
        therefore, any image placed into a location will be displayed in Allusion.
      </>
    ),
    selector: '#outliner',
    style: stepStyle,
  },
  {
    content: (
      <>
        Once you have selected a location, all images will be displayed in the main view. The images
        in Allusion are loaded directly from your folder. If you want to remove an image from
        Allusion, you can either remove the image from its folder or remove the location as a whole.
      </>
    ),
    selector: '.gallery-content',
    style: stepStyle,
  },
  {
    content: (
      <>
        Your default location is a preset folder, to which images are saved when imported by means
        of drag&drop. You can however freely add additional locations to keep your images wherever
        they are.
      </>
    ),
    selector: '#outliner',
    style: stepStyle,
  },
  {
    content: (
      <>
        Click on this icon to add a new location to your library. Once you add a location, images
        will begin appear in the content view.
      </>
    ),
    style: stepStyle,
  },
  {
    content: (
      <>
        Although displayed as part of one big library, rest assured, your data is still in its
        supposed place. Remember that locations are watched folders, therefore, adding and removing
        images from your folder will affect your library in Allusion.
      </>
    ),
    selector: '#system-tags',
    style: stepStyle,
  },
  {
    content: (
      <>
        Now take a look at the outliner. This is where you create and manage tags to be assigned to
        images.
      </>
    ),
    selector: '#outliner-toolbar div :nth-child(3)',
    style: stepStyle,
  },
  {
    content: <>Create a new tag by clicking on the icon here.</>,
    style: stepStyle,
  },
  {
    content: (
      <>
        When you are done setting up your tag hierarchy, simply assign them by dragging onto images.
        You can also select an image and press (T) to access the tag editor.
      </>
    ),
    selector: '#outliner-toolbar div :nth-child(3)',
    style: stepStyle,
  },
  {
    content: (
      <>
        Now you may want to search an image. Simply click on any location, collection or tag to add
        them to your search query.
      </>
    ),
    selector: '#outliner-toolbar div :nth-child(3)',
    style: stepStyle,
  },
  {
    content: <>You can also press the search icon to access the search interface.</>,
    selector: '#outliner-toolbar div :nth-child(3)',
    style: stepStyle,
  },
  {
    content: (
      <>
        You can add and remove search criteria through the search bar. For more detailed queries
        also consider using the advanced search, which can be accessed by clicking the icon at the
        left end of the search bar.
      </>
    ),
    selector: '#outliner-toolbar div :nth-child(3)',
    style: stepStyle,
  },
  {
    content: (
      <>
        This concludes the quick tour of Allusion. If you need any more help, take a look at the
        help center that can be accessed by pressing (H).
      </>
    ),
    selector: '#outliner-toolbar div :nth-child(3)',
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
    ),
  },
  {
    selector: '#outliner',
    content: (
      <div>
        This is the left sidebar, showing the <i>Tag Panel</i>
      </div>
    ),
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
    content:
      'You can find files with specific tags in the Quick Search bar. Advanced Search is available through button on the left for searching by other image properties',
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
  );
};

export default IntroTour;
