const description = 'Nominasjon til fylkeskulturprisen 2025'
const { nodeEnv } = require('../config')

module.exports = {
  config: {
    enabled: true,
    doNotRemoveBlobs: false
  },
  parseXml: {
    enabled: true
  },

  syncPrivatePerson: {
    enabled: true,
    options: {
      mapper: (flowStatus) => { // for å opprette person basert på fødselsnummer
        // Mapping av verdier fra XML-avleveringsfil fra Acos.
        return {
          ssn: flowStatus.parseXml.result.ArchiveData.Fnr
        }
      }
    }
  },

  // Arkiverer dokumentet i 360
  archive: { // archive må kjøres for å kunne kjøre signOff (noe annet gir ikke mening)
    enabled: true,
    options: {
      mapper: (flowStatus, base64, attachments) => {
        const xmlData = flowStatus.parseXml.result.ArchiveData
        const caseNumber = nodeEnv === 'production' ? '25/15434' : '24/00147'
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
                ReferenceNumber: xmlData.Fnr.split(' ').join(''),
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
                Title: 'Nomiasjon til fylkeskulturprisen',
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Status: 'J',
            DocumentDate: new Date().toISOString(),
            Title: 'Nominasjon til Fylkeskulturprisen 2025',
            // UnofficialTitle: 'Søknad om utsetting av ferskvannsfisk',
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
        const xmlData = flowStatus.parseXml.result.ArchiveData
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMU-Tilskuddsordningerkulturseksjonen-Fylkeskulturprisen/Lists/NominasjonerFylkeskulturprisen2024/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMU-Tilskuddsordningerkulturseksjonen-Fylkeskulturprisen/Lists/NominasjonerFylkeskulturprisen2024/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: xmlData.Fnr,
              navnKunstner: xmlData.navnKunstner,
              adresseKunstner: xmlData.adresseKunstner,
              postnummerKunstner: xmlData.postnummerKunstner,
              poststedKunstner: xmlData.poststedKunstner,
              epostKunstner: xmlData.epostKunstner,
              mobilKunstner: xmlData.mobilKunstner,
              fodselsAarKunstner: xmlData.fodselsAarKunstner,
              kunstart: xmlData.kunstart,
              tilknytningTelemark: xmlData.tilknytningTelemark,
              navnInnsender: xmlData.navnInnsender,
              epostInnsender: xmlData.epostInnsender,
              mobilInnsender: xmlData.mobilInnsender,
              begrunnelse: xmlData.begrunnelse
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
