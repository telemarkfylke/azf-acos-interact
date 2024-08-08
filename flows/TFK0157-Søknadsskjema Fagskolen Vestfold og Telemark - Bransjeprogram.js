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
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/FAGS-Elektroniskeskjemaer/Lists/Bransjeprogram/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/FAGS-Elektroniskeskjemaer/Lists/Bransjeprogram/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: xmlData.Fnr,
              Bransjeprogram: xmlData.Bransjeprogram,
              Utdanning: xmlData.Utdanning,
              Fornavn: xmlData.Fornavn,
              Etternavn: xmlData.Etternavn,
              E_x002d_postadresse: xmlData.Epost,
              Fag_x002d__x002f_svennebrev: xmlData.FagSvennebrev,
              Annenutdanning: xmlData.AnnenUtdanning,
              Praksis_x002f_fartstid: xmlData.PraksisFartstid,
              Adresse: xmlData.Adresse,
              Postnummer: xmlData.PostNr,
              Sted: xmlData.Sted,
              Telefonnummer: xmlData.Mobilnr,
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
          type: 'Bransjeprogram' // Required. A short searchable type-name that distinguishes the statistic element
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
