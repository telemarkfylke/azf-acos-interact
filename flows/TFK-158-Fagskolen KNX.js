const description = 'Fagskolen KNX medlemsregistrering'
// const nodeEnv = require('../config').nodeEnv

module.exports = {
  config: {
    enabled: true,
    doNotRemoveBlobs: false
  },
  parseJson: {
    enabled: true,
    options: {
      mapper: (dialogueData) => {
        return {
        }
      }
    }
  },

  sharepointList: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        const orgData = flowStatus.parseJson.result.DialogueInstance.Type_medlemskap.Organisasjon
        const samtykkeData = flowStatus.parseJson.result.DialogueInstance.Type_medlemskap.Samtykke
        const medlemsskapData = flowStatus.parseJson.result.DialogueInstance.Type_medlemskap.Velg_medlemskap
        // const savedValues = flowStatus.parseJson.result.SavedValues
        // const loginValues = flowStatus.parseJson.result.SavedValues.Login
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/FAGS-avdelingkursogetterutdanning/Lists/KNX%20Medlemsregistrering/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/FAGS-avdelingkursogetterutdanning/Lists/KNX%20Medlemsregistrering/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: orgData.Organisasjonsna,
              orgnavn: orgData.Organisasjonsna,
              orgnummer: orgData.Organisasjonsnu,
              orgadresse: orgData.Gatenavn_og__nu,
              orgpostnummer: orgData.Postnummer,
              orgpoststed: orgData.Poststed,
              medlemsskapstype: medlemsskapData.Velg_medlemskap1,
              samtykke: samtykkeData.Jeg_samtykker_t
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
        // Mapping av verdier fra XML-avleveringsfil fra Acos. Alle properties under må fylles ut og ha verdier
        return {
          company: 'Fagskolen Vestfold og Telemark',
          department: '',
          description, // Required. A description of what the statistic element represents
          type: 'KNX medlemsregistrering' // Required. A short searchable type-name that distinguishes the statistic element
          // optional fields:
          // documentNumber: flowStatus.archive.result.DocumentNumber // Optional. anything you like
        }
      }
    }
  },
  failOnPurpose: {
    enabled: false
  }
}
