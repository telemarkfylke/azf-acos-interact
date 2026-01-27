const description = 'Tilskudd arrangement'
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
    enabled: false,
    options: {
      mapper: (flowStatus) => { // for å opprette organisasjon basert på orgnummer
        const orgData = flowStatus.parseJson.result.DialogueInstance.S\u00F8knadsskjema.Informasjon_om_.Organisasjonsnu
        return {
          orgnr: orgData.replaceAll(' ', '')
        }
      }
    }
  },

  handleCase: {
    enabled: false,
    options: {
      mapper: (flowStatus) => {
        return {
          service: 'CaseService',
          method: 'CreateCase',
          parameter: {
            CaseType: 'Sak',
            Project: nodeEnv === 'production' ? '25-881' : '25-22',
            Title: `Tilskudd arrangement 2026 - ${flowStatus.parseJson.result.DialogueInstance.S\u00F8knadsskjema.Informasjon_om_.Navn_p\u00E5_akt\u00F8r}`,
            UnofficialTitle: '',
            Status: 'B',
            AccessCode: 'U',
            Paragraph: '',
            JournalUnit: 'Sentralarkiv',
            SubArchive: 'Sakarkiv',
            ArchiveCodes: [
              {
                ArchiveCode: '223',
                ArchiveType: 'FELLESKLASSE PRINSIPP',
                Sort: 1
              },
              {
                ArchiveCode: 'C03',
                ArchiveType: 'FAGKLASSE PRINSIPP',
                Sort: 2
              }
            ],
            Contacts: [],
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200023' : '200028',
            ResponsiblePersonEmail: 'line.ruud.orslien@telemarkfylke.no',
            AccessGroup: '' // Automatisk
          }
        }
      }
    }
  },
  archive: {
    enabled: false,
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
            ],
            DocumentDate: new Date().toISOString(),
            Files: [
              {
                Base64Data: base64,
                Category: '1',
                Format: 'pdf',
                Status: 'B',
                Title: `Tilskudd arrangement 2026 - ${flowStatus.parseJson.result.DialogueInstance.S\u00F8knadsskjema.Informasjon_om_.Navn_p\u00E5_akt\u00F8r}`,
                UnofficialTitle: '',
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: '',
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200023' : '200028',
            ResponsiblePersonEmail: 'line.ruud.orslien@telemarkfylke.no',
            Status: 'J',
            Title: `Tilskudd arrangement 2026 - ${flowStatus.parseJson.result.DialogueInstance.S\u00F8knadsskjema.Informasjon_om_.Navn_p\u00E5_akt\u00F8r}`,
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
        const DialogueInstance = flowStatus.parseJson.result.DialogueInstance
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMU-Tilskuddsordningerkulturseksjonen/Lists/TilskuddArrangement/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMU-Tilskuddsordningerkulturseksjonen/Lists/TilskuddArrangement/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: flowStatus.parseJson.result.Metadata.DialogueId.Value + ' - ' + DialogueInstance.Søknadsskjema.Informasjon_om_.Navn_på_aktør,
              Adresse: DialogueInstance.Søknadsskjema.Informasjon_om_.Adresse,
              // Utgift: DialogueInstance.Søknadsskjema.Utgift1[0].Utgift,
              Beskrivelsem_x00e5_l: DialogueInstance.Søknadsskjema.Drift_og_aktivi.Beskriv_hvordan,
              Oms_x00f8_ker: DialogueInstance.Søknadsskjema.Drift_og_aktivi.Kort_om_søker,
              Organisasjonsnummer: DialogueInstance.Søknadsskjema.Informasjon_om_.Organisasjonsnu,
              // inntekt: DialogueInstance.Søknadsskjema.Andre_inntekter[0].inntekt,
              Poststed: DialogueInstance.Søknadsskjema.Informasjon_om_.Poststed,
              Navn: DialogueInstance.Søknadsskjema.Informasjon_om_.Navn_på_aktør,
              Sumutgift: DialogueInstance.Søknadsskjema.Sum_utgift.toString(),
              // Navn_pa_inntekt: DialogueInstance.Søknadsskjema.Andre_inntekter[0].Navn_på_inntekt,
              Epost: DialogueInstance.Søknadsskjema.Informasjon_om_.E_post,
              // Navn_pa_utgift: DialogueInstance.Søknadsskjema.Utgift1[0].Navn_på_utgift,
              // Vedlegg2: DialogueInstance.Søknadsskjema.Vedlegg2,
              Telefonnummer: DialogueInstance.Søknadsskjema.Informasjon_om_.Telefonnummer,
              Beskrivelseavarrangement: DialogueInstance.Søknadsskjema.Drift_og_aktivi.Beskrivelse_av_,
              Postnummer: DialogueInstance.Søknadsskjema.Informasjon_om_.Postnummer,
              Suminntekt: DialogueInstance.Søknadsskjema.Sum_inntekt.toString(),
              S_x00f8_knadssum: DialogueInstance.Søknadsskjema.Økonomi1.Søknadssum.toString()
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
          type: 'Tilskudd arrangement' // Required. A short searchable type-name that distinguishes the statistic element
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
