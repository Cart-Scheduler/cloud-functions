// Sends a notification reminder to persons about their upcoming shift.

const { getFirestore } = require('firebase-admin/firestore');

const { dateToTimestamp } = require('./lib/firestore');
const { sendNotificationsToPersons } = require('./lib/messaging');

const ASSIGNMENT_REMINDER_TEMPLATE = 'assignmentReminderNotification';

const db = getFirestore();

const getAssignedPersonIds = async (starts, ends) => {
  const personIds = new Set();
  // We have to use only 'starts' property in the filter or else we get:
  // "Cannot have inequality filters on multiple properties: [ends, starts]"
  const snapshot = await db
      .collection('slots')
      .where('starts', '>=', dateToTimestamp(starts))
      .where('starts', '<', dateToTimestamp(ends))
      .get();
  snapshot.forEach((doc) => {
    const ids = Object.keys(doc.data().persons || []);
    for (let i = 0; i < ids.length; i++) {
      personIds.add(ids[i]);
    }
  });
  return Array.from(personIds);
};

const getDateRange = () => {
  const starts = new Date();
  starts.setHours(0, 0, 0, 0);
  // move to tomorrow
  starts.setDate(starts.getDate() + 1);

  // get next 24 hours from starts
  const ends = new Date(starts);
  ends.setDate(ends.getDate() + 1);
  return [starts, ends];
};

module.exports = async () => {
  const [starts, ends] = getDateRange();
  const personIds = await getAssignedPersonIds(starts, ends);
  await sendNotificationsToPersons(personIds, ASSIGNMENT_REMINDER_TEMPLATE);
};
