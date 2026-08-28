const description = 'TFK-218 - Samtykkeerklæring for VG3 fagopplæring'
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

  // Synkroniser elevmappe
  syncElevmappe: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        return {
          ssn: flowStatus.parseJson.result.SavedValues.Login.UserID // Fnr elev som er logget inn
        }
      }
    }
  },

  // Arkiverer dokumentet i elevmappa
  archive: {
    enabled: true,
    options: {
      mapper: (flowStatus, base64, attachments) => {
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
            AccessCode: '13',
            AccessGroup: 'Elev kompetansesenteret',
            Category: 'Dokument inn',
            Contacts: [
              {
                ReferenceNumber: flowStatus.syncElevmappe.result.privatePerson.ssn,
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
                Status: 'F',
                Title: 'Veien videre - samtykkeerklæring for VG3 fagopplæring',
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200688' : '200560',
            Status: 'J',
            Title: 'Veien videre - samtykkeerklæring for VG3 fagopplæring',
            UnofficialTitle: `Veien videre - samtykkeerklæring for VG3 fagopplæring - ${flowStatus.syncElevmappe.result.privatePerson.name}`,
            Archive: 'Elevdokument',
            CaseNumber: flowStatus.syncElevmappe.result.elevmappe.CaseNumber
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
        const privatperson = flowStatus.parseJson.result.DialogueInstance.Samtykkeerklæring.Privatperson
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/Kompetansesenteret/Lists/VeienVidereRegistrering/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/Kompetansesenteret/Lists/VeienVidereRegistrering/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: flowStatus.parseJson.result.Metadata.ReferenceId.Value,
              Skjemanavn: flowStatus.parseJson.result.Metadata.DialogueName.Value,
              Fornavn: privatperson.Fornavn1,
              Etternavn: privatperson.Etternavn1,
              Fodselsnummer: privatperson['Fødselsnummer1'],
              Adresse: privatperson.Adresse1,
              Poststed: privatperson.Poststed1,
              Postnummer: privatperson.Postnummer1,
              Telefon: privatperson.Telefon1,
              Epost: privatperson.E_post
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
        return {
          company: 'Telemark fylkeskommune',
          department: 'Kompetansesenteret',
          description,
          type: 'Samtykkeerklæring for VG3 fagopplæring'
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
