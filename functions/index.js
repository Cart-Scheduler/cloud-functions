/**
 * Currently both 1st and 2nd gen cloud functions are used.
 * Authentication triggers do not yet support 2nd gen cloud functions.
 */

// Imports for 1st gen cloud functions
const { initializeApp } = require('firebase-admin/app');
const functions = require('firebase-functions');

// Imports for 2nd gen cloud functions
const { setGlobalOptions } = require('firebase-functions/v2');
const { onCall } = require('firebase-functions/v2/https');

initializeApp();

const acceptSlotRequests = require('./src/acceptSlotRequests');
const createPerson = require('./src/createPerson');
const createProject = require('./src/createProject');

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

// Callable function for creating new projects
exports.createProject = onCall(createProject);
