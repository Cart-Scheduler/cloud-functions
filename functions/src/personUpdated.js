const { getFirestore } = require('firebase-admin/firestore');
const logger = require('firebase-functions/logger');

const db = getFirestore();

const updateJoinRequests = async (personId, name) => {
  const joinRequests = db.collection('joinRequests');
  const ss = await joinRequests
      .where('personId', '==', personId)
      .get();

  const batch = db.batch();
  ss.forEach((doc) => {
    const docRef = joinRequests.doc(doc.id);
    batch.update(docRef, { name });
  });
  await batch.commit();
};

const updateProjectMembers = async (personId, name) => {
  const projectMembers = db.collection('projectMembers');
  const ss = await projectMembers
      .where(`members.${personId}`, '!=', null)
      .get();

  const batch = db.batch();
  ss.forEach((doc) => {
    const docRef = projectMembers.doc(doc.id);
    batch.update(docRef, {
      // touch only person's name
      [`members.${personId}.name`]: name,
    });
  });
  await batch.commit();
};

module.exports = async (event) => {
  const personId = event.params.personId;

  // log slot changes for troubleshooting
  logger.log('Person updated', {
    id: personId,
    before: event.data.before.data(),
    after: event.data.after.data(),
  });

  const oldName = event.data.before.data().name;
  const newName = event.data.after.data().name;
  if (oldName !== newName) {
    // sync new name to other documents
    await updateJoinRequests(personId, newName);
    await updateProjectMembers(personId, newName);
  }
};
