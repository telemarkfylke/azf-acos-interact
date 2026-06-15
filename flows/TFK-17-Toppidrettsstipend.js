const description = 'Toppidrettsstipend'
const nodeEnv = require('../config').nodeEnv

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
  syncPrivatePerson: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        return {
          ssn: flowStatus.parseJson.result.SavedValues.Login.UserID // FNR fra skjema
        }
      }
    }
  },
  // Samlesak - dokumentet arkiveres direkte i en eksisterende sak (ingen handleCase)
  handleCase: {
    enabled: false
  },
  archive: {
    enabled: true,
    options: {
      mapper: (flowStatus, base64, attachments) => {
        const personData = flowStatus.parseJson.result.SavedValues.Login
        const sokerNavn = `${personData.FirstName} ${personData.LastName}`
        const p360Attachments = attachments.map(att => {
          return {
            Base64Data: att.base64,
            Format: att.format,
            Status: 'F',
            Title: att.title,
            VersionFormat: att.versionFormat
          }
        })
        return {
          service: 'DocumentService',
          method: 'CreateDocument',
          parameter: {
            AccessCode: '5',
            AccessGroup: 'Seksjon kultur',
            Category: 'Dokument inn',
            Contacts: [
              {
                ReferenceNumber: personData.UserID,
                Role: 'Avsender',
                IsUnofficial: true
              }
            ],
            DocumentDate: new Date().toISOString(),
            Files: [
              {
                Base64Data: base64,
                Category: '1',
                Format: 'pdf',
                Status: 'B',
                Title: 'Søknad om toppidrettsstipend 2026',
                UnofficialTitle: `Søknad om toppidrettsstipend 2026 - ${sokerNavn}`,
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: 'Offl. § 5',
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200023' : '200028',
            Status: 'J',
            Title: 'Søknad om toppidrettsstipend 2026',
            UnofficialTitle: `Søknad om toppidrettsstipend 2026 - ${sokerNavn}`,
            Archive: 'Saksdokument',
            CaseNumber: nodeEnv === 'production' ? '26/12396' : '26/00135'
          }
        }
      }
    }
  },
  signOff: {
    enabled: false // Har med avskriving å gjøre
  },

  closeCase: { // handleCase må kjøres for å kunne kjøre closeCase
    enabled: false
  },
  sharepointList: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        const personData = flowStatus.parseJson.result.SavedValues.Login
        const skjemaData = flowStatus.parseJson.result.DialogueInstance
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMU-Tilskuddsordningerkulturseksjonen/Lists/Sknad%20Kunstner%20og%20toppidrettsstipend/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMU-Tilskuddsordningerkulturseksjonen/Lists/Sknad%20Kunstner%20og%20toppidrettsstipend/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: `${personData.FirstName} ${personData.LastName}`,
              Telefonnummer: personData.Telephone,
              Epost: personData.Email,
              field_2: 'Toppidrettsstipend', // Kategori
              field_3: skjemaData.Informasjon_om_soker2.Fylkeskommunale_stipend.Klubbtilhorighet___idret, // Idrettsgren / klubbtilhørighet
              field_4: personData.UserID.substring(0, 6), // Fødselsdato (DDMMÅÅ)
              field_5: skjemaData.Soknad_om_stipend.Kort_beskrivels.Hva_sokes_det_stipend_ti2, // Hva
              field_8: skjemaData.Budsjett.Økonomi.Søknadssum?.toString(), // Søknadssum
              field_6: skjemaData.Soknad_om_stipend.Kort_beskrivels.Malsetting_med_stipendet2, // Målsetting
              field_7: skjemaData.Soknad_om_stipend.Kort_beskrivels.Beskrivelse_av_siste_ars2 // Fjoråret
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
        // Mapping av verdier fra JSON-avleveringsfil fra dialogueportal
        return {
          company: 'Seksjon kultur',
          description,
          type: 'Toppidrettsstipend' // Required. A short searchable type-name that distinguishes the statistic element
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
