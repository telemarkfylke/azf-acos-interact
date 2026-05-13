const description = 'TFK-107-Bestilling arbeid utført av seksjon vegutbygging'
const { nodeEnv } = require('../config')

module.exports = {
  config: {
    enabled: true,
    doNotRemoveBlobs: nodeEnv !== 'production'
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
        const gruppe = flowStatus.parseJson.result.DialogueInstance.Steg.Gruppe
        const periode = flowStatus.parseJson.result.DialogueInstance.Steg.Arbeidet_onskes_utfort_i
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMF-Samferdselsektorteam/Lists/bestillingArbeidVegutbygging/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMF-Samferdselsektorteam/Lists/bestillingArbeidVegutbygging/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: gruppe.Bestillers_navn + ' ' + gruppe.Bestillers_navn1,
              Seksjon: gruppe.Bestillende_seksjon,
              Navn: `${gruppe.Bestillers_navn} ${gruppe.Bestillers_navn1}`,
              Epost: gruppe.Bestillers_epost,
              Tjeneste: gruppe.Hvilke_tjeneste_bestille,
              Omfang: gruppe.Omfang.toString(),
              SupInfo: gruppe.Supplerende_info,
              Start: periode.Start,
              Stopp: periode.Stopp
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
        return {
          company: 'Samfunnsutvikling',
          department: 'Seksjon Vegutbygging',
          description,
          type: 'Bestilling arbeid utført av seksjon vegutbygging'
        }
      }
    }
  },
  failOnPurpose: {
    enabled: false
  }
}
