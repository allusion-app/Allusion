import { observer } from 'mobx-react-lite';
import { ClientTag } from 'src/entities/Tag';
import { useStore } from 'src/frontend/contexts/StoreContext';
import React from 'react';
import { Thumbnail } from './GalleryItem';
import { ContentRect } from './utils';
import { ROOT_TAG_ID } from 'src/api/tag';
import { ClientFile } from 'src/entities/File';

const LeafTag = ({ tag }: { tag: ClientTag }) => {
  const { fileStore, uiStore } = useStore();
  const files = fileStore.fileList.filter((f) => f.tags.has(tag));
  // TODO: if tag has no sub-tags, just open masonry view with that tag?

  return (
    <>
      {files.map((f) => (
        <div key={f.id} className="tag-preview" onClick={() => uiStore.setTagBrowserTag(tag)}>
          <div className="tag-preview-name">{f.name}</div>
          <div className="tag-preview-thumbnails">
            <Thumbnail file={f} mounted />
          </div>
        </div>
      ))}
    </>
  );
};

const TagPreview: React.FC<{ tag: ClientTag; maxPreviewThumbnails?: number }> = observer(
  ({ tag, maxPreviewThumbnails = 3 }) => {
    const { fileStore, uiStore } = useStore();

    const subTags = Array.from(tag.getSubTree());

    // TODO: find multiple (3?) files
    // TODO: can be more efficient by pre-computing tag->file mapping
    // TODO: the fileList might not contain all files with the tag. Look up in DB directly?
    const files: ClientFile[] = [];
    for (const file of fileStore.fileList) {
      if (subTags.some((t) => file.tags.has(t))) {
        files.push(file);
        if (files.length >= maxPreviewThumbnails) {
          break;
        }
      }
    }

    return (
      <div className="tag-preview" onClick={() => uiStore.setTagBrowserTag(tag)}>
        <div className="tag-preview-name">{tag.name}</div>
        <div className="tag-preview-thumbnails">
          {files.map((f) => (
            <Thumbnail key={f.id} file={f} mounted />
          ))}
        </div>
      </div>
    );
  },
);

const TagDirectory: React.FC<{ tag: ClientTag; contentRect: ContentRect }> = observer(
  ({ tag, contentRect }) => {
    const { uiStore, tagStore } = useStore();

    return (
      <div
        className="tag-directory"
        style={{
          height: contentRect.height,
          width: contentRect.width,
        }}
      >
        <header>
          <h1>{tag.name}</h1>
          {/* Breadcrumbs */}
          <h2>
            {tag.id !== ROOT_TAG_ID && (
              <span>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    uiStore.setTagBrowserTag(tagStore.root);
                  }}
                >
                  Root
                </a>
                {' > '}
              </span>
            )}
            {Array.from(tag.getAncestors())
              .reverse()
              .map((parent, i, list) => (
                <span key={parent.id}>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      uiStore.setTagBrowserTag(parent);
                    }}
                  >
                    {parent.name}
                  </a>
                  {i < list.length - 1 && ' > '}
                </span>
              ))}
          </h2>
        </header>
        <div className="tag-directory-scroller">
          <div className="tag-directory-content">
            {tag.subTags.map((subTag) => (
              <TagPreview key={subTag.id} tag={subTag} />
            ))}
            <br />
            <LeafTag tag={tag} />
          </div>
        </div>
      </div>
    );
  },
);

const TagBrowser: React.FC<{
  contentRect: ContentRect;
}> = observer(({ contentRect }) => {
  const { uiStore } = useStore();

  if (!uiStore.tagBrowserTag) {
    return null;
  }

  return <TagDirectory tag={uiStore.tagBrowserTag} contentRect={contentRect} />;
});

export default TagBrowser;
