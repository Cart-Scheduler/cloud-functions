# Cloud Functions for Cart Scheduler

## Setup

Run:

```bash
$ npm install -g firebase-tools
$ firebase login
```

Create `.firebaserc`:

```json
{
  "projects": {
    "default": "YOUR-FIREBASE-PROJECT-ID"
  }
}
```

### Admin Documents in Firestore

Cloud functions require specific documents in Firestore:

#### admin/functions

```json
{
  "apiKey": "YOUR-GENERATED-SECRET"
}
```

Generate your own API key and store it in this document. Some cloud functions require API key and this value must be used.

#### Notification templates

Each notification template is stored as Firestore document under `admin`
collection. Mustache template engine is used to render `title`, `body`
and `link` fields.

Example of notification template document:

```json
{
  "title": "Assigned to {{project}}",
  "body": "Happy for you {{name}}!",
  "link": "https://cart.example/projects/{{projectId}}"
}
```

* `joinReqCreatedNotification`
* `slotReqAcceptedNotification`

## Deployment

Run:

```bash
$ firebase deploy
```

Deploy specific functions:

```bash
$ firebase deploy --only functions:myFunction,functions:anotherFunction
```
