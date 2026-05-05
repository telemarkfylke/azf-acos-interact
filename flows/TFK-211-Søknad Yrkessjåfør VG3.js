const description = 'TFK-211 - Søknad Yrkessjåfør VG3'
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
          // Eks: flowStatus.parseJson.result.SavedValues.Login.UserID
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
            AccessGroup: 'Elev Notodden vgs',
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
                Title: 'Søknad vg3 yrkessjåfør',
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200035' : '200121', // Notodden vgs
            Status: 'J',
            Title: 'Søknad vg3 yrkessjåfør',
            UnofficialTitle: `Søknad vg3 yrkessjåfør - ${flowStatus.syncElevmappe.result.privatePerson.name}`,
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
        const personData = flowStatus.parseJson.result.SavedValues.Login
        const skjemaData = flowStatus.parseJson.result.DialogueInstance
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/NOV-NOTVS-Yrkessjfrlrere/Lists/soknadYrkessjofor/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/NOV-NOTVS-Yrkessjfrlrere/Lists/soknadYrkessjofor/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: flowStatus.parseJson.result.Metadata.ReferenceId.Value,
              fodselsnummer: personData.UserID,
              fornavn: personData.FirstName,
              etternavn: personData.LastName,
              adresse: personData.Address,
              postnummer: personData.PostalCode,
              poststed: personData.PostalArea,
              mobilnummer: personData.Telephone,
              epost: personData.Email,
              fylke: skjemaData.S\u00F8knad.Fylke1.Fylke,
              oppstart: skjemaData.S\u00F8knad.Kurs.Jeg_s\u00F8ker_start_p\u00E5,
              sokertype: skjemaData.S\u00F8knad.Kurs.Jeg_er
            }
          }
        ]
      }
    }
  },
  statistics: {
    enabled: false,
    options: {
      mapper: (flowStatus) => {
        return {
          company: 'Telemark fylkeskommune',
          department: 'Inntak',
          description,
          type: 'Søknad Yrkessjåfør VG3'
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
