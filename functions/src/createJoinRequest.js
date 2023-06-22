const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const functions = require('firebase-functions');
const logger = require('firebase-functions/logger');

const { getAdmins, readDoc } = require('./firestore');
const { sendJoinRequestCreatedNotifications } = require('./messaging');

const db = getFirestore();


// Throws an error if person is already a project member.
const checkMembership = async (personId, projectId) => {
  const doc = await readDoc('projectMembers', projectId);
  if (doc.members[personId]) {
    throw new functions.https.HttpsError(
        'failed-precondition',
        'Already a member.',
    );
  }
};

const createJoinRequest = async (projectId, personId, name, email) => {
  const res = await db.collection('joinRequests').add({
    projectId,
    personId,
    name,
    email,
    created: FieldValue.serverTimestamp(),
  });
  return res;
};

const sendNotifications = async (projectId, name) => {
  const personIds = await getAdmins(projectId);
  await sendJoinRequestCreatedNotifications(personIds, name);
};

module.exports = async (request) => {
  logger.debug(
      'Create join request',
      request.data,
      request.auth ? request.auth.uid : 'unauthenticated',
  );

  if (!request.auth) {
    throw new functions.https.HttpsError(
        'unauthenticated',
        'The function must be called while authenticated.',
    );
  }

  const { projectId } = request.data;
  const project = await readDoc('projects', projectId);
  if (!project) {
    throw new functions.https.HttpsError(
        'failed-preconditions',
        'Project doc does not exist.',
    );
  }

  const userDoc = await readDoc('users', request.auth.uid);
  if (!userDoc) {
    throw new functions.https.HttpsError(
        'failed-precondition',
        'User doc not found.',
    );
  }
  const { personId } = userDoc;
  await checkMembership(personId, projectId);
  const personDoc = await readDoc('persons', personId);
  const { name } = personDoc;
  if (!name || name.length === 0) {
    throw new functions.https.HttpsError(
        'failed-precondition',
        'Person must have name.',
    );
  }

  const result = await createJoinRequest(
      projectId,
      personId,
      name,
      request.auth.email,
  );
  logger.info('Join request created for project', projectId, result.id);
  await sendNotifications(projectId, project.name);
  return {
    docId: result.id,
  };
};
