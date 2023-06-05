const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const logger = require('firebase-functions/logger');

const db = getFirestore();

/**
 * Creates documents for a new user.
 * 1) user doc
 * 2) person doc
 *
 * This function is triggered automatically when a new authenticated user
 * is created.
 * @param {object} user - UserRecord object
 */
module.exports = async (user) => {
  logger.info('Triggered by new user', user.uid);

  // create a new person doc with a random id
  const data = {
    created: FieldValue.serverTimestamp(),
  };
  if (user.displayName) {
    // pre-fill person's name
    data.name = user.displayName;
  }
  const personRes = await db.collection('persons').add(data);
  logger.info('Person doc created:', personRes.id);

  // create a new user doc using uid
  await db.collection('users').doc(user.uid).set({
    personId: personRes.id,
    created: FieldValue.serverTimestamp(),
  });
  logger.info('User doc created', user.uid);
};
