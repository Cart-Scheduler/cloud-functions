/**
 * Currently both 1st and 2nd gen cloud functions are used.
 * Authentication triggers do not yet support 2nd gen cloud functions.
 */

// Imports for 1st gen cloud functions
const { initializeApp } = require('firebase-admin/app');
const functions = require('firebase-functions');
const logger = require('firebase-functions/logger');

// Imports for 2nd gen cloud functions
const { setGlobalOptions } = require('firebase-functions/v2');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onCall } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');

initializeApp();

const acceptSlotRequests = require('./src/acceptSlotRequests');
const createJoinRequest = require('./src/createJoinRequest');
const createPerson = require('./src/createPerson');
const createProject = require('./src/createProject');
const personUpdated = require('./src/personUpdated');
const sendReminders = require('./src/sendReminders');
const slotUpdated = require('./src/slotUpdated');

/**
 * Returns region where the function is deployed.
 * For example when Firestore location is eur3,
 * europe-west1 is good region for functions.
 * https://firebase.google.com/docs/functions/locations
 *
 * Value is overridden by env var CART_SCHEDULER_REGION.
 * @return {string} - cloud function region
 */
function getRegion() {
  if (process.env.CART_SCHEDULER_REGION) {
    return process.env.CART_SCHEDULER_REGION;
  }
  // default location
  return 'europe-west1';
}

// Set region for all 2nd gen cloud functions
setGlobalOptions({ region: getRegion() });

// Triggered when a new authenticated user is created.
// Authentication triggers do not yet support 2nd gen functions.
exports.createPerson = functions
    .region(getRegion())
    .auth
    .user()
    .onCreate(createPerson);

// Callable function for accepting slot requests
exports.acceptSlotRequests = onCall(acceptSlotRequests);

// Callable function for creating a join request
exports.createJoinRequest = onCall(createJoinRequest);

// Callable function for creating new projects
exports.createProject = onCall(createProject);

// Scheduled function to be run daily.
exports.dailyTasks = onSchedule('every day 09:00', async (event) => {
  try {
    await sendReminders();
    logger.debug('Daily reminders sent');
  } catch (err) {
    logger.error(err.message);
  }
});

exports.updatePerson = onDocumentUpdated('persons/{personId}', personUpdated);
exports.updateSlot = onDocumentUpdated('slots/{slotId}', slotUpdated);
