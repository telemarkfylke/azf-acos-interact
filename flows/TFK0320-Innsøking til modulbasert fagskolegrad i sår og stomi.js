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
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/FAGS-Elektroniskeskjemaer/Lists/Innsking%20til%20modulbasert%20fagskolegrad%20i%20sr%20og%20stom/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/FAGS-Elektroniskeskjemaer/Lists/Innsking%20til%20modulbasert%20fagskolegrad%20i%20sr%20og%20stom/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: xmlData.Fnr,
              Fornavn: xmlData.Fornavn,
              Etternavn: xmlData.Etternavn,
              E_x002d_post: xmlData.Epost,
              Mobil: xmlData.Mobilnr,
              Gateadresse: xmlData.Gateadresse,
              Navnp_x00e5_arbeidssted: xmlData.Hovedarbeidssted,
              Kommune: xmlData.Kommune,
              Hovedarbeidssted: xmlData.Hovedarbeidssted,
              Utdanningsbakgrunn: xmlData.Utdanningsbakgrunn,
              Postnr: xmlData.PostNr,
              Sted: xmlData.PostAdresse,
              ModHostPri1: xmlData.ModHostPri1,
              ModVinterPri1: xmlData.ModVinterPri1,
              ModVaarPri1: xmlData.ModVaarPri1
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
          type: 'Sår og stomi' // Required. A short searchable type-name that distinguishes the statistic element
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
