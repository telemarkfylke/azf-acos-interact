const nodeEnv = require('../config').nodeEnv
const { schoolInfo } = require('../lib/data-sources/tfk-schools')

module.exports = {
  config: {
    enabled: false, // OBS Skjemaet er ikke aktivt enda
    doNotRemoveBlobs: true
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
          ssn: flowStatus.parseJson.result.DialogueInstance.Om_skjemaet_og_soker.Informasjon_om_soker.Fodselsnummer // Fnr til eleven som meldingen gjelder SJEKK OM DENNE ALLTID SKAL ARKIVERES I ELEVMAPPE
        }
      }
    }
  },
  // Arkiverer dokumentet i elevmappa
  archive: { // archive må kjøres for å kunne kjøre signOff (noe annet gir ikke mening)
    enabled: true,
    options: {
      mapper: (flowStatus, base64, attachments) => {
        const jsonData = flowStatus.parseJson.result
        const schoolOrgNr = jsonData.SavedValues.Dataset.Skoletilh\u00F8righe.orgNr
        const school = schoolInfo.find(school => school.orgNr === schoolOrgNr)
        const p360Attachments = attachments.map(att => {
          return {
            Base64Data: att.base64,
            Format: att.format,
            Status: 'F',
            Title: 'Plan for manglende fag i videregående opplæring',
            VersionFormat: att.versionFormat
          }
        })
        return {
          service: 'DocumentService',
          method: 'CreateDocument',
          parameter: {
            AccessCode: '13',
            AccessGroup: school.tilgangsgruppe,
            Category: 'Dokument inn',
            Contacts: [
              {
                ReferenceNumber: jsonData.DialogueInstance.Informasjon_om_1.Informasjon_om_.u00F8dselsnummer_D,
                Role: 'Avsender',
                IsUnofficial: true
              },
              {
                ReferenceNumber: school.orgNr,
                Role: 'Mottaker',
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
                Title: 'Plan for manglende fag i videregående opplæring',
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            ResponsibleEnterpriseNumber: nodeEnv === 'production' ? school.orgNr : school.orgNr, // Ansvarlig skole
            Status: 'J',
            Title: 'Plan for manglende fag i videregående opplæring',
            UnofficialTitle: `Plan for manglende fag i videregående opplæring - ${flowStatus.syncElevmappe.result.privatePerson.name}`,
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
          department: schoolInfo.primaryLocation,
          description: 'Plan for manglende fag i videregående opplæring',
          type: 'Plan for manglende fag i videregående opplæring' // Required. A short searchable type-name that distinguishes the statistic element
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
