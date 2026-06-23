// BlobTriggerSign/index.js
// This function runs when a new blob is created in the specified container.
// TODO: Replace <your-container-name> in function.json with your actual container name.
// TODO: Integrate signing logic using azf-posten-sign API.

const { logger } = require('@vestfoldfylke/loglady');
const { processSingleBlob } = require('../lib/dispatcher');

module.exports = async function (context, myBlob) {
    logger.logConfig({
        prefix: 'azf-acos-interact - BlobTriggerSign'
    })
    try {
        await processSingleBlob(context.bindingData.name);
    } catch (err) {
        logger.errorException(err, 'Error processing single blob: {BlobName}', context.bindingData.name);
    }
};
