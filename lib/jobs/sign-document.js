const { storageAccount } = require('../../config')
const { logger } = require('@vestfoldfylke/loglady')
const { get } = require('@vtfk/azure-blob-client')
const { callSign } = require('../call-document-sing')

const blobOptions = {
  connectionString: storageAccount.connectionString,
  containerName: storageAccount.containerName
}

module.exports = async (jobDef, flowStatus) => {
	logger.logConfig({ 
		prefix: 'signDocument' 
	})
	logger.info('Starting sign-document job')

	let payload

	const files = flowStatus.parseXml?.result.files || flowStatus.parseJson?.result.files

	const mainDocument = files.find(file => file.type === 'H')
	if (!mainDocument) throw new Error('No file with type "H" found in flowStatus.parse[xml|json].result.files. Something is probably wrong with avlevering from Acos')

	const blobContent = await get(mainDocument.path, { ...blobOptions, encoding: 'base64' })
	const base64 = blobContent.data
	
	const attachmentList = files.filter(file => file.type === 'V')
	const attachments = []
	for (const attachment of attachmentList) {
		const attachmentContent = await get(attachment.path, { ...blobOptions, encoding: 'base64' })
		if (Array.isArray(attachmentContent)) throw new Error(`Found more than one blob on path ${attachment.path}, please check blob and parse[xml|json].result.files (sannsynligvis noe rart med et av filnavnene)!!`) // Da har blob client returnert flere en en blob!!
		if(attachmentContent.extension.toLowerCase() !== 'pdf') {
			logger.warn('Attachment {title} has format {format} which is not supported for signing. Only pdf is supported. This attachment will not be included in the signing job.', attachment.desc, attachmentContent.extension)
			continue
		} 
		const archiveAttachment = {
			title: attachment.desc,
			base64: attachmentContent.data,
			fileType: attachmentContent.extension,
		}
		attachments.push(archiveAttachment)
	}


	const mapper = jobDef.options?.mapper
	if (mapper) {
		logger.info('Mapper is defined in options. Will use it.')
		payload = mapper(flowStatus, base64, attachments)
		payload.sourceSystem = 'azf-acos-interact'

		// Validate payload
		if (!payload.reference) throw new Error('Payload must contain reference')
		if (!(payload.documents.length > 0)) throw new Error('Payload must contain an array of documents with at least one document')
		if (!payload.initiatedBy || !payload.initiatedBy.name || !payload.initiatedBy.email) throw new Error('Payload must contain initiatedBy with name and email')
		if (!payload.signers || !Array.isArray(payload.signers) || payload.signers.length === 0) throw new Error('Payload must contain an array of signers with at least one signer')
	} else {
		logger.info('No mapper defined in options')
		throw new Error('No mapper defined in options for sign-document. Please provide a custom mapper in flow definition')
	}

	const data = await callSign('sign/portal', payload, 'POST')

	logger.info('Sign job created successfully with id: {jobId}', data.jobId)

	return data
}
