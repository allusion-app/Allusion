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

    constructor(id: ID, name: string, description?: string) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.dateAdded = new Date();
    }
}
