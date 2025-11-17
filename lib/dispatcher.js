const { list, get, remove } = require('@vtfk/azure-blob-client')
const { storageAccount, retryIntervalMinutes, willNotRunAgainFilename } = require('../config')
const runFlow = require('../lib/run-flow')
const { readdirSync } = require('fs')
const { logger } = require('@vestfoldfylke/loglady')

// takes in a list of blobs, sorts them on acosRefId and returns object indexed on acosRefId with corresponding blobs as value for the refId
const createRefIdCollections = (bloblist) => {
  const collections = {}
  for (const blob of bloblist) {
    const pathList = blob.path.split('/')
    if (pathList.length < 3) {
      // logger.error('Blob has illegal path. Must use folder strategy in Acos avlevering please correct in Acos avlevering and move the blob files to right strategy if they need to be handled {var1}', `${storageAccount.containerName}/${blob.path}`)
      continue
    }
    const refId = pathList[1]
    if (!collections[refId] || !Array.isArray(collections[refId])) {
      collections[refId] = []
    }
    collections[refId].push(blob)
  }
  return collections
}

const mapFlowFile = (filename) => {
  logger.logConfig({
    prefix: 'mapFlowFile'
  })
  // regex: ^\w{3}-\d{2}$ Hvis man vil (for spesielt interesserte)
  const filenameList = filename.split('-')

  if (filenameList.length < 2) {
    logger.error('Flowfile with filename {Filename} is not on valid format. Must be {{acosId}}-{{acosName}}.js', filename)
    filenameList.push('unknownAcosName')
  }
  if (filenameList[0].length === 3 && !isNaN(filenameList[1])) {
    logger.info('Flowfile is in new Interact format: {Filename}', filename)
    if (filenameList.length < 3) {
      logger.error('Flowfile with filename {Filename} is not on valid format. Must be {{acosId}}-{{acosName}}.js', filename)
      filenameList.push('unknownAcosName')
    }
    return {
      filepath: `../flows/${filename}`,
      filename,
      acosId: `${filenameList[0]}-${filenameList[1]}`,
      acosName: filenameList.slice(2, filenameList.length).join('-').replace('.js', '')
    }
  } else {
    logger.info('Flowfile is in old Interact format from the 80s: {Filename}', filename)
    return {
      filepath: `../flows/${filename}`,
      filename,
      acosId: filenameList[0],
      acosName: filenameList.slice(1, filenameList.length).join('-').replace('.js', '')
    }
  }
}

const dispatcher = async () => {
  logger.logConfig({
    prefix: 'azf-acos-interact - Dispatcher'
  })

  let processedRefIds = 0

  logger.info('Running dispatcher')
  const blobOptions = {
    connectionString: storageAccount.connectionString,
    containerName: storageAccount.containerName
  }

  logger.info('Getting all enabled flow definitions from ./flows')
  const schemaNames = readdirSync('./flows').map(filename => mapFlowFile(filename))
  const flows = []
  for (const schema of schemaNames) {
    try {
      const file = require(schema.filepath)
      if (file.config.enabled) {
        flows.push({ ...file, acosId: schema.acosId, acosName: schema.acosName })
      }
    } catch (error) {
      logger.errorException(error, 'Could not require schema flow file {SchemaFilepath}, please verify that schema flow file is valid', schema.filepath)
    }
  }
  logger.info('Got {FlowCount} enabled flow definitions', flows.length)
  let refIdCollections
  for (const flowDef of flows) {
    logger.info('Getting blobs for {AcosId} {AcosName}', flowDef.acosId, flowDef.acosName)
    try {
      const blobs = await list(flowDef.acosId + '/', blobOptions) // sjekk at ikke de nye ID'ene krasjer med hverandre. VFK-1 og VFK-10 (uten slash vil VFK1 også ta med VFK-10)
      refIdCollections = createRefIdCollections(blobs)
    } catch (error) {
      logger.errorException(error, 'Could not get blobs')
    }

    for (const [refId, blobs] of Object.entries(refIdCollections)) {
      let flowStatus
      if (blobs.length === 0) throw new Error(`Ingen blober for ${refId} Dette skal ikke skje!`)
      const blobPathList = blobs[0].path.split('/')
      const blobDir = blobPathList.slice(0, blobPathList.length - 1).join('/')
      try {
        const flowStatusBlob = blobs.find(blob => blob.name === `${refId}-flow-status.json`)
        const now = new Date()
        if (!flowStatusBlob) {
          logger.info('Could not find flowStatusBlob. Probably first run. Creating new - AcosId: {AcosId}, AcosName: {AcosName}, refId: {RefId}', flowDef.acosId, flowDef.acosName, refId)
          flowStatus = {
            createdTimeStamp: now,
            finished: false,
            failed: false,
            refId,
            acosId: flowDef.acosId,
            acosName: flowDef.acosName,
            blobDir,
            runs: 0,
            nextRun: now.toISOString()
          }
        } else {
          const doNotRunAgainBlob = blobs.find(blob => blob.name === `${refId}-${willNotRunAgainFilename}.json`)
          if (doNotRunAgainBlob) {
            // logger.warn('Blob will not run again AcosId AcosName refId {var1} {var2} {var3} {var4}', `Found ${refId}-${willNotRunAgainFilename}.json. Will not run it`, flowDef.acosId, flowDef.acosName, refId)
            continue // blob has failed too many times
          }

          const runAfterTimestampPrefix = `${refId}-run-after-timestamp-`
          const runAfterTimestampBlob = blobs.find(blob => blob.name.startsWith(runAfterTimestampPrefix))
          if (runAfterTimestampBlob) {
            const runAfterTimestamp = new Date(runAfterTimestampBlob.name.replace(runAfterTimestampPrefix, '').replaceAll('__', ':').replace('.json', ''))
            if (runAfterTimestamp.toString() === 'Invalid Date') {
              logger.error('Blob has invalid runAfterTimestamp {BlobName} - AcosId: {AcosId}, AcosName: {AcosName}, refId: {RefId}', runAfterTimestampBlob.name, flowDef.acosId, flowDef.acosName, refId)
              continue
            }
            if (now < runAfterTimestamp) {
              logger.info('Blob is not ready to run yet. Waiting until {RunAfterTimestamp} - AcosId: {AcosId}, AcosName: {AcosName}, refId: {RefId}', runAfterTimestamp.toISOString(), flowDef.acosId, flowDef.acosName, refId)
              continue
            }

            try {
              await remove(runAfterTimestampBlob.path, blobOptions)
            } catch (error) {
              logger.errorException(error, 'Failed to remove runAfterTimestamp blob {BlobName} - AcosId: {AcosId}, AcosName: {AcosName}, refId: {RefId}', runAfterTimestampBlob.name, flowDef.acosId, flowDef.acosName, refId)
            }
          }
          const { data } = await get(flowStatusBlob.path, blobOptions)
          flowStatus = JSON.parse(data)
          if (now < new Date(flowStatus.nextRun)) {
            logger.info('Not ready for retry - AcosId: {AcosId}, AcosName: {AcosName}, refId: {RefId}', flowDef.acosId, flowDef.acosName, refId)
            continue
          }
          if (flowStatus.runs >= retryIntervalMinutes.length) {
            logger.error('Noen har tukla! Blob will not run again and is missing {WillNotRunAgainFilename}. Runs {Runs}/{MaxRuns} - AcosId: {AcosId}, AcosName: {AcosName}, refId: {RefId}', willNotRunAgainFilename, flowStatus.runs, retryIntervalMinutes.length, flowDef.acosId, flowDef.acosName, refId)
            continue // blob has failed too many times
          }
          if (flowStatus.finished) {
            // logger.warn('Blob is already finished and will not run again AcosId AcosName refId {var1} {var2} {var3}', flowDef.acosId, flowDef.acosName, refId)
            continue
          }
          logger.info('Found flowStatusBlob - AcosId: {AcosId}, AcosName: {AcosName}, refId: {RefId}', flowDef.acosId, flowDef.acosName, refId)

          flowStatus.failed = false // Blob is now ready to run again
        }
      } catch (error) {
        logger.errorException(error, 'Failed when creating or getting flow status - AcosId: {AcosId}, AcosName: {AcosName}, refId: {RefId}', flowDef.acosId, flowDef.acosName, refId)
        continue
      }
      await logger.info('Running flow - AcosId: {AcosId}, AcosName: {AcosName}, refId: {RefId}', flowDef.acosId, flowDef.acosName, refId)
      try {
        await runFlow(flowDef, flowStatus, blobs)
      } catch (error) {
        logger.errorException(error, 'Flow failed. There\'s something wrong! Can you hear me Major Tom? Please wake up and do something! Now! - AcosId: {AcosId}, AcosName: {AcosName}, refId: {RefId}', flowDef.acosId, flowDef.acosName, refId)
      }
      processedRefIds++
    }
  }
  logger.info('Dispatcher finished - Processed refIds: {ProcessedRefIds}', processedRefIds)
  return 'run finished'
}

module.exports = { dispatcher, mapFlowFile, createRefIdCollections }
