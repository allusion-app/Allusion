export const triggerContextMenuEvent = (event: React.KeyboardEvent<HTMLLIElement>) => {
  const element = event.currentTarget.querySelector('.tree-content-label');
  if (element !== null) {
    event.stopPropagation();
    const rect = element.getBoundingClientRect();
    element.dispatchEvent(
      new MouseEvent('contextmenu', {
        clientX: rect.right,
        clientY: rect.top,
        bubbles: true,
      }),
    );
  }
};
