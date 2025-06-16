const description = 'Søknad om mer opplæring'

module.exports = {
  config: {
    enabled: true,
    doNotRemoveBlobs: true
  },
  parseJson: {
    enabled: true,
    options: {
      mapper: (dialogueData) => {
        // if (!dialogueData.Testskjema_for_?.Gruppa_øverst?.Fornavn) throw new Error('Missing Gruppa_øverst.Fornavn mangler i JSON filen')
        return {
        }
      }
    }
  },
  sharepointList: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        const jsonData = flowStatus.parseJson.result.DialogueInstance
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/innsida-stottefunksjoner/Lists/Programvareoversikt/MaaFyllesUt.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/innsida-stottefunksjoner/Lists/Programvareoversikt/MaaFyllesUt.aspx',
            uploadFormPdf: false,
            uploadFormAttachments: false,
            fields: {
              Title: jsonData.Informasjon_om_.Informasjon_om_.Navn_på_system,
              Navnp_x00e5_bestiller: jsonData.Informasjon_om_.Informasjon_om_.Brukernavn1,
              Navnp_x00e5_virksomhet_x002c_sko: jsonData.Informasjon_om_.Informasjon_om_.Navn_på_virksom,
              H_x00e5_ndtererl_x00f8_sningenka: true,
              H_x00e5_ndtererl_x00f8_sningenel: jsonData.Informasjon_om_.Tjenesten_skal_.Håndterer_løsni1,
              H_x00e5_ndtererl_x00f8_sningenvu: jsonData.Informasjon_om_.Tjenesten_skal_.Håndterer_løsni2,
              Godkjenning_leder: jsonData.Informasjon_om_.Informasjon_om_.Navn_på_nærmest,
             // Antattkostnad: jsonData.Informasjon_om_.Annen_informasj.Antatt_kostnad,
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
          company: 'Digitale tjenester', // Required. The name of the company
          department: '',
          description, // Required. A description of what the statistic element represents
          type: 'Bestilling av programvare' // Required. A short searchable type-name that distinguishes the statistic element
          // optional fields:
          // documentNumber: ''// Optional. anything you like
        }
      }
    }
  },
  failOnPurpose: {
    enabled: false
  }
}
