jest.mock('@vtfk/azure-blob-client', () => ({ get: jest.fn(), save: jest.fn(async () => {}) }))

const { logger } = require('@vestfoldfylke/loglady')
const { retryIntervalMinutes } = require('../config')
const runFlow = require('../lib/run-flow')

const flowDef = {
  failOnPurpose: { enabled: true }
}

const createFlowStatus = (runs = 0) => ({
  refId: 'ref-123',
  acosId: 'TEST-01',
  acosName: 'Testskjema',
  blobDir: 'TEST-01/ref-123',
  runs
})

beforeEach(() => {
  jest.restoreAllMocks()
  jest.spyOn(logger, 'info').mockImplementation(() => {})
  jest.spyOn(logger, 'warn').mockImplementation(() => {})
  jest.spyOn(logger, 'error').mockImplementation(() => {})
  jest.spyOn(logger, 'errorException').mockImplementation(() => {})
})

describe('handleFailedJob logs form context', () => {
  test('when the job will be retried', async () => {
    await runFlow(flowDef, createFlowStatus())

    expect(logger.warn).toHaveBeenCalledTimes(1)
    const [template, ...params] = logger.warn.mock.calls[0]
    expect(template).toContain('AcosId: {acosId}, AcosName: {acosName}, refId: {refId}')
    expect(template.match(/{[^}]+}/g)).toHaveLength(params.length)
    expect(params).toEqual(expect.arrayContaining(['failOnPurpose', 'TEST-01', 'Testskjema', 'ref-123']))
  })

  test('when the job will not run again', async () => {
    await runFlow(flowDef, createFlowStatus(retryIntervalMinutes.length - 1))

    expect(logger.error).toHaveBeenCalledTimes(1)
    const [template, ...params] = logger.error.mock.calls[0]
    expect(template).toContain('AcosId: {AcosId}, AcosName: {AcosName}, refId: {RefId}')
    expect(template.match(/{[^}]+}/g)).toHaveLength(params.length)
    expect(params).toEqual(expect.arrayContaining(['failOnPurpose', 'TEST-01', 'Testskjema', 'ref-123']))
  })
})
