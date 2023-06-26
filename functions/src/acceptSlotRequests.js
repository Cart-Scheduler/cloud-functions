const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const functions = require('firebase-functions');
const logger = require('firebase-functions/logger');

const { readDoc } = require('./lib/firestore');
const {
  SLOT_REQ_ACCEPTED_TEMPLATE,
  sendNotificationsToPersons,
} = require('./lib/messaging');

const db = getFirestore();

// Reads slotRequest and slot documents.
const readDocuments = async (ids) => {
  const requests = {};
  const slots = {};
  for (let i = 0; i < ids.length; i++) {
    const req = await readDoc('slotRequests', ids[i]);
    if (!req) {
      throw new functions.https.HttpsError(
          'failed-precondition',
          'SlotRequest doc not found!',
      );
    }
    requests[ids[i]] = req;

    const slot = await readDoc('slots', req.slotId);
    if (!slot) {
      throw new functions.https.HttpsError(
          'failed-precondition',
          'Slot doc not found!',
      );
    }
    slots[req.slotId] = slot;
  }
  return {
    requests,
    slots,
  };
};

// Returns all projectIds from given slots.
const getProjectIds = (slots) => {
  const projectIds = Object.values(slots).map((slot) => slot.projectId);
  // remove duplicates
  return Array.from(new Set(projectIds));
};

// Makes sure given personId is admin of given projects.
const checkAdmin = async (personId, projectIds) => {
  for (let i = 0; i < projectIds.length; i++) {
    const data = await readDoc('projectMembers', projectIds[i]);
    if (!data.members[personId].admin) {
      throw new functions.https.HttpsError(
          'permission-denied',
          'User must be project admin',
      );
    }
  }
};

const acceptSlotRequest = async (slotRequest, slotId, slot) => {
  const personIds = slotRequest.persons ? Object.keys(slotRequest.persons) : [];
  const data = {
    modified: FieldValue.serverTimestamp(),
  };
  for (let i = 0; i < personIds.length; i++) {
    const pid = personIds[i];
    data[`persons.${pid}`] = {
      name: slotRequest.persons[pid].name || '-',
    };
  }
  await db.collection('slots').doc(slotId).update(data);
  return personIds;
};

module.exports = async (request) => {
  logger.debug(
      'Accept slot requests',
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

  const { slotRequestIds } = request.data;
  if (!slotRequestIds) {
    throw new functions.https.HttpsError(
        'failed-precondition',
        'Missing slotRequestIds!',
    );
  }
  const { requests, slots } = await readDocuments(slotRequestIds);
  const projectIds = getProjectIds(slots);
  await checkAdmin(userDoc.personId, projectIds);

  // accept slot requests
  let personIds = [];
  const ids = Object.keys(requests);
  for (let i = 0; i < ids.length; i++) {
    const reqId = ids[i];
    const req = requests[reqId];
    const slot = slots[req.slotId];
    const pids = await acceptSlotRequest(req, req.slotId, slot);
    personIds = [...personIds, ...pids];
    // delete slot request after it was accepted successfully
    await db.collection('slotRequests').doc(reqId).delete();
    logger.debug('Slot request accepted and deleted', reqId);
  }

  // remove duplicates
  personIds = Array.from(new Set(personIds));
  await sendNotificationsToPersons(personIds, SLOT_REQ_ACCEPTED_TEMPLATE);

  return {
    slotIds: Object.keys(slots),
  };
};
