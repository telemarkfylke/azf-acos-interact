const description = 'Samarbeidsavtale om å delta i fagråd - fagområde helse'
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
      mapper: (flowStatus) => ({
        ssn: flowStatus.parseJson.result.SavedValues.Login.UserID
      })
    }
  },
  handleCase: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        const companyName = flowStatus.parseJson.result.DialogueInstance.Samarbeidsavtale.Informasjon_om_avtalepar.Navn_pa_virksomhet
        return {
          service: 'CaseService',
          method: 'CreateCase',
          parameter: {
            CaseType: 'Sak',
            Project: nodeEnv === 'production' ? '26-319' : '26-7',
            Title: `Samarbeidsavtale fagråd - fagområde helse - ${companyName}`,
            UnofficialTitle: '',
            Status: 'B',
            AccessCode: 'U',
            Paragraph: '',
            JournalUnit: 'Fagskolen Vestfold og Telemark',
            SubArchive: 'Fagskolen Vestfold og Telemark',
            ArchiveCodes: [
              {
                ArchiveCode: '027',
                ArchiveType: 'FELLESKLASSE PRINSIPP',
                Sort: 1
              },
              {
                ArchiveCode: 'A80',
                ArchiveType: 'FAGKLASSE PRINSIPP',
                Sort: 2
              }
            ],
            Contacts: [],
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '216024' : '200314',
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
        const companyName = flowStatus.parseJson.result.DialogueInstance.Samarbeidsavtale.Informasjon_om_avtalepar.Navn_pa_virksomhet
        const ssn = flowStatus.parseJson.result.SavedValues.Login.UserID
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
                ReferenceNumber: ssn,
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
                Status: 'B',
                Title: `Samarbeidsavtale om å delta i fagråd - fagområde helse - ${companyName}`,
                UnofficialTitle: `Samarbeidsavtale om å delta i fagråd - fagområde helse - ${companyName}`,
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: '',
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '216024' : '200314',
            Status: 'J',
            Title: `Samarbeidsavtale om å delta i fagråd - fagområde helse - ${companyName}`,
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

  sharepointList: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        const formData = flowStatus.parseJson.result.DialogueInstance.Samarbeidsavtale.Informasjon_om_avtalepar
        const utdanning = flowStatus.parseJson.result.DialogueInstance.Samarbeidsavtale.Utdanning7
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/FAGS-Elektroniskeskjemaer/Lists/SamarbeidsavtalerFagraadHelse/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/FAGS-Elektroniskeskjemaer/Lists/SamarbeidsavtalerFagraadHelse/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: formData.Navn_pa_virksomhet,
              kontaktperson: `${formData.Kontaktperson_for__og} ${formData.etternavn}`,
              tittelFunksjon: formData.Tittel_funksjon,
              epostadresse: formData.E_postadresse,
              innsender: formData.Innsender,
              aktuellUtdanning: utdanning.Velg_aktuell_utdanning
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
          company: 'Fagskolen Vestfold og Telemark',
          description,
          type: 'Samarbeidsavtale fagråd helse'
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
