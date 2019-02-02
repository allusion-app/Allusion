# Entities
There are three types of every entity:
1. The general properties, defined as an interface
2. The object as it is represented in the database
3. The object as it is stored in the client

In the application client, it is stored in a MobX store, which is a framework that simplifies state management.
MobX refers to client-side entities as Domain Objects.
The goal of defining them as Domain Objects is that they will be updated in the backend automatically when an observed property is updated.

This means that once you have access to a domain object, you can directly modify any of its observable fields and the entity will be updated in the database automatically.
`tag.name = 'something';`

Read more here: https://mobx.js.org/best/store.html
