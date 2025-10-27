const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const logger = require('firebase-functions/logger');

const db = getFirestore();

/**
 * Poistaa kaikki slot- ja slotRequest-dokumentit KAIKISTA projekteista,
 * jotka ovat vanhempia kuin 365 päivää.
 */
const cleanupData = async () => {
  logger.info('Cleanup started. Deleting slot and slotRequest docs older than 365 days.');


  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 365);

  const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

  const collectionsToClean = ['slots', 'slotRequests'];
  let totalDeletedCount = 0;

  for (const collectionName of collectionsToClean) {
    const collectionRef = db.collection(collectionName);

    const querySnapshot = await collectionRef
      .where('created', '<', cutoffTimestamp)
      .get();

    if (querySnapshot.empty) {
      logger.log(`No old documents in collection ${collectionName}.`);
      continue;
    }

    const batch = db.batch();

    querySnapshot.forEach((doc) => {

      batch.delete(doc.ref);
    });

    await batch.commit();

    totalDeletedCount += querySnapshot.size;
    logger.log(`Deleted ${querySnapshot.size} documents from collection ${collectionName}.`);
  }

  logger.info(`Cleanup complete. Deleted total: ${totalDeletedCount}`);
  return totalDeletedCount;
};


module.exports = { cleanupData };
