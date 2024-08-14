const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const functions = require('firebase-functions');
const logger = require('firebase-functions/logger');

const { readDoc } = require('./lib/firestore');

const db = getFirestore();

const getUserIds = async (personId) => {
  const userIds = [];
  const snapshot = await db
      .collection('users')
      .where('personId', '==', personId)
      .get();
  snapshot.forEach((doc) => {
    userIds.push(doc.id);
  });
  return userIds;
};

const maskEmail = (email) => {
  if (!email) {
    return '*';
  }
  const parts = email.split('@');
  if (parts.length > 1) {
    return `*@${parts[1]}`;
  }
  return '*';
};

const parseRecords = (records) => {
  return {
    emails: records.map((user) => maskEmail(user.email)),
  };
};

module.exports = async (request) => {
  logger.debug(
      'Query person',
      request.data,
      request.auth ? request.auth.uid : 'unauthenticated',
  );

  if (!request.auth) {
    throw new functions.https.HttpsError(
        'unauthenticated',
        'The function must be called while authenticated.',
    );
  }

  const userDoc = await readDoc('users', request.auth.uid);
  if (!userDoc) {
    throw new functions.https.HttpsError(
        'failed-precondition',
        'User doc not found!',
    );
  }

  const { personId, projectId } = request.data;

  const projectMembers = await readDoc('projectMembers', projectId);
  if (!projectMembers) {
    throw new functions.https.HttpsError(
        'failed-precondition',
        'Project members doc not found!',
    );
  }

  const member = projectMembers.members[userDoc.personId];
  if (!member || member.admin !== true) {
    throw new functions.https.HttpsError(
        'permission-denied',
        'User must be project admin',
    );
  }

  if (projectMembers.members[personId] === undefined) {
    throw new functions.https.HttpsError(
        'failed-precondition',
        'Person ID is not project member.',
    );
  }

  const uids = await getUserIds(personId);
  const results = await getAuth().getUsers(uids.map((uid) => ({ uid })));
  const records = [];
  results.users.forEach((userRecord) => {
    records.push(userRecord);
  });
  return parseRecords(records);
};
