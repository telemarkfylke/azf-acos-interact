const description = 'Stipend for tradisjonskunst og tradisjonshandverk'
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
        const orgData = flowStatus.parseJson.result.DialogueInstance.S\u00F8knadsskjema.Group1.Organisasjonsnu
        return {
          orgnr: orgData.replaceAll(' ', '')
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
            Project: nodeEnv === 'production' ? '26-98' : '26-1',
            Title: 'Stipend for tradisjonskunst og tradisjonshandverk',
            UnofficialTitle: '',
            Status: 'B',
            AccessCode: 'U',
            Paragraph: '',
            JournalUnit: 'Sentralarkiv',
            SubArchive: 'Sakarkiv',
            ArchiveCodes: [
              {
                ArchiveCode: '076',
                ArchiveType: 'FELLESKLASSE PRINSIPP',
                Sort: 1
              },
              {
                ArchiveCode: 'C43',
                ArchiveType: 'FAGKLASSE PRINSIPP',
                Sort: 2
              }
            ],
            Contacts: [],
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200418' : '200234',
            ResponsiblePersonEmail: nodeEnv === 'production' ? 'anund.johannes.grini@telemarkfylke.no' : 'tom.jarle.christiansen@telemarkfylke.no',
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
        const sokerNavn = flowStatus.parseJson.result.DialogueInstance.S\u00F8knadsskjema.Group1.Kontaktopplysni.Fornavn + ' ' + flowStatus.parseJson.result.DialogueInstance.S\u00F8knadsskjema.Group1.Kontaktopplysni.Etternavn
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
                Title: `Søknad om stipend for tradisjonskunst og tradisjonshåndtverk - ${sokerNavn}`,
                UnofficialTitle: '',
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: '',
            // ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200023' : '200028',
            ResponsiblePersonEmail: nodeEnv === 'production' ? 'anund.johannes.grini@telemarkfylke.no' : 'tom.jarle.christiansen@telemarkfylke.no',
            Status: 'J',
            Title: `Søknad om stipend for tradisjonskunst og tradisjonshåndtverk - ${sokerNavn}`,
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
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMU-Tilskuddsordningerkulturseksjonen/Lists/Stipend%20for%20tradisjonskunst%20og%20handverk/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMU-Tilskuddsordningerkulturseksjonen/Lists/Stipend%20for%20tradisjonskunst%20og%20handverk/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: flowStatus.parseJson.result.Metadata.ReferenceId.Value,
              Fodselsnummer: DialogueInstance.Søknadsskjema.Group1.Kontaktopplysni.Fødselsnummer.substring(0, 6),
              Fornavn: DialogueInstance.Søknadsskjema.Group1.Kontaktopplysni.Fornavn,
              Etternavn: DialogueInstance.Søknadsskjema.Group1.Kontaktopplysni.Etternavn,
              Adresse: DialogueInstance.Søknadsskjema.Group1.Kontaktopplysni.Adresse1,
              Postnummer: DialogueInstance.Søknadsskjema.Group1.Kontaktopplysni.Postnummer1,
              Poststed: DialogueInstance.Søknadsskjema.Group1.Kontaktopplysni.Poststed1,
              Mobilnummer: DialogueInstance.Søknadsskjema.Group1.Kontaktopplysni.Mobilnummer,
              E_postadresse: DialogueInstance.Søknadsskjema.Group1.Kontaktopplysni.E_postadresse,
              Organisasjonsnummer: DialogueInstance.Søknadsskjema.Group1.Organisasjonsnu,
              Tilknyttet_bedrift: DialogueInstance.Søknadsskjema.Group1.Tilknyttet_bedr,
              Hva_sokes_det_s: DialogueInstance.Søknadsskjema.Kort_beskrivels.Hva_sokes_det_s,
              Plan_for_bruken: DialogueInstance.Søknadsskjema.Kort_beskrivels.Plan_for_bruken,
              Bakgrunn_Virksomhet: DialogueInstance.Søknadsskjema.Kort_beskrivels.Bakgrunn_Virkso,
              Sum_utgift: DialogueInstance.Søknadsskjema.Sum_utgift.toString()
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
          type: 'Stipend for tradisjonskunst og tradisjonshåndverk' // Required. A short searchable type-name that distinguishes the statistic element
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
