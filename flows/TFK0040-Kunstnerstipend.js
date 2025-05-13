const description = 'Kunstner- og toppidrettsstipend'
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
ArchiveData{
  string ForNavn
  string Etternavn
  string Telefonnummer
  string Epost
  string Kategori
  string Fnr
  string Kunstart
  string Idrettsgren
  string Hva
  string Maalsetting
  string Fjoraaret
  string Soknadssum
  string Fdato
}
  */

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
        let caseNumber
        let archiveTitle
        let publicTitle
        if (flowStatus.parseXml.result.ArchiveData.Kategori === 'Toppidrettsstipend') {
          archiveTitle = `Søknad om idrettsstipend - ${xmlData.ForNavn}`
          publicTitle = 'Søknad om idrettsstipend'
          caseNumber = nodeEnv === 'production' ? '24/05839' : '24/00074'
        } else if (flowStatus.parseXml.result.ArchiveData.Kategori === 'Kunstnerstipend') {
          archiveTitle = ` Søknad om kunstnerstipend - ${xmlData.ForNavn}`
          publicTitle = 'Søknad om kunstnerstipend'
          caseNumber = nodeEnv === 'production' ? '25/04450' : '24/00075'
        } else {
          throw new Error('Kategori må være enten Toppidrettsstipend eller Kunstnerstipend')
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
                ReferenceNumber: xmlData.Fnr,
                Role: 'Avsender',
                IsUnofficial: true
              }
            ],
            Files: [
              {
                Base64Data: base64,
                Category: '1',
                Format: 'pdf',
                Status: 'F',
                Title: archiveTitle,
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Status: 'J',
            DocumentDate: new Date().toISOString(),
            UnofficialTitle: archiveTitle,
            Title: publicTitle,
            Archive: 'Saksdokument',
            CaseNumber: caseNumber,
            // ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200025' : '200031', // Seksjon Kultur Dette finner du i p360, ved å trykke "Avansert Søk" > "Kontakt" > "Utvidet Søk" > så søker du etter det du trenger Eks: "Søkenavn": %Idrett%. Trykk på kontakten og se etter org nummer.
            ResponsiblePersonEmail: flowStatus.parseXml.result.ArchiveData.Kategori === 'Kunstnerstipend' ? 'line.ruud.orslien@telemarkfylke.no' : 'marte.aksnes@telemarkfylke.no',
            AccessCode: '5',
            Paragraph: 'Offl. § 5',
            AccessGroup: 'Seksjon Kultur'
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
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMU-Tilskuddsordningerkulturseksjonen/Lists/Sknad%20Kunstner%20og%20toppidrettsstipend/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMU-Tilskuddsordningerkulturseksjonen/Lists/Sknad%20Kunstner%20og%20toppidrettsstipend/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: xmlData.ForNavn,
              Telefonnummer: xmlData.Telefonnummer,
              Epost: xmlData.Epost,
              field_2: xmlData.Kategori, // Kategori
              field_3: xmlData.Idrettsgren, // Idrettsgren / Kunstuttrykk
              field_4: xmlData.Fdato, // Fødselsdato
              field_5: xmlData.Hva, // Hva
              field_8: xmlData.Soknadssum, // Søknadssum
              field_6: xmlData.Maalsetting, // Målsetting
              field_7: xmlData.Fjoraaret // Fjoråret
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
          type: 'Kunstnerstipend', // Required. A short searchable type-name that distinguishes the statistic element
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
