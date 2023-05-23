const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const functions = require('firebase-functions');
const logger = require('firebase-functions/logger');

const { readDoc, docExists } = require('./firestore');

const db = getFirestore();

/**
 * Throws an error if given project ID is invalid.
 * Requirements for document ID:
 * https://firebase.google.com/docs/firestore/quotas#collections_documents_and_fields
 * @param {string} id - project ID
 * @return {undefined}
 */
function validateProjectId(id) {
  const minLength = 6;
  const maxLength = 32;

  if (typeof id !== 'string') {
    throw new functions.https.HttpsError(
        'invalid-argument',
        'Project ID must be a string.',
    );
  }

  if (id.length < minLength) {
    throw new functions.https.HttpsError(
        'invalid-argument',
        'Min length for project ID is ' + minLength,
    );
  }

  if (id.length > maxLength) {
    throw new functions.https.HttpsError(
        'invalid-argument',
        'Max length for project ID is ' + maxLength,
    );
  }

  if (id === '.' || id === '..' || /__.*__/.test(id)) {
    throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid project ID.',
    );
  }

  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(id)) {
    throw new functions.https.HttpsError(
        'invalid-argument',
        'Project ID must contain only letters, digits, "-" and "_".',
    );
  }
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

  const projectId = request.data.id;
  validateProjectId(projectId);

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
