const { logger } = require('@vestfoldfylke/loglady')
const { groundControlStorageAccount, storageAccount } = require('../../config')
const { createBlobServiceClient, save } = require('@vtfk/azure-blob-client')
const { BlobSASPermissions } = require('@azure/storage-blob')
const { getGroundControlFiles } = require('../get-ground-control-files')

module.exports = async (flowStatus) => {
  logger.logConfig({
    prefix: 'groundControl'
  })
  logger.info('Copying files to ground-control storage account for local handling')

  const filePaths = getGroundControlFiles(flowStatus)

  logger.info('Copying {fileCount} files (pdf, attachments and metadata)', filePaths.length)

  const blobOptionsSource = {
    connectionString: storageAccount.connectionString,
    containerName: storageAccount.containerName
  }
  const blobOptionsDestination = {
    connectionString: groundControlStorageAccount.connectionString,
    containerName: groundControlStorageAccount.containerName
  }

  const blobClientSource = createBlobServiceClient(blobOptionsSource)
  const blobClientDestination = createBlobServiceClient(blobOptionsDestination)
  const copiedFiles = []

  for (const filePath of filePaths) {
    logger.info('Copying {filePath} to ground control storage account', filePath)
    const sourceBlob = blobClientSource.getContainerClient(blobOptionsSource.containerName).getBlockBlobClient(filePath)
    const destinationBlob = blobClientDestination.getContainerClient(blobOptionsDestination.containerName).getBlockBlobClient(filePath)
    const sasUrl = await sourceBlob.generateSasUrl({ permissions: BlobSASPermissions.parse('r'), expiresOn: new Date((new Date().valueOf() + 60000)) })
    await destinationBlob.syncUploadFromURL(sasUrl)
    logger.info('Finished copying {filePath}', filePath)
    copiedFiles.push(filePath)
  }

  logger.info('Creating flowStatus file in ground control storage account')
  await save(`${flowStatus.blobDir}/${flowStatus.refId}-flow-status.json`, JSON.stringify(flowStatus, null, 2), blobOptionsDestination)
  logger.info('Finished creating flowStatus file')
  copiedFiles.push(`${flowStatus.blobDir}/${flowStatus.refId}-flow-status.json`)

  logger.info('Successfully sent data to ground control blob container')
  return copiedFiles
}
