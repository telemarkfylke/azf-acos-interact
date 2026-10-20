jest.mock('axios')
jest.mock('@vtfk/azure-blob-client', () => ({ get: jest.fn(), save: jest.fn() }))
jest.mock('../lib/get-entraid-token', () => jest.fn(async () => 'graph-token'))
jest.mock('../lib/get-sharepoint-token', () => jest.fn(async () => 'sp-token'))
jest.mock('../lib/graph-actions', () => ({
  getListAndSiteIdAndName: jest.fn(async () => ({ siteId: 'site-id', listId: 'list-id', siteName: 'site-name' }))
}))

const axios = require('axios')
const { get } = require('@vtfk/azure-blob-client')
const { logger } = require('@vestfoldfylke/loglady')
const sharepointList = require('../lib/jobs/sharepoint-list')

const listUrl = 'https://tenant.sharepoint.com/sites/site-name/Lists/TestList/AllItems.aspx'

const createJobDef = (items) => ({
  enabled: true,
  options: {
    mapper: () => items
  }
})

const createFlowStatus = (sharepointList = {}) => ({
  refId: 'ref-123',
  acosId: 'TEST-01',
  acosName: 'Testskjema',
  parseXml: {
    result: {
      files: [
        { type: 'H', name: 'skjema.pdf', desc: 'Skjema', path: 'blob/skjema.pdf' },
        { type: 'V', name: 'vedlegg.pdf', desc: 'Vedlegg', path: 'blob/vedlegg.pdf' }
      ]
    }
  },
  sharepointList
})

const getThrownError = async (promise) => {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('Expected promise to reject')
}

beforeEach(() => {
  jest.resetAllMocks()
  jest.spyOn(logger, 'info').mockImplementation(() => {})
  jest.spyOn(logger, 'errorException').mockImplementation(() => {})
  const { getListAndSiteIdAndName } = require('../lib/graph-actions')
  getListAndSiteIdAndName.mockResolvedValue({ siteId: 'site-id', listId: 'list-id', siteName: 'site-name' })
})

describe('sharepointList error message', () => {
  test('includes list url, status and Graph error when item creation fails', async () => {
    axios.post.mockResolvedValue({
      data: {
        responses: [
          { id: '1', status: 400, body: { error: { code: 'invalidRequest', message: "Field 'Foo' is not recognized" } } }
        ]
      }
    })
    const flowStatus = createFlowStatus()
    const error = await getThrownError(sharepointList(createJobDef([{ testListUrl: listUrl, fields: { Title: 'Test' } }]), flowStatus))

    expect(error).not.toBeInstanceOf(TypeError)
    expect(error.message).toContain('Error creating 1 of 1 items')
    expect(error.message).toContain(`list: ${listUrl}, status: 400, error: invalidRequest - Field 'Foo' is not recognized`)
    expect(flowStatus.sharepointList.retryPayload.requests).toHaveLength(1)
  })

  test('only lists the failed items when some items succeed', async () => {
    const otherListUrl = 'https://tenant.sharepoint.com/sites/site-name/Lists/OtherList/AllItems.aspx'
    axios.post.mockResolvedValue({
      data: {
        responses: [
          { id: '1', status: 201, body: { id: '42' } },
          { id: '2', status: 404, body: { error: { code: 'itemNotFound', message: 'List not found' } } }
        ]
      }
    })
    const error = await getThrownError(sharepointList(createJobDef([
      { testListUrl: listUrl, fields: { Title: 'OK' } },
      { testListUrl: otherListUrl, fields: { Title: 'Fails' } }
    ]), createFlowStatus()))

    expect(error.message).toContain('Error creating 1 of 2 items')
    expect(error.message).toContain(`list: ${otherListUrl}, status: 404, error: itemNotFound - List not found`)
    expect(error.message).not.toContain(`list: ${listUrl},`)
  })

  test('does not throw a TypeError when the failed Graph response has no body', async () => {
    axios.post.mockResolvedValue({
      data: {
        responses: [{ id: '1', status: 500 }]
      }
    })
    const error = await getThrownError(sharepointList(createJobDef([{ testListUrl: listUrl, fields: {} }]), createFlowStatus()))

    expect(error).not.toBeInstanceOf(TypeError)
    expect(error.message).toContain(`list: ${listUrl}, status: 500`)
  })

  test('includes list url and file name when file upload fails', async () => {
    axios.post.mockResolvedValue({
      data: {
        responses: [{ id: '1', status: 201, body: { id: '42' } }]
      }
    })
    get.mockRejectedValue(new Error('Blob not found'))
    const flowStatus = createFlowStatus()
    const error = await getThrownError(sharepointList(createJobDef([{ testListUrl: listUrl, fields: {}, uploadFormPdf: true }]), flowStatus))

    expect(error).not.toBeInstanceOf(TypeError)
    expect(error.message).toContain('Error creating 0 of 1 items')
    expect(error.message).toContain('Error uploading 1 of 1 files')
    expect(error.message).toContain(`list: ${listUrl}, file: Skjema`)
    expect(flowStatus.sharepointList.fileUploads).toHaveLength(1)
  })

  test('handles a retry with only failed file uploads (no Graph batch call)', async () => {
    get.mockRejectedValue(new Error('Blob not found'))
    const flowStatus = createFlowStatus({
      retryPayload: { requests: [] },
      fileUploads: [{ listUrl, listId: 'list-id', siteName: 'site-name', spItemId: '42', file: { name: 'skjema.pdf', desc: 'Skjema', path: 'blob/skjema.pdf' } }]
    })
    const error = await getThrownError(sharepointList(createJobDef([{ testListUrl: listUrl, fields: {} }]), flowStatus))

    expect(axios.post).not.toHaveBeenCalled()
    expect(error).not.toBeInstanceOf(TypeError)
    expect(error.message).toContain('Error creating 0 of 0 items')
    expect(error.message).toContain(`Details: list: ${listUrl}, file: Skjema.`)
  })

  test('does not throw when everything succeeds', async () => {
    const graphResult = { responses: [{ id: '1', status: 201, body: { id: '42' } }] }
    axios.post.mockResolvedValue({ data: graphResult })

    await expect(sharepointList(createJobDef([{ testListUrl: listUrl, fields: {} }]), createFlowStatus())).resolves.toEqual(graphResult)
  })
})
