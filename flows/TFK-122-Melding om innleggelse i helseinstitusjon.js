const description = 'TFK-122 - Melding om innleggelse i helseinstitusjon'
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
          ssn: flowStatus.parseJson.result.DialogueInstance.Personalia.Om_eleven.Fodselsnummer2
        }
      }
    }
  },

  handleCase: {
    enabled: true,
    options: {
      getCaseParameter: (flowStatus) => {
        const elev = flowStatus.parseJson.result.DialogueInstance.Personalia.Om_eleven
        return {
          Title: 'Opplæring i helseinstitusjon', // sjekker om det finnes en sak med denne tittelen
          ArchiveCode: elev.Fodselsnummer2 // og denne eleven som arkivkode (FNR)
        }
      },
      mapper: (flowStatus) => {
        const elev = flowStatus.parseJson.result.DialogueInstance.Personalia.Om_eleven
        const personData = flowStatus.syncPrivatePerson.result
        return {
          service: 'CaseService',
          method: 'CreateCase',
          parameter: {
            CaseType: 'Elev',
            Title: 'Opplæring i helseinstitusjon',
            UnofficialTitle: `Opplæring i helseinstitusjon - ${elev.Fornavn2} ${elev.Etternavn2}`,
            Status: 'B',
            AccessCode: '13',
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            JournalUnit: 'Sentralarkiv',
            SubArchive: 'Elev',
            ArchiveCodes: [
              {
                ArchiveCode: elev.Fodselsnummer2,
                ArchiveType: 'FNR',
                Sort: 1,
                IsManualText: true
              },
              {
                ArchiveCode: 'A03',
                ArchiveType: 'FAGKLASSE PRINSIPP',
                Sort: 2
              }
            ],
            Contacts: [
              {
                Role: 'Sakspart',
                ReferenceNumber: personData.privatePerson.ssn,
                IsUnofficial: true
              }
            ],
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200027' : '200021',
            ResponsiblePersonEmail: nodeEnv === 'production' ? 'ida.marie.engen@telemarkfylke.no' : 'tom.jarle.christiansen@telemarkfylke.no',
            AccessGroup: 'Opplæring helseinstitusjoner'
          }
        }
      }
    }
  },

  archive: {
    enabled: true,
    options: {
      mapper: (flowStatus, base64, attachments) => {
        const elev = flowStatus.parseJson.result.DialogueInstance.Personalia.Om_eleven
        const personData = flowStatus.syncPrivatePerson.result
        const caseNumber = flowStatus.handleCase.result.CaseNumber
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
            AccessGroup: 'Opplæring helseinstitusjoner',
            Category: 'Dokument inn',
            Contacts: [
              {
                ReferenceNumber: personData.privatePerson.ssn,
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
                Title: 'Opplæring helseinstitusjoner',
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200027' : '200021',
            ResponsiblePersonEmail: nodeEnv === 'production' ? 'ida.marie.engen@telemarkfylke.no' : 'tom.jarle.christiansen@telemarkfylke.no',
            Status: 'J',
            Title: 'Opplæring helseinstitusjoner',
            UnofficialTitle: `Opplæring helseinstitusjoner - ${elev.Fornavn2} ${elev.Etternavn2}`,
            Archive: 'Sensitivt elevdokument',
            CaseNumber: caseNumber
          }
        }
      }
    }
  },

  signOff: {
    enabled: false
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
          department: 'Opplæring helseinstitusjoner',
          description,
          type: 'Melding om innleggelse i helseinstitusjon'
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
