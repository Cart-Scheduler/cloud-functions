const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const logger = require('firebase-functions/logger');

// Firestore has a limit how many comparison values can be used with 'IN'
// operation.
const MAX_IN_COMPARISON_VALUES = 30;

const db = getFirestore();

// Chops given array into chunks where each chunk has maximum
// chunkLength entries. Returns array of arrays.
const chopArray = (arr, chunkLength) => {
  const len = arr.length;
  if (!len) {
    return [[]];
  }
  const result = [];
  for (let i = 0; i < len; i += chunkLength) {
    result.push(arr.slice(i, i + chunkLength));
  }
  return result;
};

/**
 * Reads a Firestore document.
 * @param {string} collection
 * @param {string} id
 * @return {object} document content
 */
const readDoc = async (collection, id) => {
  const ref = db.collection(collection).doc(id);
  const doc = await ref.get();
  return doc.exists ? doc.data() : undefined;
};
exports.readDoc = readDoc;

/**
 * Returns true if Firestore document exists.
 * @param {string} collection
 * @param {string} id
 * @return {boolean} true if doc exists
 */
exports.docExists = async (collection, id) => {
  const ref = db.collection(collection).doc(id);
  const doc = await ref.get();
  return doc.exists;
};

/**
 * Returns true if given API key is valid.
 * Valid API key is defined in Firestore: admin/functions.apiKey
 * @param {string} apiKey
 * @return {boolean} true if API key is valid
 */
exports.isValidApiKey = async (apiKey) => {
  const doc = await readDoc('admin', 'functions');
  if (doc === undefined) {
    logger.warn('Please define API key in Firestore: admin/functions.apiKey');
    return false;
  }
  return apiKey === doc.apiKey;
};

/**
 * Deep clones given objects but converts Firestore.Timestamp to
 * primitive number.
 * @param {object} obj - Object to be cloned
 * @return {object} Cloned object
 */
const serializableClone = (obj) => {
  const clone = {};
  for (const prop in obj) {
    if (Object.hasOwn(obj, prop)) {
      let val = obj[prop];
      if (val instanceof Timestamp) {
        val = val.toMillis();
      } else if (!Array.isArray(val) && val instanceof Object) {
        val = serializableClone(val);
      }
      clone[prop] = val;
    }
  }
  return clone;
};
exports.serializableClone = serializableClone;

/**
 * Returns person IDs who are admin in given project.
 * @param {string} projectId
 * @return {array} Person IDs
 */
const getAdmins = async (projectId) => {
  const doc = await readDoc('projectMembers', projectId);
  if (doc.members) {
    return Object.keys(doc.members).filter((id) => doc.members[id].admin);
  }
  return [];
};
exports.getAdmins = getAdmins;

/**
 * Returns FCM registration tokens that belong to given persons.
 * @param {array} personIds
 * @return {array} FCM tokens
 */
exports.fetchFcmTokens = async (personIds) => {
  // 'IN' operator has a limit how many values can be used, so chop them
  const userIds = [];
  const choppedPersonIds = chopArray(personIds, MAX_IN_COMPARISON_VALUES);
  for (let i = 0; i < choppedPersonIds.length; i++) {
    const userSS = await db
        .collection('users')
        .where('personId', 'in', choppedPersonIds[i])
        .get();
    userSS.forEach((doc) => {
      userIds.push(doc.id);
    });
  }

  const tokens = [];
  const choppedUids = chopArray(userIds, MAX_IN_COMPARISON_VALUES);
  for (let i = 0; i < choppedUids.length; i++) {
    const tokenSS = await db
        .collection('fcmTokens')
        .where('uid', 'in', choppedUids[i])
        .get();
    tokenSS.forEach((doc) => {
      tokens.push(doc.data().token);
    });
  }

  // remove duplicates
  return Array.from(new Set(tokens));
};
