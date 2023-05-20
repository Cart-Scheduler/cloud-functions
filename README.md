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

## Deployment

Run:

```bash
$ firebase deploy
```

Deploy specific functions:

```bash
$ firebase deploy --only functions:myFunction,functions:anotherFunction
```
