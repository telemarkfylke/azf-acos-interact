const description = 'Tilskudd til idrettsarrangement og regionale idrettsanlegg'
const { nodeEnv } = require('../config')

module.exports = {
  config: {
    enabled: true,
    doNotRemoveBlobs: false
  },
  parseXml: {
    enabled: true
  },

  /* XML from Acos:
ArchiveData {
string Soker
string Organisasjonsnavn
string PrivatpersonFornavn
string PrivatpersonEtternavn
string Tilskuddsordning
string Prosjektnavn
string KunstIde
string Beskr
string Malgruppe
string SamPartnere
string ProsjPeriode
string EkstKomp
string ArrStotteProgram
string BegrValgArena
string FestStotteProgram
string Utviklingsplan
string Soknadssum
string Totalkostnad
string AndreInntekter
string TypeSoker
string Orgnr
string Fnr
}
  */
  syncEnterprise: {
    enabled: true,
    options: {
      condition: (flowStatus) => { // use this if you only need to archive some of the forms.
        return flowStatus.parseXml.result.ArchiveData.TypeSoker === 'Organisasjon'
      },
      mapper: (flowStatus) => { // for å opprette organisasjon basert på orgnummer
        // Mapping av verdier fra XML-avleveringsfil fra Acos.
        return {
          orgnr: flowStatus.parseXml.result.ArchiveData.Orgnr.replaceAll(' ', '')
        }
      }
    }
  },
  syncPrivatePerson: {
    enabled: true,
    options: {
      condition: (flowStatus) => { // use this if you only need to archive some of the forms.
        return flowStatus.parseXml.result.ArchiveData.TypeSoker === 'Privatperson'
      },
      mapper: (flowStatus) => { // for å opprette person basert på fødselsnummer
        // Mapping av verdier fra XML-avleveringsfil fra Acos.
        return {
          ssn: flowStatus.parseXml.result.ArchiveData.Fnr
        }
      }
    }
  },
  // Arkiverer dokumentet i 360
  archive: {
    enabled: true,
    options: {
      mapper: (flowStatus, base64, attachments) => {
        const xmlData = flowStatus.parseXml.result.ArchiveData
        const caseNumber = nodeEnv === 'production' ? '24/04282' : '24/00010'
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
                ReferenceNumber: flowStatus.parseXml.result.ArchiveData.TypeSoker === 'Organisasjon' ? xmlData.Orgnr.replaceAll(' ', '') : xmlData.Fnr,
                Role: 'Avsender',
                IsUnofficial: false
              }
            ],
            Files: [
              {
                Base64Data: base64,
                Category: '1',
                Format: 'pdf',
                Status: 'F',
                Title: 'Søknad om tilskudd til kunstproduksjon',
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Status: 'J',
            DocumentDate: new Date().toISOString(),
            Title: `Søknad om ${xmlData.Tilskuddsordning} - ${xmlData.Prosjektnavn}`,
            Archive: 'Saksdokument',
            CaseNumber: caseNumber,
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200023' : '200028', // Seksjon Kultur Dette finner du i p360, ved å trykke "Avansert Søk" > "Kontakt" > "Utvidet Søk" > så søker du etter det du trenger Eks: "Søkenavn": %Idrett%. Trykk på kontakten og se etter org nummer.
            AccessCode: 'Å',
            Paragraph: 'Åvl §1',
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
        // if (!xmlData.Postnr) throw new Error('Postnr har ikke kommet med fra XML') // validation example
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMU-Tilskuddsordningerkulturseksjonen/Lists/Sknad%20om%20sttte%20til%20kunstproduksjon/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMU-Tilskuddsordningerkulturseksjonen/Lists/Sknad%20om%20sttte%20til%20kunstproduksjon/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: xmlData.Soker,
              Tilskuddsordning: xmlData.Tilskuddsordning,
              Prosjektnavn: xmlData.Prosjektnavn,
              Kortbeskrivelse: xmlData.Beskr,
              S_x00f8_knadssum: xmlData.Soknadssum,
              Utgifter: xmlData.Totalkostnad
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
          company: 'Kultur',
          department: '',
          description, // Required. A description of what the statistic element represents
          type: 'Søknad om tilskudd til kunstproduksjon', // Required. A short searchable type-name that distinguishes the statistic element
          // optional fields:
          documentNumber: flowStatus.archive.result.DocumentNumber // Optional. anything you like
        }
      }
    }
  },
  failOnPurpose: {
    enabled: false
  }
}
