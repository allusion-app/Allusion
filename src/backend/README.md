# Backend

Although we call this our "backend", this section of code all runs in the Electron's renderer process.
This is where image and tag data is persisted to a database (IndexedDB).
The database is exposed to the web application through the `Backend.ts`, which acts as an API to the database.

The idea behind this backend was to create a separation between the back- and frontend you usually find in web applications.
If we ever want to change the type of database we use, this would make it relatively straightforward.

This set-up is not optimal for performant fetching of large amounts of items from the database.
