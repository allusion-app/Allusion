# Conventions

## Terminoligy

- TODO

## Naming

### Code

| Item              | Convention  | Example                          | Exception                            |
| ----------------- | ----------- | -------------------------------- | ------------------------------------ |
| modules           | kebab-case  | `menu-items.ts`                  | React Component/class data structure |
| interfaces        | IPascalCase | `ISerializable`                  |
| types             | PascalCase  | `LocationStore`                  |
| enum variants     | PascalCase  | `enum FileOrder { Asc, Desc }`   |
| functions/methods | camelCase   | `function generateID() { ... }`  | alternatively: arrow functions       |
| React components  | PascalCase  | `const Outliner = () => { ... }` |
| local variables   | camelCase   | `const myVariable = ...;`        |

### Style

| Item            | Convention   | Example              | Exception |
| --------------- | ------------ | -------------------- | --------- |
| modules         | kebab-case   | `settings.scss`      |
| SASS-variables  | \$kebab-case | `$background-color`  |
| CSS-variables   | --kebab-case | `--background-color` |
| classes         | .kebab-case  | `.button`            |
| ids             | #kebab-case  | `#outliner`          |
| data attributes | kebab-case   | `data-dnd`           |

## Styling:

- Make use of nested SASS styling

## Folder structure:

- For the Widgets, use `MyComponent/index.tsx`: Because they have accompanying style files
