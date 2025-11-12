(async () => {
  const { AVLEVERING_ROOT, GROUND_CONTROL_STORAGE_ACCOUNT_CONNECTION_STRING, GROUND_CONTROL_STORAGE_ACCOUNT_CONTAINER_NAME } = require('./config')
  const { list, get, remove } = require('@vtfk/azure-blob-client')
  const { writeFileSync, renameSync, mkdirSync, existsSync } = require('fs')
  const { createRefIdCollections } = require('../lib/dispatcher')
  const { logger } = require('@vestfoldfylke/loglady')

  logger.logConfig({
    prefix: 'ground-control - local script'
  })

  const blobOptions = {
    connectionString: GROUND_CONTROL_STORAGE_ACCOUNT_CONNECTION_STRING,
    containerName: GROUND_CONTROL_STORAGE_ACCOUNT_CONTAINER_NAME
  }

  // Make sure root dir exists
  if (!existsSync(AVLEVERING_ROOT)) {
    logger.error('Please create {AVLEVERING_ROOT} directory to be able to continue', AVLEVERING_ROOT)
    throw new Error(`Please create ${AVLEVERING_ROOT} directory to be able to continue`)
  }

  // Get all blobs in storage account
  logger.info('Fetching blobs ready for server download')
  const blobs = await list('*', blobOptions)
  logger.info('Got {blobCount} ready blobs from storage account', blobs.length)

  // Sort on refId (koble sammen filer som tilhører hverandre)
  const refIdCollections = createRefIdCollections(blobs)

  for (const [refId, blobs] of Object.entries(refIdCollections)) {
    try {
      logger.info('Processing refId {refId} - {blobCount} blobs found on this refid', refId, blobs.length)
      if (!blobs.some(blob => blob.name.endsWith('flow-status.json'))) {
        logger.info('RefId {refId} is not finished receiving all blobs - will wait with this refid for next run', refId)
        continue
      }

      // Sjekk om skjema-mappe finnes - hvis ikke opprett
      const schemaName = blobs[0].path.split('/')[0]
      const schemaDir = `${AVLEVERING_ROOT}/${schemaName}`
      const inProgressDir = `${schemaDir}/inprogress`
      if (!existsSync(schemaDir)) mkdirSync(schemaDir)
      if (!existsSync(inProgressDir)) mkdirSync(inProgressDir)

      logger.info('refId {refId} - all blobs present - will download to inProgressDir', refId)
      const blobsToMove = []
      for (const blob of blobs) {
        logger.info('refId {refId} - downloading blob {blobName}', refId, blob.name)
        const blobData = await get(blob.path, { ...blobOptions, encoding: 'base64' })
        writeFileSync(`${inProgressDir}/${blob.name}`, blobData.data, 'base64')
        blobsToMove.push({
          path: `${inProgressDir}/${blob.name}`,
          name: blob.name
        })
        logger.info('refId {refId} - succesfully downloaded blob {blobName}', refId, blob.name)
      }
      logger.info('refId {refId} - succesfully downloaded all blobs to inProgressDir - moving to schemaDir', refId)
      for (const blob of blobsToMove) {
        renameSync(blob.path, `${schemaDir}/${blob.name}`)
      }
      logger.info('refId {refId} - succesfully moved all files to schemaDir, deleting files from storage account', refId)
      await remove(`${schemaName}/${refId}`, blobOptions)
      logger.info('refId {refId} - succesfully deleted files from storage account', refId)
    } catch (error) {
      logger.errorException(error, 'Major Tom to ground control! Error when fetching blobs to ground control. RefId: {refId}', refId)
      continue
    }
  }
  logger.info('Finished downloading all refids and blobs to ground control')
})()
