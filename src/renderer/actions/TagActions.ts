import { IAppState } from "../App";
import { ID } from "../classes/ID";
import { ITag, Tag } from "../classes/Tag";
import { ITagProps } from "../components/TagList";
import DBRepository from "../repositories/DBRepository";
import IAction from "./Action";

abstract class TagAction {
  protected tagRepository: DBRepository<ITag>;
  constructor(db: DBRepository<ITag>) {
    this.tagRepository = db;
  }
  // public abstract execute(state: Readonly<IAppState>): Promise<Pick<IAppState, 'tags'>>;
  // public abstract unExecute(state: Readonly<IAppState>): Promise<Pick<IAppState, keyof IAppState>>;
}

export class AddTag extends TagAction {
  private tagToAdd: string;
  private addedTagId: ID;

  constructor(db, tagToAdd: string) {
    super(db);
    this.tagToAdd = tagToAdd;
  }

  public async execute<T extends keyof IAppState>({ tags }: Readonly<IAppState>): Promise<Pick<IAppState, T>> {
    const addedTag = await this.tagRepository.create(new Tag(this.tagToAdd));
    this.addedTagId = addedTag.id;
    const addedTagProps: ITagProps = {
      tag: addedTag,
      count:  0,
    };
    return { tags: [...tags, addedTagProps] } as Pick<IAppState, T>;
  }

  public async unExecute<T extends keyof IAppState>({ tags }: Readonly<IAppState>): Promise<Pick<IAppState, T>> {
    await this.tagRepository.remove(this.addedTagId);
    const newTags = tags.filter((tag) => tag.tag.id !== this.addedTagId);
    return { tags: newTags } as Pick<IAppState, T>;
  }
}

export class RemoveTag extends TagAction {
  private tagToDelete: ITag;
  private deletionIndex: number;

  constructor(db, tagToDelete: ITag) {
    super(db);
    this.tagToDelete = tagToDelete;
  }

  public async execute<T extends keyof IAppState>({ tags }: Readonly<IAppState>): Promise<Pick<IAppState, T>> {
    await this.tagRepository.remove(this.tagToDelete.id);
    const newTags = tags.filter((tag) => tag.tag.id !== this.tagToDelete.id);

    // Todo: Files that have this tag should also have this tag removed, but that is not undoable so easily
    // Possible solution: Do a 'cleanup' when application starts/exits, and just don't show deleted tags in UI

    return { tags: newTags } as Pick<IAppState, T>;
  }

  public async unExecute<T extends keyof IAppState>({ tags }: Readonly<IAppState>): Promise<Pick<IAppState, T>> {
    // TODO: Check if tag id is overwritten
    const addedTag = await this.tagRepository.create(this.tagToDelete);
    return { tags: [...tags, addedTag] } as Pick<IAppState, T>;
  }
}

export class UpdateTag extends TagAction {
  private tag: ITag;
  private oldName: string;
  private newName: string;
  private oldDescription: string;
  private newDescription: string;

  constructor(db, tag: ITag, name: string, description: string) {
    super(db);
    this.tag = tag;
    this.oldName = tag.name;
    this.oldDescription = tag.description;
    this.newName = name;
    this.newDescription = description;
  }

  public async execute<T extends keyof IAppState>({ tags }: Readonly<IAppState>): Promise<Pick<IAppState, T>> {
    this.tag.name = this.newName;
    this.tag.description = this.newDescription;
    await this.tagRepository.update(this.tag);

    // Todo: Neater to make copy of tag array
    tags[tags.findIndex((t) => t.tag.id === this.tag.id)].tag = this.tag;
    return { tags } as Pick<IAppState, T>;
  }

  public async unExecute<T extends keyof IAppState>({ tags }: Readonly<IAppState>): Promise<Pick<IAppState, T>> {
    this.tag.name = this.oldName;
    this.tag.description = this.oldDescription;
    await this.tagRepository.update(this.tag);

    // Todo: Neater to make copy of tag array
    tags[tags.findIndex((t) => t.tag.id === this.tag.id)].tag = this.tag;
    return { tags } as Pick<IAppState, T>;
  }
}
