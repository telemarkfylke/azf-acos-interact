const description = 'TFK-108 - Samtykkeskjema Ombud for barn og unge'
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

  syncPrivatePersonInnsender: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        return {
          ssn: flowStatus.parseJson.result.DialogueInstance.Utfylling.Kontaktopplysninger.Fodselsnummer
        }
      }
    }
  },

  syncPrivatePersonElev: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        return {
          ssn: flowStatus.parseJson.result.DialogueInstance.Utfylling.Informasjon_om_barnet.Fodselsnummer2
        }
      }
    }
  },

  handleCase: {
    enabled: true,
    options: {
      getCaseParameter: (flowStatus) => {
        return {
          Title: 'Elevsak', // Sjekker om det finnes en sak med denne tittelen
          ArchiveCode: flowStatus.syncPrivatePersonElev.result.privatePerson.ssn // og denne eleven
        }
      },
      mapper: (flowStatus) => {
        const barnet = flowStatus.parseJson.result.DialogueInstance.Utfylling.Informasjon_om_barnet
        return {
          service: 'CaseService',
          method: 'CreateCase',
          parameter: {
            CaseType: 'Ombud',
            Title: 'Elevsak',
            UnofficialTitle: `Elevsak - ${barnet.Skole_barnehage} - ${barnet.Navn}`,
            Status: 'B',
            AccessCode: '13',
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            JournalUnit: 'Sentralarkiv',
            SubArchive: 'Ombud for barn og unge',
            ArchiveCodes: [
              {
                ArchiveCode: '---',
                ArchiveType: 'FELLESKLASSE PRINSIPP',
                Sort: 1
              },
              {
                ArchiveCode: 'B36',
                ArchiveType: 'FAGKLASSE PRINSIPP',
                Sort: 2
              },
              {
                ArchiveCode: '--',
                ArchiveType: 'TILLEGGSKODE PRINSIPP',
                Sort: 3,
                IsManualText: true
              },
              {
                ArchiveCode: flowStatus.syncPrivatePersonElev.result.privatePerson.ssn,
                ArchiveType: 'FNR',
                IsManualText: true,
                Sort: 4
              }
            ],
            Contacts: [
              {
                Role: 'Sakspart',
                ReferenceNumber: flowStatus.syncPrivatePersonElev.result.privatePerson.ssn,
                IsUnofficial: true
              }
            ],
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '251836' : '200557',
            ResponsiblePersonEmail: nodeEnv === 'production' ? 'hilde.ekeberg.fliid@telemarkfylke.no' : 'tom.jarle.christiansen@telemarkfylke.no'
          }
        }
      }
    }
  },

  archive: {
    enabled: true,
    options: {
      mapper: (flowStatus, base64, attachments) => {
        const barnet = flowStatus.parseJson.result.DialogueInstance.Utfylling.Informasjon_om_barnet
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
            AccessGroup: 'Ombud for barn og unge',
            Category: 'Dokument inn',
            Contacts: [
              {
                ReferenceNumber: flowStatus.syncPrivatePersonInnsender.result.privatePerson.ssn,
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
                Title: 'Samtykkeskjema',
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '251836' : '200557',
            ResponsiblePersonEmail: nodeEnv === 'production' ? 'hilde.ekeberg.fliid@telemarkfylke.no' : 'tom.jarle.christiansen@telemarkfylke.no',
            Status: 'J',
            Title: 'Samtykkeskjema',
            UnofficialTitle: `Samtykkeskjema - ${barnet.Navn}`,
            Archive: 'Sensitivt ombudsdokument',
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
        const barnet = flowStatus.parseJson.result.DialogueInstance.Utfylling.Informasjon_om_barnet
        return {
          company: 'HRMU',
          department: 'Mobbeombud',
          description,
          type: 'Samtykkeskjema Ombud for barn og unge',
          documentNumber: flowStatus.archive.result.DocumentNumber,
          skole: barnet.Skole_barnehage
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
