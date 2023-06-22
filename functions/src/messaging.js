const { getMessaging } = require('firebase-admin/messaging');
const logger = require('firebase-functions/logger');

const { fetchFcmTokens } = require('./firestore');

// According to Firebase cloud messaging docs, 500 recipients is the limit.
const MAX_RECIPIENTS = 500;

const limitTokens = (tokens) => {
  if (tokens.length <= MAX_RECIPIENTS) {
    return tokens;
  }
  return tokens.slice(0, MAX_RECIPIENTS);
};

exports.sendJoinRequestCreatedNotifications = async (personIds, name) => {
  try {
    const tokens = await fetchFcmTokens(personIds);
    const message = {
      notification: {
        title: 'Liittymispyyntö',
        body: `Käyttäjä haluaa liittyä projektiin ${name}.`,
      },
      tokens: limitTokens(tokens),
    };
    const response = await getMessaging().sendEachForMulticast(message);
    logger.debug(response.successCount + ' notifications were sent');
  } catch (err) {
    logger.error(err.message);
  }
};

exports.sendSlotRequestAcceptedNotifications = async (personIds) => {
  try {
    const tokens = await fetchFcmTokens(personIds);
    const message = {
      notification: {
        title: 'Sait kärryvuoron!',
        body: 'Yksi tai useampi anomus on hyväksytty.',
      },
      tokens: limitTokens(tokens),
    };
    const response = await getMessaging().sendEachForMulticast(message);
    logger.debug(response.successCount + ' notifications were sent');
  } catch (err) {
    logger.error(err.message);
  }
};
