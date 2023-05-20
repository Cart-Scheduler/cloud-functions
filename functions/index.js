/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const functions = require('firebase-functions');

initializeApp();

const createPerson = require('./src/createPerson');

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

/**
 * Returns region where the function is deployed.
 * Can be overridden by env var CART_SCHEDULER_REGION.
 * https://firebase.google.com/docs/functions/locations
 * @return {string} - cloud function region
 */
function getRegion() {
  if (process.env.CART_SCHEDULER_REGION) {
    return process.env.CART_SCHEDULER_REGION;
  }
  // when database location is 'eur3', 'europe-west1' is good for functions
  return 'europe-west1';
}

// Triggered when a new authenticated user is created
exports.createPerson = functions
    .region(getRegion())
    .auth
    .user()
    .onCreate(createPerson);
