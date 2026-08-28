const description = 'TFK-219 - Registreringsskjema - Talenthuset'
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
                Title: 'Veien videre - registreringsskjema',
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200688' : '200560',
            Status: 'J',
            Title: 'Veien videre - registreringsskjema',
            UnofficialTitle: `Veien videre - registreringsskjema - ${flowStatus.syncElevmappe.result.privatePerson.name}`,
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
        const registreringsskjema = flowStatus.parseJson.result.DialogueInstance.Registreringsskjema
        const elev = registreringsskjema.Opplysninger_om
        const laerefagPeriode = registreringsskjema['Lærefag___Periode']
        const foresatt = registreringsskjema.Opplysninger_om1[0]
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/Kompetansesenteret/Lists/VeienVidereRegistrering/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/Kompetansesenteret/Lists/VeienVidereRegistrering/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: flowStatus.parseJson.result.Metadata.ReferenceId.Value,
              Skjemanavn: flowStatus.parseJson.result.Metadata.DialogueName.Value,
              Fornavn: elev.Fornavn1,
              Etternavn: elev.Etternavn1,
              Fodselsnummer: elev['Fødselsnummer1'],
              Adresse: elev.Adresse1,
              Hybeladresse: elev.Evt_Hybel_addresse,
              Poststed: elev.Poststed1,
              Postnummer: elev.Postnummer1,
              Telefon: elev.Telefon1,
              Epost: elev.E_post,
              Laerefag: laerefagPeriode['Vg3___lærefag_'],
              Periode: laerefagPeriode.Periode1,
              ForesattRelasjon: foresatt.Relasjon_,
              ForesattFornavn: foresatt.Fornavn2,
              ForesattEtternavn: foresatt.Etternavn2,
              ForesattAdresse: foresatt.Adresse2,
              ForesattMobiltelefon: foresatt.Mobiltelefon
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
          type: 'Registreringsskjema - Talenthuset'
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
