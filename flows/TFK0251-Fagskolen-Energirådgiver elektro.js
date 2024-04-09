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
    enabled: true // Files will be copied to GROUND_CONTROL_STORAGE_ACCOUNT_CONTAINER_NAME, and will be downloaded on local server (./ground-control/index.js)
  },

  sharepointList: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        const xmlData = flowStatus.parseXml.result.Skjema
        // if (!xmlData.Postnr) throw new Error('Postnr har ikke kommet med fra XML') // validation example
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/NIK-FVT-Elektroniskeskjemaer/Lists/EKOMsknader',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/NIK-FVT-Elektroniskeskjemaer/Lists/EKOMsknader',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: xmlData.Fnr,
              Fornavn: xmlData.Fornavn,
              Etternavn: xmlData.Etternavn,
              E_x002d_postadresse: xmlData.Epost,
              Mobilnummer: xmlData.Mobilnr,
              Fag_x002d_ogsvennebrev: xmlData.FagSvennebrev,
              Annenutdanning: xmlData.AnnenUtdanning,
              Firmanavn: xmlData.Firmanavn,
              Praksis_x002f_fartstid: xmlData.PraksisFartstid,
              Adresse: xmlData.Adresse,
              Postnummer: xmlData.Postnr,
              Sted: xmlData.Sted,
              Org_x002e_nummer: xmlData.Orgnr,
              Fakturaadresse: xmlData.Firmaadresse,
              Kurs: 'Energirådgiver elektro',
              nelfo: xmlData.nelfo,
              oppstartmnd: xmlData.oppstartmnd
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
          type: 'Energirådgiver Elektro' // Required. A short searchable type-name that distinguishes the statistic element
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
