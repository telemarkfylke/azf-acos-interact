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
        const xmlData = flowStatus.parseXml.result.Skjema
        // if (!xmlData.Postnr) throw new Error('Postnr har ikke kommet med fra XML') // validation example
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/FAGS-Elektroniskeskjemaer/Lists/RestplasserPositivadferdssttte/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/FAGS-Elektroniskeskjemaer/Lists/RestplasserPositivadferdssttte/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: xmlData.Fnr,
              Fornavn: xmlData.Fornavn,
              Etternavn: xmlData.Etternavn,
              E_x002d_post: xmlData.Epost,
              Mobil: xmlData.Mobilnr,
              Gateadresse: xmlData.Gateadresse,
              Postnr: xmlData.Postnr,
              Sted: xmlData.Sted,
              Yrkestittel: xmlData.Yrkestittel,
              Arbeidssted: xmlData.Arbeidssted
            }
          }
        ]
      }
    }
  },

  statistics: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        // const xmlData = flowStatus.parseXml.result.ArchiveData
        // Mapping av verdier fra XML-avleveringsfil fra Acos. Alle properties under må fylles ut og ha verdier
        return {
          company: 'NIK',
          department: 'Fagskolen',
          description,
          type: 'Eldrehelse' // Required. A short searchable type-name that distinguishes the statistic element
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
