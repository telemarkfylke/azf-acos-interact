const description = 'Fartebot tilbakemelding'
// const nodeEnv = require('../config').nodeEnv

module.exports = {
  config: {
    enabled: false,
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
        const kontaktinfoValues = flowStatus.parseJson.result.DialogueInstance.Informasjon_om_.Kontaktinformas
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMF-Kollektiv-Utv_Fartebot/Lists/Fartebot%20tilbakemelding/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMF-Kollektiv-Utv_Fartebot/Lists/Fartebot%20tilbakemelding/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              BrukerId: flowStatus.parseJson.result.Metadata.UserIdentifier.Value,
              Fornavn: kontaktinfoValues.Fornavn_,
              Etternavn: kontaktinfoValues.Etternavn_,
              Epost: kontaktinfoValues.E_post,
              Kommentar: kontaktinfoValues.Kommentar
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
          company: 'Farte',
          department: 'Kollektiv',
          description, // Required. A description of what the statistic element represents
          type: 'Fartebot tilbakemelding' // Required. A short searchable type-name that distinguishes the statistic element
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
