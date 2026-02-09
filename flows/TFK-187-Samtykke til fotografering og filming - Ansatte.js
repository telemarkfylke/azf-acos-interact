const { nodeEnv } = require('../config')

const description = 'Samtykke til fotografering og filming - Ansatte'

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
  syncEmployee: {
    enabled: true,
    options: {
      mapper: (flowStatus) => { // for å opprette person basert på fødselsnummer
        const personData = flowStatus.parseJson.result.DialogueInstance.Samtykke.Hjelpegruppe
        return {
          ssn: personData.ssn // Fnr ansatt som er logget inn
        }
      }
    }
  },
  handleCase: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        const personData = flowStatus.parseJson.result.SavedValues.Login
        return {
          service: 'CaseService',
          method: 'CreateCase',
          parameter: {
            CaseType: 'Personal',
            Title: `Samtykke til fotografering og filming - ${personData.FirstName} ${personData.LastName}`,
            UnofficialTitle: 'Samtykke til fotografering og filming',
            Status: 'B',
            AccessCode: '13',
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            JournalUnit: 'Sentralarkiv',
            SubArchive: 'Personal',
            ArchiveCodes: [
              {
                ArchiveCode: '420',
                ArchiveType: 'FELLESKLASSE PRINSIPP',
                Sort: 2
              },
              {
                ArchiveCode: flowStatus.syncEmployee.result.privatePerson.ssn,
                ArchiveType: 'FNR',
                Sort: 1,
                IsManualText: true
              }
            ],
            Contacts: [
              {
                ReferenceNumber: flowStatus.syncEmployee.result.privatePerson.ssn,
                Role: 'Avsender',
                IsUnofficial: false
              }
            ],
            ResponsibleEnterpriseRecno: flowStatus.syncEmployee.result.responsibleEnterprise.recno,
            ResponsiblePersonEmail: nodeEnv === 'production' ? personData.AzureAD.Manager.UPN : 'tom.jarle.christiansen@telemarkfylke.no',
            AccessGroup: '' // Automatisk
          }
        }
      }
    }
  },
  archive: {
    enabled: true,
    options: {
      mapper: (flowStatus, base64, attachments) => {
        const personData = flowStatus.parseJson.result.SavedValues.Login
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
            AccessGroup: 'Alle',
            Category: 'Dokument inn',
            Contacts: [],
            DocumentDate: new Date().toISOString(),
            Files: [
              {
                Base64Data: base64,
                Category: '1',
                Format: 'pdf',
                Status: 'B',
                Title: `Samtykke til fotografering og filming - ${personData.FirstName} ${personData.LastName}`,
                UnofficialTitle: 'Samtykke til fotografering og filming',
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            ResponsibleEnterpriseRecno: flowStatus.syncEmployee.result.responsibleEnterprise.recno,
            ResponsiblePersonEmail: nodeEnv === 'production' ? personData.AzureAD.Manager.UPN : 'tom.jarle.christiansen@telemarkfylke.no',
            Status: 'J',
            Title: 'Samtykke til fotografering og filming',
            UnofficialTitle: `Samtykke til fotografering og filming - ${personData.FirstName} ${personData.LastName}`,
            Archive: 'Personaldokument',
            CaseNumber: flowStatus.handleCase.result.CaseNumber
          }
        }
      }
    }
  },
  signOff: {
    enabled: false // Den henter dokumentnummer fra denne jobben og avskriver dokumentet med koden TO (Tatt til orientering).
  },

  closeCase: { // Den henter saksnummer fra denne jobben og lukker saken.
    enabled: false
  },

  statistics: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        // Mapping av verdier fra JSON-avleveringsfil fra dialogueportal
        return {
          company: 'Telemark Fylkeskommune',
          description,
          type: 'Samtykke til fotografering og filming - Ansatte' // Required. A short searchable type-name that distinguishes the statistic element
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
