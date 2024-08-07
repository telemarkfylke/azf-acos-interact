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
            testListUrl: '',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/NIK-FVT-Elektroniskeskjemaer/Lists/InnsokingEldrehelse',
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
              _x0031__x002e_prioritet: xmlData.Pri1,
              _x0032__x002e_prioritet: xmlData.Pri2,
              Postnr: xmlData.PostNr,
              Sted: xmlData.Sted,
              ModHostPri1: xmlData.ModHostPri1,
              ModHostPri2: xmlData.ModHostPri2,
              ModVinterPri1: xmlData.ModVinterPri1,
              ModVinterPri2: xmlData.ModVinterPri2,
              ModVaarPri1: xmlData.ModVaarPri1,
              ModVaarPri2: xmlData.ModVaarPri2
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
