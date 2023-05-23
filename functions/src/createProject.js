const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const functions = require('firebase-functions');
const logger = require('firebase-functions/logger');

const { readDoc, docExists } = require('./firestore');

const db = getFirestore();

/**
 * Returns true if given project ID is valid.
 * @param {string} projectId
 * @return {boolean}
 */
function projectIdIsValid(projectId) {
  return (projectId === projectId);
}

module.exports = async (request, context) => {
  logger.debug(
      'Create project',
      request.data,
      request.auth ? request.auth.uid : 'unauthenticated',
  );

  if (!request.auth) {
    throw new functions.https.HttpsError(
        'unauthenticated',
        'The function must be called while authenticated.',
    );
  }

  const projectId = request.data.projectId;
  if (!projectIdIsValid(projectId)) {
    throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid argument: projectId',
    );
  }

  const exists = await docExists('projects', projectId);
  if (exists) {
    logger.info('Project creation denied with existing ID', projectId);
    throw new functions.https.HttpsError(
        'invalid-argument',
        'Project ID already exists.',
    );
  }

  const userDoc = await readDoc('users', request.auth.uid);
  if (!userDoc) {
    throw new functions.https.HttpsError(
        'failed-precondition',
        'User doc not found!',
    );
  }

  const personDoc = await readDoc('persons', userDoc.personId);
  if (!userDoc) {
    throw new functions.https.HttpsError(
        'failed-precondition',
        'Person doc not found!',
    );
  }

  await db.collection('projects').doc(projectId).set({
    name: request.data.name,
    modified: FieldValue.serverTimestamp(),
    created: FieldValue.serverTimestamp(),
  });
  logger.info('Project doc created', projectId);

  await db.collection('projectMembers').doc(projectId).set({
    members: {
      [userDoc.personId]: {
        name: personDoc.name,
        admin: true,
      },
    },
    modified: FieldValue.serverTimestamp(),
    created: FieldValue.serverTimestamp(),
  });
  logger.debug('Project members doc created', projectId);

  return {
    projectId,
  };
};
