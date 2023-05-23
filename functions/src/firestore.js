const { getFirestore } = require('firebase-admin/firestore');

const db = getFirestore();

/**
 * Reads a Firestore document.
 * @param {string} collection
 * @param {string} id
 * @return {object} document content
 */
exports.readDoc = async (collection, id) => {
  const ref = db.collection(collection).doc(id);
  const doc = await ref.get();
  return doc.exists ? doc.data() : undefined;
};

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
