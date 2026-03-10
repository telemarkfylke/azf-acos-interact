const nodeEnv = require('../config').nodeEnv

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
  syncElevmappe: {
    enabled: true,
    options: {
      mapper: (flowStatus) => { // for å opprette person basert på fødselsnummer
        // Mapping av verdier fra XML-avleveringsfil fra Acos.
        return {
          ssn: flowStatus.parseJson.result.DialogueInstance.Om_skjemaet_og_soker.Informasjon_om_soker.Fodselsnummer// Fnr til eleven som meldingen gjelder SJEKK OM DENNE ALLTID SKAL ARKIVERES I ELEVMAPPE
        }
      }
    }
  },
  // Arkiverer dokumentet i elevmappa
  archive: { // archive må kjøres for å kunne kjøre signOff (noe annet gir ikke mening)
    enabled: true,
    options: {
      mapper: (flowStatus, base64, attachments) => {
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
            AccessCode: '13',
            AccessGroup: 'Elev inntak', // Tilgangsgruppe for elevinntak
            Category: 'Dokument inn',
            Contacts: [{
              ReferenceNumber: flowStatus.syncElevmappe.result.privatePerson.ssn,
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
                Status: 'F',
                Title: 'Melding om tilretteleggingsbehov',
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200471' : '200250', // Inntak
            Status: 'J',
            Title: 'Melding om tilretteleggingsbehov',
            UnofficialTitle: `Melding om tilretteleggingsbehov - ${flowStatus.syncElevmappe.result.privatePerson.name}`,
            Archive: 'Sensitivt elevdokument',
            CaseNumber: flowStatus.syncElevmappe.result.elevmappe.CaseNumber
          }
        }
      }
    }
  },
  signOff: {
    enabled: true // Automastisk avskriving
  },

  closeCase: {
    enabled: false
  },
  sharepointList: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        // if (!xmlData.Postnr) throw new Error('Postnr har ikke kommet med fra XML')
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/Inntak/Lists/Tilretteleggingsbehov/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/Inntak/Lists/Tilretteleggingsbehov/AllItems.aspx',
            uploadFormPdf: false,
            uploadFormAttachments: false,
            fields: {
              Title: flowStatus.parseJson.result.SavedValues.Login.UserID, // husk å bruke internal name på kolonnen
              fornavn: flowStatus.parseJson.result.SavedValues.Login.FirstName,
              etternavn: flowStatus.parseJson.result.SavedValues.Login.LastName,
              // f_x00f8_dse: flowStatus.parseJson.result.DialogueInstance.Om_skjemaet_og_soker.Informasjon_om_soker.Fodselsnummer,
              toppidrett: flowStatus.parseJson.result.DialogueInstance.Melding_om_behov.Behov.Jeg_onsker_tilretteleggi,
              samtykke: flowStatus.parseJson.result.DialogueInstance.Melding_om_behov.Behov.Bekreft1,
              behov: flowStatus.parseJson.result.DialogueInstance.Melding_om_behov.Behov.Forklar_kort_om
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
        return {
          company: 'Telemark fylkeskommune',
          department: 'Inntak',
          description: 'Melding om tilretteleggingsbehov arkivert i elevmappe',
          type: 'Melding om tilretteleggingsbehov' // Required. A short searchable type-name that distinguishes the statistic element
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
