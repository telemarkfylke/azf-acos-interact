const description = 'Sender til Sharepoint'
// const { nodeEnv } = require('../config')

module.exports = {
  config: {
    enabled: true,
    doNotRemoveBlobs: false
  },
  parseXml: {
    enabled: true,
    options: {
    }
  },
  groundControl: {
    enabled: false // Files will be copied to GROUND_CONTROL_STORAGE_ACCOUNT_CONTAINER_NAME, and will be downloaded on local server (./ground-control/index.js)
  },

  sharepointList: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        const xmlData = flowStatus.parseXml.result.ArchiveData
        // if (!xmlData.Postnr) throw new Error('Postnr har ikke kommet med fra XML') // validation example
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/FAGS-Habiliteringogatferdssttte/Lists/Avtaler%20fra%20Acos%20skjema/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/FAGS-Habiliteringogatferdssttte/Lists/Avtaler%20fra%20Acos%20skjema/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Fodt: xmlData.InnsenderFNR.slice(0, 6), // Henter kun de 6 første sifrene i fødselsnummeret
              Fornavn: xmlData.Fornavn,
              Etternavn: xmlData.Etternavn,
              Title: xmlData.Tittel,
              Epost: xmlData.Epost,
              Virksomhet: xmlData.Virksomhet,
              Avtaletype: xmlData.Avtaletype,
              Utdanning: xmlData.Utdanning
            }
          }
        ]
      }
    }
  },

  statistics: {
    enabled: false,
    options: {
      mapper: (flowStatus) => {
        // const xmlData = flowStatus.parseXml.result.ArchiveData
        // Mapping av verdier fra XML-avleveringsfil fra Acos. Alle properties under må fylles ut og ha verdier
        return {
          company: 'NIK',
          department: 'Fagskolen',
          description,
          type: 'EKOM-ENA' // Required. A short searchable type-name that distinguishes the statistic element
          // optional fields:
          // tilArkiv: flowStatus.parseXml.result.ArchiveData.TilArkiv,
          // documentNumber: flowStatus.archive?.result?.DocumentNumber || 'tilArkiv er false' // Optional. anything you like
        }
      }
    }
  },
  failOnPurpose: {
    enabled: false
  }
}
