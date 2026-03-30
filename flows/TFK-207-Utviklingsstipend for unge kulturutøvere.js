const description = 'Utviklingsstipend for unge kulturutøvere'
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
          ssn: flowStatus.parseJson.result.SavedValues.Login.UserID // FNR fra skjema
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
            Project: nodeEnv === 'production' ? '26-191' : '26-5',
            Title: 'Utviklingsstipend for unge kulturutøvere',
            UnofficialTitle: `Utviklingsstipend for unge kulturutøvere - ${flowStatus.parseJson.result.SavedValues.Login.FirstName} ${flowStatus.parseJson.result.SavedValues.Login.LastName}`,
            Status: 'B',
            AccessCode: '5',
            Paragraph: 'Offl. § 5',
            JournalUnit: 'Sentralarkiv',
            SubArchive: 'Sakarkiv',
            ArchiveCodes: [
              {
                ArchiveCode: '076',
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
            ResponsiblePersonEmail: nodeEnv === 'production' ? 'ronnaug.flatin@telemarkfylke.no' : 'tom.jarle.christiansen@telemarkfylke.no',
            AccessGroup: 'Seksjon kultur'
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
        const personData = flowStatus.parseJson.result.SavedValues.Login
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
            AccessCode: '5',
            AccessGroup: 'Seksjon kultur',
            Category: 'Dokument inn',
            Contacts: [
              {
                ReferenceNumber: personData.UserID,
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
                Status: 'B',
                Title: 'Søknad om utviklingsstipend for unge kulturutøvere',
                UnofficialTitle: `Søknad om utviklingsstipend for unge kulturutøvere - ${personData.FirstName} ${personData.LastName}`,
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: 'Offl. § 5',
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200023' : '200028',
            ResponsiblePersonEmail: nodeEnv === 'production' ? 'ronnaug.flatin@telemarkfylke.no' : 'tom.jarle.christiansen@telemarkfylke.no',
            Status: 'J',
            Title: 'Søknad om utviklingsstipend for unge kulturutøvere',
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
        const personData = flowStatus.parseJson.result.SavedValues.Login
        const skjemaData = flowStatus.parseJson.result.DialogueInstance
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMU-Tilskuddsordningerkulturseksjonen/Lists/Utviklingsstipend%20for%20unge%20kulturutvere/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMU-Tilskuddsordningerkulturseksjonen/Lists/Utviklingsstipend%20for%20unge%20kulturutvere/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: flowStatus.parseJson.result.Metadata.ReferenceId.Value,
              fodselsnummer: personData.UserID.substring(0, 6),
              fornavn: personData.FirstName,
              etternavn: personData.LastName,
              adresse: personData.Address,
              postnummer: personData.PostalCode,
              poststed: personData.PostalArea,
              mobilnummer: personData.Telephone,
              epost: personData.Email,
              sjanger: skjemaData.Informasjon_om_soker2.Fylkeskommunale.Kunstart___sjanger_,
              bruksomraade: skjemaData.Soknad_om_stipend.Kort_beskrivels.Hva_skal_stipen,
              maalsetting: skjemaData.Soknad_om_stipend.Kort_beskrivels.Malsetting_med_stipendet2,
              beskrivelse: skjemaData.Soknad_om_stipend.Kort_beskrivels.Beskrivelse_av_siste_ars2,
              inntekter: skjemaData.\u00D8konomi.Gruppe5?.map(r => `Inntekt: ${r.Type_inntekt} Beløp:   ${r.Belop}`).join('\n'),
              utgifter: skjemaData.\u00D8konomi.Gruppe6?.map(r => `Utgift:  ${r.Type_ugift ?? r.Type_utgift} Beløp:   ${r.Belop2 ?? r.Belop}`).join('\n'),
              lenker: skjemaData.Vedlegg_og_lenk.Lenker.Eventuelle_lenk
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
          type: 'Utviklingsstipend for unge kulturutøvere' // Required. A short searchable type-name that distinguishes the statistic element
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
