# Widgets

Widgets are re-usable React components that can be used in any context. This is a complex way to say that the components make no assumptions about the actual application.

This module is designed as if it was meant to be consumed as an external library. Doing so ensures that making changes will not affect the whole code base (loose coupling instead of tight coupling).

## Content

### Common Widgets

- Checkbox
- Button
- ButtonGroup
- IconButton
- IconSet
- Listbox
- Option
- RadioGroup
- Radio
- SVG
- Tag
- Tree
- Toggle

### Command Widgets

#### Toolbar Widgets

Toolbars are any grouping of widgets that control an area/component of the application. It can be **also** used for as a top level application command bar but is not limited to it.

- Toolbar
- ToolbarButton
- ToolbarGroup
- MenuButton
- ToolbarSegment
- ToolbarSegmentButton
- ToolbarToggleButton

#### Menu Widgets

Menus are usually floating panels that show a several commands that the user can execute immediately.

- ContextMenu
- Menu
- MenuCheckboxItem
- MenuDivider
- MenuItem
- MenuRadioGroup
- MenuRadioItem
- SubMenu

### Popover Widgets

Unfortunately naming is inconsistent across literature (hell even in this module) and GUI toolkits because both types of popovers are modal and popovers. For some sanity I chose the Windows UI component names: flyout and dialog.

Flyouts are dismissable light weight containers that 'fly out' (more like pop up) of your application and are the building primitive for the toolbar menu popups as an example.
Dialogs are containers that contain requests to the user and trap the (keyboard and mouse) focus and cannot be as easily dismissed as flyouts. Due to the heavier user experience it is advised only to use it for important tasks (e.g. unreversable operations).

- Alert
- Dialog
- DialogButton
- DialogActions
- Flyout
- Tooltip

## Styling

Each component folder contains one single SASS file named after the folder to avoid having `style.scss` files everywhere.
