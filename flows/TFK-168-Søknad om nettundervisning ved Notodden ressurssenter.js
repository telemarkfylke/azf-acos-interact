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
          ssn: flowStatus.parseJson.result.DialogueInstance.Om_skjemaet_og_soker.Informasjon_om_.F\u00F8dselsnummer // Fnr til eleven som meldingen gjelder SJEKK OM DENNE ALLTID SKAL ARKIVERES I ELEVMAPPE
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
            Title: 'Søknad om nettundervisning ved Notodden ressurssenter',
            VersionFormat: att.versionFormat
          }
        })
        return {
          service: 'DocumentService',
          method: 'CreateDocument',
          parameter: {
            AccessCode: '13',
            AccessGroup: 'Elev Notodden vgs', // Tilgangsgruppe for elevinntak
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
                Title: 'Søknad om nettundervisning ved Notodden ressurssenter',
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200379' : '200186', // Notodden vgs
            Status: 'J',
            Title: 'Søknad om nettundervisning ved Notodden ressurssenter',
            UnofficialTitle: `Søknad om nettundervisning ved Notodden ressurssenter - ${flowStatus.syncElevmappe.result.privatePerson.name}`,
            Archive: 'Sensitivt elevdokument',
            CaseNumber: flowStatus.syncElevmappe.result.elevmappe.CaseNumber
          }
        }
      }
    }
  },
  signOff: {
    enabled: false // Automastisk avskriving
  },

  closeCase: {
    enabled: false
  },

  statistics: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        return {
          company: 'Telemark fylkeskommune',
          department: 'Inntak',
          description: 'Søknad om nettundervisning ved Notodden ressurssenter arkivert i elevmappe',
          type: 'Søknad om nettundervisning ved Notodden ressurssenter' // Required. A short searchable type-name that distinguishes the statistic element
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
