const { getGroundControlFiles } = require('../lib/get-ground-control-files')

const xmlFlowStatus = () => ({
  parseXml: {
    jobFinished: true,
    result: {
      files: [
        { name: 'Skjema.pdf', path: 'TFK0282/1287554/1287554.pdf', type: 'H' },
        { name: 'Vedlegg.pdf', path: 'TFK0282/1287554/Vedlegg.pdf', type: 'V' }
      ],
      websakHodeXmlFile: { name: '1287554_WEBSAK_HODE.xml', path: 'TFK0282/1287554/1287554_WEBSAK_HODE.xml' },
      xmlFile: { name: '1287554_data.xml', path: 'TFK0282/1287554/1287554_data.xml' }
    }
  }
})

const jsonFlowStatus = () => ({
  parseJson: {
    jobFinished: true,
    result: {
      files: [
        { name: 'Skjema.pdf', path: 'TFK-109/1287554/1287554.pdf', type: 'H' },
        { name: 'Vedlegg.pdf', path: 'TFK-109/1287554/Vedlegg.pdf', type: 'V' }
      ],
      jsonFile: { name: '1287554_data.json', path: 'TFK-109/1287554/1287554_data.json' }
    }
  }
})

test('copies delivered files, then websak_hode, then the data xml for a parseXml flow', () => {
  expect(getGroundControlFiles(xmlFlowStatus())).toEqual([
    'TFK0282/1287554/1287554.pdf',
    'TFK0282/1287554/Vedlegg.pdf',
    'TFK0282/1287554/1287554_WEBSAK_HODE.xml',
    'TFK0282/1287554/1287554_data.xml'
  ])
})

test('copies delivered files, then the data json for a parseJson flow', () => {
  expect(getGroundControlFiles(jsonFlowStatus())).toEqual([
    'TFK-109/1287554/1287554.pdf',
    'TFK-109/1287554/Vedlegg.pdf',
    'TFK-109/1287554/1287554_data.json'
  ])
})

test('throws naming both parse jobs when neither has finished', () => {
  expect(() => getGroundControlFiles({})).toThrow(/parseXml.*parseJson/)
})

test('throws when the parse job finished but delivered no files', () => {
  const flowStatus = jsonFlowStatus()
  flowStatus.parseJson.result.files = []
  expect(() => getGroundControlFiles(flowStatus)).toThrow(/no files/i)
})

test('prefers parseXml when a flow somehow ran both parse jobs', () => {
  const flowStatus = { ...xmlFlowStatus(), ...jsonFlowStatus() }
  expect(getGroundControlFiles(flowStatus)).toEqual([
    'TFK0282/1287554/1287554.pdf',
    'TFK0282/1287554/Vedlegg.pdf',
    'TFK0282/1287554/1287554_WEBSAK_HODE.xml',
    'TFK0282/1287554/1287554_data.xml'
  ])
})

test('throws when the parse job finished without the metadata file', () => {
  const flowStatus = xmlFlowStatus()
  delete flowStatus.parseXml.result.websakHodeXmlFile
  expect(() => getGroundControlFiles(flowStatus)).toThrow(/websakHodeXmlFile/)
})
