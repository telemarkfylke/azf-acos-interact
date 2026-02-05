const description = 'Flerårig samarbeidsavtale'
const nodeEnv = require('../config').nodeEnv

module.exports = {
  config: {
    enabled: true,
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
  syncEnterprise: {
    enabled: true,
    options: {
      mapper: (flowStatus) => { // for å opprette organisasjon basert på orgnummer
        const orgData = flowStatus.parseJson.result.DialogueInstance.Informasjon_om_.Informasjon_om_
        return {
          orgnr: orgData.Organisasjonsnu.replaceAll(' ', '')
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
            Project: nodeEnv === 'production' ? '26-105' : '25-6',
            Title: `Regionale kulturfond - søknad om midler 2026 - ${flowStatus.parseJson.result.DialogueInstance.Informasjon_om_.Informasjon_om_.Navn_på_organis}`,
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
            ResponsiblePersonEmail: nodeEnv === 'production' ? 'ellen.rodvang@telemarkfylke.no' : 'tom.jarle.christiansen@telemarkfylke.no',
            Status: 'J',
            Title: `Søknad om midler fra regionale kulturfond 2026 - ${flowStatus.parseJson.result.DialogueInstance.Informasjon_om_.Informasjon_om_.Navn_på_organis}`,
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
        const formData = flowStatus.parseJson.result.DialogueInstance
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMU-Tilskuddsordningerkulturseksjonen/Lists/SoknaderRegionaleKulturfond2026/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMU-Tilskuddsordningerkulturseksjonen/Lists/SoknaderRegionaleKulturfond2026/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: flowStatus.parseJson.result.Metadata.ReferenceId.Value,
              Kontaktperson: formData.Informasjon_om_.Informasjon_om_.Kontaktperson,
              Navn_pa_organis: formData.Informasjon_om_.Informasjon_om_.Navn_på_organis,
              Organisasjonsnu: formData.Informasjon_om_.Informasjon_om_.Organisasjonsnu,
              Adresse: formData.Informasjon_om_.Informasjon_om_.Adresse,
              Postnummer: formData.Informasjon_om_.Informasjon_om_.Postnummer,
              Poststed: formData.Informasjon_om_.Informasjon_om_.Poststed,
              Telefonnummer: formData.Informasjon_om_.Informasjon_om_.Telefonnummer,
              E_post: formData.Informasjon_om_.Informasjon_om_.E_post,
              Soker_er_en: formData.Informasjon_om_.Søkertype___Hon.Søker_er_en_,
              Soker_er_en_1: formData.Informasjon_om_.Søkertype___Til.Søker_er_en_1,
              Beskriv_pa_hvil: formData.Informasjon_om_.Kunst__og_kultu1.Beskriv_på_hvil,
              Hvilke_profesjo: formData.Informasjon_om_.Tilskudd_til_Ho.Hvilke_profesjo,
              Tilskuddsordnin: formData.Informasjon_om_.Søknadstype.Tilskuddsordnin,
              Utfyllende_besk: formData.Informasjon_om_.Søkertype___Hon.Utfyllende_besk,
              Utfyllende_besk1: formData.Informasjon_om_.Søkertype___Til.Utfyllende_besk1,
              Beskrivelse_av_1: formData.Informasjon_om_.Kunst__og_kultu1.Beskrivelse_av_1,
              Beskrivelse_av_2: formData.Informasjon_om_.Tilskudd_til_Ho.Beskrivelse_av_2,
              Beskriv_hvordan2: formData.Informasjon_om_.Kunst__og_kultu1.Beskriv_hvordan2,
              Beskriv_hvordan3: formData.Informasjon_om_.Tilskudd_til_Ho.Beskriv_hvordan3,
              Beskriv_hvordan1: formData.Informasjon_om_.Kunst__og_kultu1.Beskriv_hvordan1,
              Soknadssum: formData.Informasjon_om_.Økonomi.Søknadssum.toString(),
              Sum_inntekt: formData.Informasjon_om_.Sum_inntekt.toString(),
              Sum_utgift: formData.Informasjon_om_.Sum_utgift.toString()
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
