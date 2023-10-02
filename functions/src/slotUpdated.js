const logger = require('firebase-functions/logger');

module.exports = async (event) => {
  // log slot changes for troubleshooting
  logger.log('Slot updated', {
    id: event.params.slotId,
    before: event.data.before.data(),
    after: event.data.after.data(),
  });
};
