const { logger } = require('@vestfoldfylke/loglady')
const { callSign } = require('../call-document-sing')

module.exports = async (jobDef, flowStatus) => {
	logger.logConfig({ 
		prefix: 'checkSignStatus' 
	})

	logger.info('Checking sign status for jobId {jobId}', flowStatus.signDocument.result.jobId)
	
	if (!flowStatus.signDocument?.result?.jobId) throw new Error('No signJobId found in flowStatus')
	logger.info('Sign status for jobId {jobId}', flowStatus.signDocument.result.jobId)

	const data = await callSign(`sign/status/${flowStatus.signDocument.result.jobId}`, null, 'GET')

	return data
}
