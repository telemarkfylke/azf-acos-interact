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
Soknad {
    int Aar
    string Type
    string Orgnavn
    string Orgnr
    string ArrAnlNavn
    string GjTidspunkt
    string Sted
    string Kommune
    string TildeltArr
    string Besk
    int Soknadssum
    int SumUtg
    string HvaTilskuddTil
    string Epost
    string Kontonr
}

  */
  syncEnterprise: {
    enabled: true,
    options: {
      mapper: (flowStatus) => { // for å opprette organisasjon basert på orgnummer
        // Mapping av verdier fra XML-avleveringsfil fra Acos.
        return {
          orgnr: flowStatus.parseXml.result.Soknad.Orgnr.replaceAll(' ', '')
        }
      }
    }
  },
  // Arkiverer dokumentet i 360
  archive: {
    enabled: true,
    options: {
      mapper: (flowStatus, base64, attachments) => {
        const xmlData = flowStatus.parseXml.result.Soknad
        let caseNumber
        if (flowStatus.parseXml.result.Soknad.Type === 'Tilskudd til idrettsarrangement') {
          caseNumber = nodeEnv === 'production' ? '25/11099' : '24/00005'
        } else if (flowStatus.parseXml.result.Soknad.Type === 'Tilskudd til regionale idrettsanlegg') {
          caseNumber = nodeEnv === 'production' ? '25/11290' : '24/00006'
        } else {
          throw new Error('Type tilskudd er feil eller har ikke kommet med')
        }
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
                ReferenceNumber: xmlData.Orgnr.replaceAll(' ', ''),
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
                Title: 'Søknad om fylkeskommunale midler til idrettsarrangement',
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Status: 'J',
            DocumentDate: new Date().toISOString(),
            Title: `Søknad om fylkeskommunale midler til idrettsarrangement/anlegg 2025 – ${xmlData.ArrAnlNavn}`,
            Archive: 'Saksdokument',
            CaseNumber: caseNumber,
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200023' : '200028', // Seksjon Kultur Dette finner du i p360, ved å trykke "Avansert Søk" > "Kontakt" > "Utvidet Søk" > så søker du etter det du trenger Eks: "Søkenavn": %Idrett%. Trykk på kontakten og se etter org nummer.
            AccessCode: 'U',
            Paragraph: '',
            AccessGroup: 'Alle'
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
        const xmlData = flowStatus.parseXml.result.Soknad
        // if (!xmlData.Postnr) throw new Error('Postnr har ikke kommet med fra XML') // validation example
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMU-Tilskuddsordningerkulturseksjonen/Lists/Tilskudd%20til%20idrettsarrangement%20og%20regionale%20idret/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMU-Tilskuddsordningerkulturseksjonen/Lists/Tilskudd%20til%20idrettsarrangement%20og%20regionale%20idret/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: xmlData.Orgnavn,
              Arrangement_x0020_og_x0020_Anleg: xmlData.ArrAnlNavn,
              GjTidspunkt: xmlData.GjTidspunkt,
              Sted: xmlData.Sted,
              Kommune: xmlData.Kommune,
              TildeltArr: xmlData.TildeltArr,
              Beskrivelse: xmlData.Besk,
              HvaTilskuddTil: xmlData.HvaTilskuddTil,
              SumUtg: xmlData.SumUtg,
              Soknadssum: xmlData.Soknadssum,
              Epost: xmlData.Epost,
              Orgnr: xmlData.Orgnr,
              Kontonr: xmlData.Kontonr,
              TypeTilskuddsordning: xmlData.Type,
              _x00c5_rstall: new Date().getFullYear(),
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
          type: 'Tilskudd til idrettsarrangement og regionale idrettsanlegg', // Required. A short searchable type-name that distinguishes the statistic element
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
