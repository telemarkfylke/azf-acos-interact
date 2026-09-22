/*
  Finner alle blob-stier som skal kopieres til ground control, for både xml- og json-avlevering.
  Rekkefølgen for parseXml er den samme som før json-støtten kom, slik at eksisterende flyter avleveres helt likt.
  json-avleveringen har ingen websak_hode-fil - mottakersystemet trenger den ikke, det holder med datafila.
*/
const getGroundControlFiles = (flowStatus) => {
  // Hvis en flyt mot formodning har kjørt begge parse-jobbene, vinner parseXml (det er den gamle, kjente avleveringen)
  const parseJobName = flowStatus.parseXml?.jobFinished ? 'parseXml' : (flowStatus.parseJson?.jobFinished ? 'parseJson' : null)
  if (!parseJobName) throw new Error('Could not find flowStatus.parseXml?.jobFinished or flowStatus.parseJson?.jobFinished. Did you remember to enable the parseXml or parseJson job for the flow?')

  const result = flowStatus[parseJobName].result
  if (!Array.isArray(result?.files) || result.files.length === 0) throw new Error(`Found no files in flowStatus.${parseJobName}.result.files. There's something wrong`)

  // Metadatafila(ene) som hører til avleveringen - websak_hode og datafil for xml, bare datafila for json
  const metadataFileNames = parseJobName === 'parseXml' ? ['websakHodeXmlFile', 'xmlFile'] : ['jsonFile']
  const metadataFiles = metadataFileNames.map(fileName => {
    const metadataFile = result[fileName]
    if (!metadataFile?.path) throw new Error(`Missing flowStatus.${parseJobName}.result.${fileName}. There's something wrong`)
    return metadataFile
  })

  return [...result.files, ...metadataFiles].map(file => file.path)
}

module.exports = { getGroundControlFiles }
