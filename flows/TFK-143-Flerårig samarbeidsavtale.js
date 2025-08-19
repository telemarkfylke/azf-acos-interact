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
        const orgData = flowStatus.parseJson.result.DialogueInstance.Søknadsskjema.Informasjon_om_
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
            Project: nodeEnv === 'production' ? '25-510' : '25-7', // Må lages nytt prosjekt for Prod i 2024,
            Title: 'Flerårige samarbeidsavtaler på kulturfeltet',
            UnofficialTitle: '',
            Status: 'B',
            AccessCode: 'U',
            Paragraph: '',
            JournalUnit: 'Sentralarkiv',
            SubArchive: 'Sakarkiv',
            ArchiveCodes: [
              {
                ArchiveCode: '027',
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
                Title: `Skjema - flerårig samarbeidsavtale - ${flowStatus.parseJson.result.DialogueInstance.Søknadsskjema.Informasjon_om_.Navn_på_organis}`,
                UnofficialTitle: `Skjema - flerårig samarbeidsavtale - ${flowStatus.parseJson.result.DialogueInstance.Søknadsskjema.Informasjon_om_.Navn_på_organis}`,
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: '',
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200023' : '200028',
            // ResponsiblePersonEmail: flowStatus.syncEmployee.result.archiveManager.email,
            Status: 'J',
            Title: `Søknad om flerårige samarbeidsavtaler på kulturfeltet - ${flowStatus.parseJson.result.DialogueInstance.Søknadsskjema.Informasjon_om_.Navn_på_organis}`,
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
        const formData = flowStatus.parseJson.result.DialogueInstance.Søknadsskjema
        const orgData = flowStatus.parseJson.result.DialogueInstance.Søknadsskjema.Informasjon_om_
        const savedValues = flowStatus.parseJson.result.SavedValues
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMU-Tilskuddsordningerkulturseksjonen/Lists/Flerrige%20samarbeidsavtaler%20p%20kulturfeltet/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMU-Tilskuddsordningerkulturseksjonen/Lists/Flerrige%20samarbeidsavtaler%20p%20kulturfeltet/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: orgData.Navn_på_organis,
              typeaktor: formData.Informasjon_om_1.Type_akt\u00F8r_,
              KortBeskrivelse: formData.Drift_og_aktivi.Beskrivelse_av_1,
              soknadssum: formData.Økonomi1.Søknadssum,
              suminntekter: savedValues.Logic.Kalkuler_Inntekt3,
              sumutgifter: savedValues.Logic.Kalkuler_Sum_utgift3
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
          type: 'Flerårig samarbeidsavtale' // Required. A short searchable type-name that distinguishes the statistic element
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
