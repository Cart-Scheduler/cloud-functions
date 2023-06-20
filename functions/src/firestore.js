const { getFirestore } = require('firebase-admin/firestore');

const db = getFirestore();

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
 * @param {string} apiKey
 * @return {boolean} true if API key is valid
 */
exports.isValidApiKey = async (apiKey) => {
  const doc = await readDoc('admin', 'functions');
  return apiKey === doc.apiKey;
};
