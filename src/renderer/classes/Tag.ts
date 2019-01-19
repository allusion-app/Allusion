import { ID, IIdentifiable } from "./ID";

export interface ITag extends IIdentifiable {
    id: ID;
    name: string;
    description?: string;
    dateAdded: Date;
}

export class Tag implements ITag {
    public id: ID;
    public name: string;
    public description?: string;
    public dateAdded: Date;

    constructor(name: string, description?: string) {
        this.name = name;
        this.description = description;
        this.dateAdded = new Date();
    }
}

export interface ITagCategory extends IIdentifiable {
    name: string;
    subCategories: ITagCategory[];
    tags: ITag[];
}
