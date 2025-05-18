import React from 'react';
import { observer } from 'mobx-react-lite';
import ProgressBar from 'src/frontend/components/ProgressBar';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { Content } from 'src/frontend/stores/FileStore';

const ContentProgressBar = observer(() => {
  const { fileStore } = useStore();
  const {
    numLoadedFiles,
    fileList,
    numTotalFiles,
    numUntaggedFiles,
    showsQueryContent,
    showsMissingContent,
    showsAllContent,
    showsUntaggedContent,
  } = fileStore;
  let total: number;

  //** logic that includes the "FilesFromBackend" progress in the total and progress */
  if (showsQueryContent || showsMissingContent) {
    if (numLoadedFiles > fileList.length || (numLoadedFiles === 0 && fileList.length > 0)) {
      total = numTotalFiles;
    } else {
      total = fileList.length;
    }
  } else if (showsAllContent) {
    total = numTotalFiles || fileList.length;
  } else if (showsUntaggedContent) {
    total = numUntaggedFiles || fileList.length;
  } else {
    return null;
  }
  let simulatedTotal = total / 2;
  let content = Content.All;
  if (showsQueryContent) {
    content = Content.Query;
  } else if (showsUntaggedContent) {
    content = Content.Untagged;
  }
  const current = numLoadedFiles;
  const AverageTime = total * (fileStore.averageFetchTimes.get(content) ?? 0);

  /** This next block can be removed to show the full FilesFromBackend progress
   * Reassigning the total to a lower value makes the loading animation finish as soon
   * as there are items already loaded and ready to be displayed.
   * This simulates the average time it takes to fetch data and prepares the user
   * for the view to appear, except in the case of showMissingImages.
   */
  if (!showsMissingContent) {
    total = Math.min(total, 1);
    // reasignin simulatedTotal to make the simulated fetch time take 19/20 of the bar exactly
    simulatedTotal = total ? 19 : 0;
  }

  return (
    <ProgressBar
      current={current}
      total={total}
      simulatedTotal={simulatedTotal}
      simulatedDurationMs={AverageTime}
      simulatedResetKey={fileStore.fetchTaskIdPair[0]}
      height={'3px'}
    />
  );
});

export default ContentProgressBar;
