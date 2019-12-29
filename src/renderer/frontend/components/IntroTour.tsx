import React, { useCallback, useState, useContext } from 'react';
import Tour, { ReactourStep, ReactourStepContentArgs } from 'reactour';
import StoreContext from '../contexts/StoreContext';
import UiStore from '../UiStore';
import { observer } from 'mobx-react-lite';

import Logo from '../../resources/logo/favicon_512x512.png';

const stepStyle: React.CSSProperties = {
  background: 'rgb(200, 200, 200)',
  fontFamily: '"Comic Sans MS"'
};

const SearchStep = observer(({ uiStore, goTo, step }: { uiStore: UiStore } & ReactourStepContentArgs) => {
  if (uiStore.isQuickSearchOpen) {
    setTimeout(() => goTo(step), 200);
  }
  return <span>One of Allusion's main goals is letting you easily find the images you are looking for. <br /> Try clicking the Search button!</span>;
});

const steps = (uiStore: UiStore): ReactourStep[] => [
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
      // lastStepNextButton={<span>Finish!</span>}
      badgeContent={(curr, tot) => `${curr} / ${tot}`}
      disableDotsNavigation
      prevButton={undefined}
    />
  )
};

export default IntroTour;
