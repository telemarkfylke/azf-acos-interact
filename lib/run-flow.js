const parseXml = require('./jobs/parse-xml')
const parseJson = require('./jobs/parse-json')
const syncElevmappe = require('./jobs/sync-elevmappe')
const syncEnterprise = require('./jobs/sync-enterprise')
const syncEmployee = require('./jobs/sync-employee')
const syncPrivatePerson = require('./jobs/sync-private-person')
const handleProject = require('./jobs/handle-project')
const handleCase = require('./jobs/handle-case')
const archive = require('./jobs/archive')
const signOff = require('./jobs/sign-off')
const closeCase = require('./jobs/close-case')
const sharepointGetListItem = require('./jobs/sharepoint-get-list-item')
const sharepointList = require('./jobs/sharepoint-list')
const signDocument = require('./jobs/sign-document')
const checkSignStatus = require('./jobs/check-sign-status')
const downLoadSignDocument = require('./jobs/download-document')
const groundControl = require('./jobs/ground-control')
const finishFlow = require('./jobs/finish-flow')
const statistics = require('./jobs/statistics')

const { logger } = require('@vestfoldfylke/loglady')
const { save } = require('@vtfk/azure-blob-client')
const { storageAccount, retryIntervalMinutes, willNotRunAgainFilename } = require('../config')
const blobOptions = {
  connectionString: storageAccount.connectionString,
  containerName: storageAccount.containerName
}

/* Retries forklart

flowStatus.runs er antall ganger flowen HAR kjørt. Den inkrementeres hver gang et nytt forsøk er gjort
retryIntervals er en liste med hvor mange ganger vi skal prøve på nytt. Altså hvis lista er 3 lang, så skal vi totalt kjøre 4 ganger
For å slippe plusser og minuser legger vi derfor til et element først i retryIntervals for å representere den første kjøringen
Første kjøring er kjøring 1 - men runs inkrementeres ikke før vi er ferdige å prøve kjøringen.
Feilhåndteringen får så vite hvor mange ganger jobben er kjørt, og kan bruke flowStatus.runs som index for å sjekke hvor lenge vi skal vente til neste kjøring. Om (flowStatus.runs >= retryIntervals.length), så skal vi ikke prøve mer, og kan gi error-beskjed
Dispatcheren trenger så bare sjekke hvor mange ganger vi har kjørt - og om det er større eller likt antall ganger vi skal kjøre (retryIntervals.length siden den nå er like lang som antall ganger vi skal kjøre)

*/
const handleFailedJob = async (jobName, flowStatus, error) => {
  logger.logConfig({
    prefix: 'handleFailedJob'
  })
  flowStatus.runs++
  const errorMsg = error.response?.data || error.stack || error.toString()
  flowStatus[jobName].error = errorMsg

  if (flowStatus.runs >= retryIntervalMinutes.length) {
    try {
      logger.error('Blob needs care and love - Failed in job {JobName}, Runs: {Runs}/{MaxRuns}. Will not run again. Reset flowStatus.runs to try again - error: {ErrorMsg}', jobName, flowStatus.runs, retryIntervalMinutes.length, errorMsg)
      await save(`${flowStatus.blobDir}/${flowStatus.refId}-flow-status.json`, JSON.stringify(flowStatus, null, 2), blobOptions)
      await save(`${flowStatus.blobDir}/${flowStatus.refId}-${willNotRunAgainFilename}.json`, JSON.stringify({ message: 'Fiks flow-status.json og slett denne filen om du vil at dette skjemaet skal kjøres igjen' }, null, 2), blobOptions)
    } catch (error) {
      logger.errorException(error, 'Dritt og møkk... vi fikk ikke lagret flowStatus til bloben. Ting vil potensielt bli kjørt dobbelt opp - jobben den stoppet på: {JobName}', jobName)
    }
    return
  }
  const minutesToWait = retryIntervalMinutes[flowStatus.runs]
  const now = new Date()
  flowStatus.nextRun = new Date(now.setMinutes(now.getMinutes() + minutesToWait)).toISOString()
  try {
    logger.warn('Failed in job {jobName}. Runs: {runs}/{maxRuns}. Will retry in {minutesToWait} minutes. Error: {errorMsg}', jobName, flowStatus.runs, retryIntervalMinutes.length, minutesToWait, errorMsg)
    await save(`${flowStatus.blobDir}/${flowStatus.refId}-flow-status.json`, JSON.stringify(flowStatus, null, 2), blobOptions)
  } catch (error) {
    logger.errorException(error, 'Dritt og møkk... vi fikk ikke lagret flowStatus til bloben. Ting vil potensielt bli kjørt dobbelt opp. Jobben den stoppet på: {jobName}', jobName)
  }
}
const checkCondition = (jobDef, flowStatus, jobName) => {
  logger.logConfig({
    prefix: 'checkCondition'
  })
  if (!jobDef.options?.condition) return true
  const runJob = jobDef.options.condition(flowStatus)
  logger.info('Running condition function for {jobName}. Result: {runJob}', jobName, runJob)
  return runJob
}

const shouldRun = (flowDef, flowStatus, jobName) => {
  logger.logConfig({
    prefix: 'shouldRun'
  })
  // dersom jobben vi sjekker også er den jobben vi venter på, så må vi sjekke om jobben vi venter på er klar
  // hvis vi venter på en jobb, så trenger vi ikke å sjekke noen andre jobber, der av false
  if (typeof flowStatus.waitingForJob === 'string' && flowStatus.waitingForJob !== jobName) {
    return false
  }

  if (jobName === 'finishFlow') {
    return !flowStatus.failed && !flowStatus[jobName]?.jobFinished
  }

  const isReadyForCheck = !flowStatus.failed && flowDef[jobName]?.enabled && !flowStatus[jobName]?.jobFinished && checkCondition(flowDef[jobName], flowStatus, jobName)
  if (!isReadyForCheck) {
    return false
  }

  const runAfterTimestampFunction = flowDef[jobName]?.options?.runAfterTimestamp
  if (runAfterTimestampFunction) {
    if (typeof runAfterTimestampFunction === 'function') {
      const runAfterTimestamp = runAfterTimestampFunction(flowDef[jobName], flowStatus)
      if (runAfterTimestamp.toString() === 'Invalid Date') {
        logger.error('runAfterTimestampFunction did not return a valid timestamp in job {jobName} with refId: {refId}', jobName, flowStatus.refId)
        return false
      }
      const now = new Date()
      if (now < new Date(runAfterTimestamp)) {
        flowStatus.waitingForJob = jobName
        save(`${flowStatus.blobDir}/${flowStatus.refId}-flow-status.json`, JSON.stringify(flowStatus, null, 2), blobOptions)
          .catch((error) => logger.errorException(error, 'Failed to save flowStatus blob with refId: {refId}. Scheisse, ting kan potensielt bli kjørt flere ganger', flowStatus.refId))

        save(`${flowStatus.blobDir}/${flowStatus.refId}-run-after-timestamp-${runAfterTimestamp.replaceAll(':', '__')}.json`, JSON.stringify({ message: 'Denne filen vil ikke bli plukket opp og kjørt før runAfterTimestamp er passert' }, null, 2), blobOptions)
          .catch((error) => logger.errorException(error, 'Failed to save runAfterTimestamp blob with refId: {refId}', flowStatus.refId))

        logger.info('Job {jobName} is not ready to run yet. Waiting until {runAfterTimestamp}. AcosId: {acosId}, AcosName: {acosName}, refId: {refId}', jobName, runAfterTimestamp, flowStatus.acosId, flowStatus.acosName, flowStatus.refId)
        return false
      }

      logger.info('Job {jobName} is now ready to run. AcosId: {acosId}, AcosName: {acosName}, refId: {refId}', jobName, flowStatus.acosId, flowStatus.acosName, flowStatus.refId)
      delete flowStatus.waitingForJob
    } else {
      logger.error('runAfterTimestampFunction property in job {jobName} is not a function', jobName)
      return false
    }
  }

  return isReadyForCheck
}

const runCustomJobs = async (flowDef, flowStatus, jobName) => {
  const customJobs = Object.entries(flowDef).filter(entry => entry[0].startsWith('customJob') && entry[1].runAfter === jobName).map(entry => entry[0]) // henter aller customJobs som har runAfter lik jobName
  for (const customJobName of customJobs) { // resten håndteres likt som en predefinert jobb
    if (shouldRun(flowDef, flowStatus, customJobName)) {
      if (!flowStatus[customJobName]) flowStatus[customJobName] = { jobFinished: false }
      try {
        flowStatus[customJobName].startedTimestamp = new Date().toISOString()
        const result = await flowDef[customJobName].customJob(flowDef[customJobName], flowStatus) // men her trigger vi customJob fra flowDef istedenfor en job fra jobs-mappa. CustomJob blir da typisk steg i flowen som kun trengs i noen få skjemaflyter
        flowStatus[customJobName].finishedTimestamp = new Date().toISOString()
        flowStatus[customJobName].result = result
        flowStatus[customJobName].jobFinished = true
      } catch (error) {
        flowStatus.failed = true
        await handleFailedJob(customJobName, flowStatus, error)
      }
    }
    await runCustomJobs(flowDef, flowStatus, customJobName)
  }
}

module.exports = async (flowDef, flowStatus, blobs) => {
  // gå gjennom flowDef og kjøre alle jobbene som er definert i flowDef
  /*
  finne alle custom jobber i flowDef og kjøre disse på rett sted i flowen. Custom jobber er definert som async-funksjoner i flowDef. De må ha en funksjon som heter customJob.
  */
  logger.logConfig({
    prefix: `azf-acos-interact - run-flow - ${flowStatus.acosId} - ${flowStatus.acosName} - ${flowStatus.refId}`
  })

  const setupAndCheckJob = async (jobName, jobFunc, multipleJob = false) => {
    if (!multipleJob) {
      return await runJob(jobName, jobFunc)
    }

    const jobNamePrefix = jobName
    const multipleJobNames = Object.keys(flowDef).filter(prop => prop.startsWith(jobNamePrefix))
    for (const multipleJobName of multipleJobNames) {
      const jobDef = flowDef[multipleJobName]
      await runJob(multipleJobName, async () => jobFunc(jobDef))
    }
  }

  // TODO: Varsle eier av skjema eller noe sånt??? Epost, SMS, teams melding, digipost, brev i posten, ringe på døra, gå til kontorplassen og skrike, sende en due med beskjed om at signeringen feilet???, eller noe sånt??
  const handleNonFinishedSignJob = async () => {
    logger.warn('Sign job did not finish successfully. Status: {status}. Will not continue with flow. AcosId: {acosId}, AcosName: {acosName}, refId: {refId}', flowStatus.checkSignStatus.result.status, flowStatus.acosId, flowStatus.acosName, flowStatus.refId)
    flowStatus.failed = true
    await save(`${flowStatus.blobDir}/${flowStatus.refId}-flow-status.json`, JSON.stringify(flowStatus, null, 2), blobOptions)
      .catch((error) => logger.errorException(error, 'Failed to save flowStatus blob with refId: {refId}. Scheisse, ting kan potensielt bli kjørt flere ganger', flowStatus.refId))
  }

  const runJob = async (jobName, jobFunc) => {
    if (shouldRun(flowDef, flowStatus, jobName)) {
      if (!flowStatus[jobName]) flowStatus[jobName] = { jobFinished: false }
      try {
        flowStatus[jobName].startedTimestamp = new Date().toISOString()
        flowStatus[jobName].result = await jobFunc()
        flowStatus[jobName].finishedTimestamp = new Date().toISOString()
        // Sjekk om jobben vi nettopp kjørte er den jobben vi venter på - hvis ja, så må vi sjekke om jobben er ferdig før vi markerer jobben som ferdig og går videre i flowen
        if(jobName === 'checkSignStatus' && !['CompletedSuccessfully', 'Failed', 'Expired'].includes(flowStatus[jobName].result.status)) {

          flowStatus.waitingForJob = jobName
          flowStatus[jobName].jobFinished = false
          await save(`${flowStatus.blobDir}/${flowStatus.refId}-flow-status.json`, JSON.stringify(flowStatus, null, 2), blobOptions)
            .catch((error) => logger.error(error, 'Failed to save flowStatus blob with refId: {refId}. Ting kan potensielt bli kjørt flere ganger', flowStatus.refId))
          logger.info('Sign status is not signed yet. Waiting for {minutesToWait} minutes before checking again. AcosId: {acosId}, AcosName: {acosName}, refId: {refId}', retryIntervalMinutes[flowStatus.runs], flowStatus.acosId, flowStatus.acosName, flowStatus.refId)
          return
        } else if(jobName === 'checkSignStatus' && ['CompletedSuccessfully', 'Failed', 'Expired'].includes(flowStatus[jobName].result.status)) {
          // Vi bør gjøre noe forskjellig avhengig av om signeringen er fullført, feilet eller utløpt. Hvis den er fullført, så kan vi gå videre i flowen som normalt. 
          // Hvis den har feilet eller utløpt, så bør vi kanskje sette flowStatus.failed til true for å stoppe flowen, og eventuelt sende en melding til brukeren om at signeringen feilet eller utløp??

          if(flowStatus[jobName].result.status === 'CompletedSuccessfully') {
            logger.info('Sign status is completed successfully. Moving on to next job. AcosId: {acosId}, AcosName: {acosName}, refId: {refId}', flowStatus.acosId, flowStatus.acosName, flowStatus.refId)
            delete flowStatus.waitingForJob
          } else if (['Failed', 'Expired'].includes(flowStatus[jobName].result.status)){
            return await handleNonFinishedSignJob(flowStatus)
          }
        }

        flowStatus[jobName].jobFinished = true
      } catch (error) {
        flowStatus.failed = true
        await handleFailedJob(jobName, flowStatus, error)
      }
    }
    await runCustomJobs(flowDef, flowStatus, jobName)
  }

  await setupAndCheckJob('parseXml', async () => parseXml(blobs, flowStatus))
  await setupAndCheckJob('parseJson', async () => parseJson(blobs, flowStatus, flowDef.parseJson))
  await setupAndCheckJob('syncElevmappe', async () => syncElevmappe(flowDef.syncElevmappe, flowStatus))
  await setupAndCheckJob('syncEnterprise', async () => syncEnterprise(flowDef.syncEnterprise, flowStatus))
  await setupAndCheckJob('syncPrivatePerson', async (jobDef) => syncPrivatePerson(jobDef, flowStatus), true)
  await setupAndCheckJob('syncEmployee', async () => syncEmployee(flowDef.syncEmployee, flowStatus))
  await setupAndCheckJob('handleProject', async () => handleProject(flowDef.handleProject, flowStatus))
  await setupAndCheckJob('handleCase', async () => handleCase(flowDef.handleCase, flowStatus))
  await setupAndCheckJob('archive', async () => archive(flowDef.archive, flowStatus))
  await setupAndCheckJob('signOff', async () => signOff(flowStatus))
  await setupAndCheckJob('closeCase', async () => closeCase(flowStatus))
  await setupAndCheckJob('sharepointGetListItem', async (jobDef) => sharepointGetListItem(jobDef, flowStatus), true)
  await setupAndCheckJob('sharepointList', async () => sharepointList(flowDef.sharepointList, flowStatus))
  await setupAndCheckJob('signDocument', async () => signDocument(flowDef.signDocument, flowStatus))
  await setupAndCheckJob('checkSignStatus', async () => checkSignStatus(flowDef.checkSignStatus, flowStatus))
  await setupAndCheckJob('downLoadSignDocument', async () => downLoadSignDocument(flowDef.downLoadSignDocument, flowStatus))
  await setupAndCheckJob('statistics', async () => statistics(flowDef.statistics, flowStatus))
  await setupAndCheckJob('groundControl', async () => groundControl(flowStatus))
  await setupAndCheckJob('failOnPurpose', async () => { throw new Error('Æ feeijla med vilje!') })
  await setupAndCheckJob('finishFlow', async () => finishFlow(flowDef.config, flowStatus))
  // Husk å sende inn jobDef dersom du skal kjøre multiple jobber (se sharepointGetListItem over her)
  return flowDef
}
