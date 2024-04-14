const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const functions = require('firebase-functions');
const logger = require('firebase-functions/logger');

const { getAdmins, readDoc } = require('./lib/firestore');
const {
  JOIN_REQ_CREATED_TEMPLATE,
  sendNotificationsToPersons,
} = require('./lib/messaging');

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

// Returns matching join request doc id or undefined.
const findJoinRequest = async (projectId, personId) => {
  const docs = [];
  const ss = await db
      .collection('joinRequests')
      .where('projectId', '==', projectId)
      .where('personId', '==', personId)
      .get();
  ss.forEach((doc) => {
    docs.push(doc);
  });
  // return the first matching document
  return docs.length > 0 ? docs[0].id : undefined;
};


// Creates or updates existing join request.
const upsertJoinRequest = async (projectId, personId, name, email) => {
  const data = {
    projectId,
    personId,
    name,
    created: FieldValue.serverTimestamp(),
  };
  if (email) {
    // Include user's email for better identification.
    // Name can be easily spoofed.
    data.email = email;
  }

  let res;
  const docId = await findJoinRequest(projectId, personId);
  if (docId) {
    res = await db.collection('joinRequests').doc(docId).set(data);
    logger.info('Join request updated for project', projectId, res.id);
  } else {
    // create new join request document
    res = await db.collection('joinRequests').add(data);
    logger.info('Join request created for project', projectId, res.id);
  }
  return res;
};

const sendNotifications = async (projectId, name) => {
  const personIds = await getAdmins(projectId);
  await sendNotificationsToPersons(
      personIds,
      JOIN_REQ_CREATED_TEMPLATE,
      { project: name },
  );
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

  const result = await upsertJoinRequest(
      projectId,
      personId,
      name,
      request.auth.token.email,
  );
  await sendNotifications(projectId, project.name);
  return {
    docId: result.id,
  };
};
