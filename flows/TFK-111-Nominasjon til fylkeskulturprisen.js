const description = 'Nominasjon til fylkeskulturprisen 2026'
const { nodeEnv } = require('../config')

module.exports = {
  config: {
    enabled: true,
    doNotRemoveBlobs: nodeEnv === 'production'
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
      mapper: (flowStatus) => { // for å opprette person basert på fødselsnummer
        return {
          ssn: flowStatus.parseJson.result.SavedValues.Login.UserID // FNR fra skjema
        }
      }
    }
  },
  // Arkiverer dokumentet i 360
  archive: { // archive må kjøres for å kunne kjøre signOff (noe annet gir ikke mening)
    enabled: true,
    options: {
      mapper: (flowStatus, base64, attachments) => {
        const persondata = flowStatus.parseJson.result.SavedValues.Login
        const skjemadata = flowStatus.parseJson.result.DialogueInstance
        const caseNumber = nodeEnv === 'production' ? '26/08481' : '24/00147'
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
            Category: 'Dokument inn',
            Contacts: [
              {
                ReferenceNumber: persondata.UserID,
                Role: 'Avsender',
                IsUnofficial: true // Skjermer avsender av skjemaet i p360
              }
            ],
            Files: [
              {
                Base64Data: base64,
                Category: '1',
                Format: 'pdf',
                Status: 'F',
                Title: 'Nominasjon til fylkeskulturprisen 2026',
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Status: 'J',
            DocumentDate: new Date().toISOString(),
            Title: 'Nominasjon til Fylkeskulturprisen 2026',
            UnofficialTitle: `Nominasjon til Fylkeskulturprisen 2026 - ${skjemadata.Begrunnelse_for_nominasj2.Kontaktopplysninger_til_.Navn_pa_kunstner}`,
            Archive: 'Saksdokument',
            CaseNumber: caseNumber,
            // ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200023' : '200028', // Seksjon Kultur Dette finner du i p360, ved å trykke "Avansert Søk" > "Kontakt" > "Utvidet Søk" > så søker du etter det du trenger Eks: "Søkenavn": %Idrett%. Trykk på kontakten og se etter org nummer.
            ResponsiblePersonEmail: 'line.ruud.orslien@telemarkfylke.no',
            AccessCode: '5',
            Paragraph: 'Offl. § 5',
            AccessGroup: 'Seksjon kultur'
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
        const persondata = flowStatus.parseJson.result.SavedValues.Login
        const skjemadata = flowStatus.parseJson.result.DialogueInstance
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMU-Tilskuddsordningerkulturseksjonen-Fylkeskulturprisen/Lists/NominasjonerFylkeskulturprisen2024/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMU-Tilskuddsordningerkulturseksjonen-Fylkeskulturprisen/Lists/NominasjonerFylkeskulturprisen2024/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: persondata.UserID,
              navnKunstner: skjemadata.Begrunnelse_for_nominasj2.Kontaktopplysninger_til_.Navn_pa_kunstner,
              adresseKunstner: skjemadata.Begrunnelse_for_nominasj2.Kontaktopplysninger_til_.Adresse2,
              postnummerKunstner: skjemadata.Begrunnelse_for_nominasj2.Kontaktopplysninger_til_.Postnr_sted_postnr,
              poststedKunstner: skjemadata.Begrunnelse_for_nominasj2.Kontaktopplysninger_til_.Postnr_sted_poststed,
              epostKunstner: skjemadata.Begrunnelse_for_nominasj2.Kontaktopplysninger_til_.E_post,
              mobilKunstner: skjemadata.Begrunnelse_for_nominasj2.Kontaktopplysninger_til_.Mobil,
              fodselsAarKunstner: skjemadata.Begrunnelse_for_nominasj2.Kontaktopplysninger_til_.Fodselsar.toString(),
              kunstart: skjemadata.Begrunnelse_for_nominasj2.Kontaktopplysninger_til_.Kunstart,
              tilknytningTelemark: skjemadata.Begrunnelse_for_nominasj2.Kontaktopplysninger_til_.Tilknytning_til_Telemark,
              navnInnsender: persondata.FirstName + ' ' + persondata.LastName,
              epostInnsender: persondata.Email,
              mobilInnsender: persondata.Telephone,
              begrunnelse: skjemadata.Begrunnelse_for_nominasj2.Begrunnelse_for_nominasj.Begrunnelse2
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
        // Mapping av verdier fra XML-avleveringsfil fra Acos. Alle properties under må fylles ut og ha verdier
        return {
          company: 'Samfunnsutvikling',
          department: 'Kulturarv',
          description, // Required. A description of what the statistic element represents
          type: 'Nominasjon til fylkeskulturprisen' // Required. A short searchable type-name that distinguishes the statistic element
          // optional fields:
          //   documentNumber: flowStatus.archive.result.DocumentNumber // Optional. anything you like
        }
      }
    }
  },
  failOnPurpose: {
    enabled: false
  }
}
