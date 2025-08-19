const description = 'Flerårig samarbeidsavtale'
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
  syncEnterprise: {
    enabled: true,
    options: {
      mapper: (flowStatus) => { // for å opprette organisasjon basert på orgnummer
        const orgData = flowStatus.parseJson.result.DialogueInstance.Informasjon_om_.Informasjon_om_
        return {
          orgnr: orgData.Organisasjonsnu
        }
      }
    }
  },

  handleCase: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        return {
          service: 'CaseService',
          method: 'CreateCase',
          parameter: {
            CaseType: 'Sak',
            Project: nodeEnv === 'production' ? '25-565' : '25-6',
            Title: `Regionale kulturfond - søknad om midler - ${flowStatus.parseJson.result.DialogueInstance.Informasjon_om_.Informasjon_om_.Navn_på_organis}`,
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
                ArchiveCode: 'C00',
                ArchiveType: 'FAGKLASSE PRINSIPP',
                Sort: 2
              }
            ],
            Contacts: [],
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200023' : '200028',
            // ResponsiblePersonEmail: flowStatus.syncEmployee.result.archiveManager.email,
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
                ReferenceNumber: flowStatus.syncEnterprise.result.enterprise.EnterpriseNumber,
                Role: 'Avsender',
                IsUnofficial: false
              }
              /*,
              {
                ReferenceNumber: `recno: ${flowStatus.syncEmployee.result.archiveManager.recno}`,
                Role: 'Mottaker'
              }
              */
            ],
            DocumentDate: new Date().toISOString(),
            Files: [
              {
                Base64Data: base64,
                Category: '1',
                Format: 'pdf',
                Status: 'B',
                Title: `Søknad om midler fra regionale kulturfond - ${flowStatus.parseJson.result.DialogueInstance.Informasjon_om_.Informasjon_om_.Navn_på_organis}`,
                UnofficialTitle: '',
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: '',
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200023' : '200028',
            // ResponsiblePersonEmail: flowStatus.syncEmployee.result.archiveManager.email,
            Status: 'J',
            Title: `Søknad om midler fra regionale kulturfond - ${flowStatus.parseJson.result.DialogueInstance.Informasjon_om_.Informasjon_om_.Navn_på_organis}`,
            Archive: 'Saksdokument',
            CaseNumber: caseNumber
          }
        }
      }
    }
  },
  signOff: {
    enabled: false // Har med avskriving å gjøre
  },

  closeCase: { // handleCase må kjøres for å kunne kjøre closeCase
    enabled: false
  },

  sharepointList: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        // const xmlData = flowStatus.parseXml.result.ArchiveData
        const formData = flowStatus.parseJson.result.DialogueInstance.Informasjon_om_
        const orgData = flowStatus.parseJson.result.DialogueInstance.Informasjon_om_.Informasjon_om_
        const savedValues = flowStatus.parseJson.result.SavedValues
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMU-Tilskuddsordningerkulturseksjonen/Lists/Sknad%20om%20midler%20fra%20regionale%20kulturfond/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMU-Tilskuddsordningerkulturseksjonen/Lists/Sknad%20om%20midler%20fra%20regionale%20kulturfond/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: orgData.Navn_på_organis,
              Tilskuddsordning: formData.S\u00F8knadstype.Tilskuddsordnin,
              Sokertype: formData.S\u00F8kertype.S\u00F8ker_er_en_,
              kunstkulturbeskrivelse: formData.Kunst__og_kultu.Beskrivelse_av_,
              arrangementkompetansebeskrivelse: formData.Arrangementer_o.Beskrivelse_av_1,
              Soknadssum: formData.Økonomi.Søknadssum,
              sumutgift: savedValues.Logic.Calculate_Sum_utgift6,
              suminntekt: savedValues.Logic.Calculate_Sum_inntekt4
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
        // Mapping av verdier fra JSON-avleveringsfil fra dialogueportal
        return {
          company: 'Seksjon kultur',
          description,
          type: 'Regionale kulturfond' // Required. A short searchable type-name that distinguishes the statistic element
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
