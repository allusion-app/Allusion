# Write-up: Sharing Allusion's state across multiple machines

Goal: persisting Allusion's state to disk (preferably automatically)

Use-cases:
- Sharing a Location over a network drive or cloud service (e.g. Dropbox)
- One-time sharing of an export of a Location's data
- Sharing tag structure?

Primarily for personal use: for yourself on multiple machines (home and work). 
Sharing with multiple people would be great, but poses more risks (synchronization conflicts)

## Serialization options
1. [Side-car files](https://en.wikipedia.org/wiki/Sidecar_file): A small (hidden) text file for every image, possibly in a single (hidden) sub-directory in the root of the location or per individual subfolder of the location.  
  Inspiration:
    - [Tagspaces](https://docs.tagspaces.org/tagging/#file-tagging-with-sidecar-file)
    - [RawTherapee](https://rawpedia.rawtherapee.com/Sidecar_Files_-_Processing_Profiles)

    Pros:
    - When moving a folder, the metadata is moved along with it
    - Less probability for conflicts when working on a Location on shared drive

    Cons:
    - I personally hate those little files as a user
    - Sidecar files can be easily separated from their corresponding file when moving/deleting files

2. A single state file per Location, containing the entire Location's database.  
  Inspiration
    - [Eagle library](https://en.eagle.cool/article/480-what-is-the-library?categoryId=155-category), [Eagle package](https://en.eagle.cool/article/522-eagle-package)

    Pros:
    - Easier to implement I expect

    Cons
    - Lots of data (megabytes) that needs to be synced over a shared drive for every change you make

## Dealing with changed state on disk
1. Automatic: Interpret data on disk as true data: Then the internal database might as well be cleared when closing Allusion: When starting up Allusion, wel'll need to process the persisted state when starting up Allusion, and possibly at runtime too.  
This is the more intuitive approach for users I think

2. Manual: Detect and prompt users to replace/merge Allusion's state with what's on disk, keep the internal database as the "true" data

## Dealing with conflicts
Even with "lock" files, conflicts can occur, because changes might be made offline, or with a delay to other client(s).

What happens in practice:
- Dropbox: creates a copy of the file, renamed with "COPY" and who modified it
- Google Drive: ?
- Network drive: ?

Would be nice to at least alert users when conflicts happen, and even better to prompt them with an option to solve a conflict. Not sure if any of that's feasible over all types of folder sharing.


## Serialization issues

`Tag.subTags` is problematic:
- the `modified` date will be updated on a parent when adding/moving a tag into it, or changing their order
- it (theoretically) allows tags to have multiple or no parent tags. Can be avoided with a single `parentId` instead, but this then requires an alternative approach for storing the order of tags below a parent tag.
Index integer relative to parent? Linked list? Storing tree traversal path per tag? Closure table?



## Deserialization issues

- Image files might take a while to download, we can't fetch their metadata when processing the state file; they'll appear as deleted files


## Machine-agnostic data structure
The persisted `File` entries should be machine-agnostic:
- Use forward slashes as separators, this works on Windows too even though it natively uses a backslash
- Only store paths relative to the root of a Location
- TODO: Look into the `ino` value equality across different machines. I expect they will change per machine, but would be nice if not. We currently rely on that for detecting whether a file was moved or (re)created


## Which tags to store per Location
Options:
1. Store all of Allusions tags on all Locations
2. Store only the tags used on images per Location
3. Store the entire subtrees of tags used on images per Location

Alternative approach which prevents having this concern:

## Workspaces
Proposed in meeting of 7-1-23: Alternative to sharing individual Locations

A Workspace is a separate visual library: a different tag structure and other Locations. Would be nice to swap between different visual libraries for different purposes, or those of other people

- Could export the entirety of Allusion's data into a single place, no need to concern with individual Locations.
- If some Locations cannot be found on another machine, because they're not on a shared drive, they can simply appear as "missing"/"unlinked"
