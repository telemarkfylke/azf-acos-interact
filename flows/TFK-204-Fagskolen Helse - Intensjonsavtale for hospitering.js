const description = 'Fagskolen Helse - Intensjonsavtale for hospitering'
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
        const companyName = flowStatus.parseJson.result.DialogueInstance.Intensjonsavtal.Informasjon_om_avtalepar.Navn_pa_virksomhet
        return {
          service: 'CaseService',
          method: 'CreateCase',
          parameter: {
            CaseType: 'Sak',
            Project: nodeEnv === 'production' ? '26-323' : '26-9',
            Title: `Intensjonsavtale for hospitering - Fagskolen Helse - ${companyName}`,
            UnofficialTitle: '',
            Status: 'B',
            AccessCode: 'U',
            Paragraph: '',
            JournalUnit: 'Fagskolen Vestfold og Telemark',
            SubArchive: 'Sakarkiv',
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
        const companyName = flowStatus.parseJson.result.DialogueInstance.Intensjonsavtal.Informasjon_om_avtalepar.Navn_pa_virksomhet
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
                Title: `Intensjonsavtale for hospitering - Fagskolen Helse - ${companyName}`,
                UnofficialTitle: `Intensjonsavtale for hospitering - Fagskolen Helse - ${companyName}`,
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: '',
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '216024' : '200314',
            Status: 'J',
            Title: `Intensjonsavtale for hospitering - Fagskolen Helse - ${companyName}`,
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
        const formData = flowStatus.parseJson.result.DialogueInstance.Intensjonsavtal.Informasjon_om_avtalepar
        const utdanning = flowStatus.parseJson.result.DialogueInstance.Intensjonsavtal.Utdanning
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/FAGS-Elektroniskeskjemaer/Lists/IntensjonsavtaleHospitering/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/FAGS-Elektroniskeskjemaer/Lists/IntensjonsavtaleHospitering/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: formData.Navn_pa_virksomhet,
              kontaktperson: `${formData.Kontaktperson_for__og} ${formData.etternavn}`,
              tittelFunksjon: formData.Tittel_funksjon,
              epostadresse: formData.Virksomhetens_e_postadre,
              innsender: formData.Innsender,
              aktuellUtdanning: utdanning.Velg_akutell_utdanning
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
          type: 'Intensjonsavtale hospitering helse'
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
