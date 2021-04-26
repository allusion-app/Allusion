import { IFile } from 'src/entities/File';
import { SearchKeyDict } from 'src/entities/SearchCriteria';

/**
 * Enum variant with associated data for Action enums
 *
 * TypeScript's enum is rather a strongly typed bit flag than a sum type. In
 * other more functional languages, each enum variant can have associated data.
 * Enums use one field as incrementor / bit `flag` to differentiate variants
 * and optionally add `data`. Then using this interface, one creates a type
 * alias similar to string literals.
 *
 * ```
 * const enum Flag {
 *    Foo, // Compiles to 0
 *    Bar, // Compiles to 1
 * }
 * type MyEnum = IAction<Flag.Foo, string> | IAction<Flag.Bar, number>;
 * ```
 */

export interface IAction<F, D> {
  flag: F;
  data: D;
}
/** Map that keeps track of the IDs that are expanded */

export type IExpansionState = { [key: string]: boolean };

export const CustomKeyDict: SearchKeyDict<IFile> = { absolutePath: 'Path', locationId: 'Location' };
