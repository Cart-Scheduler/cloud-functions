const { getMessaging } = require('firebase-admin/messaging');
const logger = require('firebase-functions/logger');
const Mustache = require('mustache');

const { chopArray } = require('./array');
const { fetchFcmTokens, readDoc } = require('./firestore');

exports.SLOT_REQ_ACCEPTED_TEMPLATE = 'slotReqAcceptedNotification';
exports.JOIN_REQ_CREATED_TEMPLATE = 'joinReqCreatedNotification';

// According to Firebase cloud messaging docs, 500 recipients is the limit.
const MAX_RECIPIENTS = 500;

const readTemplate = async (name) => {
  const doc = await readDoc('admin', name);
  if (!doc) {
    throw new Error(
        `Notification template not found from Firestore: admin/${name}`,
    );
  }
  return doc;
};

const renderTemplate = async (template, vars) => {
  const tmpl = await readTemplate(template);
  const result = {
    title: Mustache.render(tmpl.title, vars),
    body: Mustache.render(tmpl.body, vars),
  };
  if (tmpl.link) {
    result.link = Mustache.render(tmpl.link, vars);
  }
  return result;
};

const sendNotificationsToPersons = async (personIds, template, vars) => {
  try {
    const { title, body, link } = await renderTemplate(template, vars || {});

    const tokens = await fetchFcmTokens(personIds);
    const message = { notification: { title, body } };
    if (link) {
      message.webpush = { fcm_options: { link } };
    }

    // there is a limit in number of recipients so send in parts
    const choppedTokens = chopArray(tokens, MAX_RECIPIENTS);
    for (let i = 0; i < choppedTokens.length; i++) {
      message.tokens = choppedTokens[i];
      const response = await getMessaging().sendEachForMulticast(message);
      logger.debug(response.successCount + ' notifications were sent');
    }
  } catch (err) {
    logger.error(err.message);
  }
};
exports.sendNotificationsToPersons = sendNotificationsToPersons;
