const axios = require('axios').default
const { logger } = require('@vestfoldfylke/loglady')
const { callSign } = require('../call-document-sing')
const { save } = require('@vtfk/azure-blob-client')
const { storageAccount } = require('../../config')

const blobOptions = {
  connectionString: storageAccount.connectionString,
  containerName: storageAccount.containerName
}

module.exports = async (jobDef, flowStatus) => {
	logger.logConfig({ prefix: 'downloadDocument' })
	if (!flowStatus.signDocument.result.jobId) throw new Error('No signJobId found in flowStatus')
	logger.info('Downloading signed document for jobId {jobId}', flowStatus.signDocument.result.jobId)
	
	const data = await callSign(`sign/document/${flowStatus.signDocument.result.jobId}`, null, 'GET')
	logger.info('Downloaded signed document for jobId {jobId}', flowStatus.signDocument.result.jobId)

	// Validate that the data is a PDF buffer
	if (!Buffer.isBuffer(data) || data.slice(0, 4).toString() !== '%PDF') {
		logger.error('Downloaded data is not a valid PDF. First bytes: {bytes}', data.slice(0, 16).toString())
		throw new Error('Downloaded data is not a valid PDF file')
	}

	// Save the signed document to blob storage for later use in the flow
	const blobName = `${flowStatus.refId}-signed.pdf`
	const saveSignedDocToBlob = await save(`${flowStatus.blobDir}/${blobName}`, data, { ...blobOptions })
	logger.info('Saved signed document to blob storage with name {blobName}', blobName)

	const dataObject = {
		blobName,
		saveSignedDocToBlob
	}

	return dataObject
}
