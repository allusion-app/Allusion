import { Popover } from '@blueprintjs/core';

// Override some Popover props to get crisp context menu's when zoomed in or out. Related: https://github.com/palantir/blueprint/issues/394
// eslint-disable-next-line
// @ts-ignore
const basePopoverModifiers = Popover.prototype.getPopperModifiers;
// eslint-disable-next-line
// @ts-ignore
Popover.prototype.getPopperModifiers = function() {
  const mods = basePopoverModifiers.bind(this)();
  // Todo: Could detect if user is zoomed in or out when applying this, but won't matter much
  mods.computeStyle = { ...mods.computeStyle, gpuAcceleration: false };
  return mods;
};
