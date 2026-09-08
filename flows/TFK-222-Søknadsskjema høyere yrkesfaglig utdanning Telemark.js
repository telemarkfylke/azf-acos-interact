const description = 'TFK-222 - Søknadsskjema høyere yrkesfaglig utdanning Telemark'
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
  syncEnterprise: {
    enabled: true,
    options: {
      mapper: (flowStatus) => { // for å opprette organisasjon basert på orgnummer
        const orgData = flowStatus.parseJson.result.DialogueInstance.Informasjon_om_søker.Gruppe1.Organisasjon.Organisasjonsnummer
        return {
          orgnr: String(orgData || '').replaceAll(' ', '')
        }
      }
    }
  },

  handleCase: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        const enterpriseData = flowStatus.syncEnterprise.result
        return {
          service: 'CaseService',
          method: 'CreateCase',
          parameter: {
            CaseType: 'Sak',
            Project: nodeEnv === 'production' ? '26-488' : '26-11',
            Title: `Driftstilskudd til fagskoler med høyere yrkesfaglig utdanning - ${enterpriseData.enterprise.Name}`,
            UnofficialTitle: '',
            Status: 'B',
            AccessCode: 'U',
            Paragraph: '',
            JournalUnit: 'Sentralarkiv',
            SubArchive: 'Sakarkiv',
            ArchiveCodes: [
              {
                ArchiveCode: '243',
                ArchiveType: 'FELLESKLASSE PRINSIPP',
                Sort: 1
              },
              {
                ArchiveCode: 'A80',
                ArchiveType: 'FAGKLASSE PRINSIPP',
                Sort: 2
              }
            ],
            Contacts: [{ ReferenceNumber: enterpriseData.enterprise.EnterpriseNumber, Role: 'Sakspart', IsUnofficial: false }],
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200026' : '200020',
            ResponsiblePersonRecno: nodeEnv === 'production' ? '200239' : '200396',
            AccessGroup: 'Alle'
          }
        }
      }
    }
  },
  archive: {
    enabled: true,
    options: {
      mapper: (flowStatus, base64, attachments) => {
        const enterpriseData = flowStatus.syncEnterprise.result
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
            AccessCode: 'U',
            AccessGroup: 'Alle',
            Category: 'Dokument inn',
            Contacts: [
              {
                ReferenceNumber: enterpriseData.enterprise.EnterpriseNumber,
                Role: 'Avsender',
                IsUnofficial: false
              }
            ],
            DocumentDate: new Date().toISOString(),
            Files: [
              {
                Base64Data: base64,
                Category: '1',
                Format: 'pdf',
                Status: 'F',
                Title: `Søknad om driftstilskudd til fagskoler med høyere yrkesfaglig utdanning - ${enterpriseData.enterprise.Name}`,
                UnofficialTitle: '',
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: '',
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200026' : '200020',
            ResponsiblePersonRecno: nodeEnv === 'production' ? '200239' : '200396',
            Status: 'J',
            Title: `Søknad om driftstilskudd til fagskoler med høyere yrkesfaglig utdanning - ${enterpriseData.enterprise.Name}`,
            Archive: 'Saksdokument',
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
          description,
          type: 'Søknad om driftstilskudd til fagskoler med høyere yrkesfaglig utdanning'
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
