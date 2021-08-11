import { IExpansionState } from '../types';

export default abstract class TreeItemRevealer {
  private setExpansion?: React.Dispatch<React.SetStateAction<IExpansionState>>;

  protected initializeExpansion(
    setExpansion: React.Dispatch<React.SetStateAction<IExpansionState>>,
  ) {
    this.setExpansion = setExpansion;
  }

  /**
   * Expands all (sub)locations to the sublocation that contains the specified file, then focuses that (sub)location <li /> element.
   * @param dataIds List of items in hierarchy to the item to reveal. Item to reveal should be the last item.
   */
  protected revealTreeItem(dataIds: string[]) {
    if (!this.setExpansion) throw new Error('TreeItemRevealer was not initialized!');

    // For every item on its path to the item to reveal, expand it, and then scrollTo + focus the item
    this.setExpansion?.((exp) => {
      const newExpansionState = { ...exp };
      for (const id of dataIds) {
        newExpansionState[id] = true;
      }
      return newExpansionState;
    });

    setTimeout(() => {
      const dataId = encodeURIComponent(dataIds[dataIds.length - 1]);
      const elem = document.querySelector(`li[data-id="${dataId}"]`) as HTMLLIElement;
      if (elem) {
        // Smooth scroll + focus
        elem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        elem.focus({ preventScroll: true });
        // Scroll again after a while, in case it took longer to expand than expected
        setTimeout(
          () => elem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' }),
          300,
        );
      } else {
        console.error('Couldnt find list element for TreeItem dataId', dataId, dataIds);
      }
    }, 200); // wait for items to expand
  }
}
