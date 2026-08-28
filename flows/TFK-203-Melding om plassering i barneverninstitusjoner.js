const description = 'TFK-203 - Melding om plassering i barneverninstitusjoner'
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
          ssn: flowStatus.parseJson.result.DialogueInstance.Personalia.Om_den_registre['Fødselsnummer']
        }
      }
    }
  },

  handleCase: {
    enabled: true,
    options: {
      getCaseParameter: (flowStatus) => {
        const elev = flowStatus.parseJson.result.DialogueInstance.Personalia.Om_den_registre
        return {
          Title: 'Opplæring i barneverninstitusjoner', // sjekker om det finnes en sak med denne tittelen
          ArchiveCode: elev['Fødselsnummer'] // og denne eleven som arkivkode (FNR)
        }
      },
      mapper: (flowStatus) => {
        const elev = flowStatus.parseJson.result.DialogueInstance.Personalia.Om_den_registre
        const personData = flowStatus.syncPrivatePerson.result
        return {
          service: 'CaseService',
          method: 'CreateCase',
          parameter: {
            CaseType: 'Elev',
            Title: 'Opplæring i barneverninstitusjoner',
            UnofficialTitle: `Opplæring i barneverninstitusjoner - ${elev.Fornavn} ${elev.Etternavn}`,
            Status: 'B',
            AccessCode: '13',
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            JournalUnit: 'Sentralarkiv',
            SubArchive: 'Elev',
            ArchiveCodes: [
              {
                ArchiveCode: elev['Fødselsnummer'],
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
            AccessGroup: 'Opplæring barnevernsinstitusjoner'
          }
        }
      }
    }
  },

  archive: {
    enabled: true,
    options: {
      mapper: (flowStatus, base64, attachments) => {
        const elev = flowStatus.parseJson.result.DialogueInstance.Personalia.Om_den_registre
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
            AccessGroup: 'Opplæring barnevernsinstitusjoner',
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
                Title: 'Opplæring i barneverninstitusjoner',
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200027' : '200021',
            ResponsiblePersonEmail: nodeEnv === 'production' ? 'ida.marie.engen@telemarkfylke.no' : 'tom.jarle.christiansen@telemarkfylke.no',
            Status: 'J',
            Title: 'Opplæring i barneverninstitusjoner',
            UnofficialTitle: `Opplæring i barneverninstitusjoner - ${elev.Fornavn} ${elev.Etternavn}`,
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
          department: 'Opplæring barnevernsinstitusjoner',
          description,
          type: 'Melding om plassering i barneverninstitusjon'
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
