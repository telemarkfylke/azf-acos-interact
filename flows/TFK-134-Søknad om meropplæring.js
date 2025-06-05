const description = 'Søknad om mer opplæring'
const { nodeEnv } = require('../config')
const { sendEmail } = require('../lib/jobs/customJobs/sendemail')

module.exports = {
  config: {
    enabled: true,
    doNotRemoveBlobs: false
  },
  parseJson: {
    enabled: true,
    options: {
      mapper: (dialogueData) => {
        // if (!dialogueData.Testskjema_for_?.Gruppa_øverst?.Fornavn) throw new Error('Missing Gruppa_øverst.Fornavn mangler i JSON filen')
        return {
        }
      }
    }
  },
  // Synkroniser elevmappe
  syncElevmappe: {
    enabled: true,
    options: {
      /*
      condition: (flowStatus) => { // use this if you only need to archive some of the forms.
        return flowStatus.parseXml.result.ArchiveData.TilArkiv === 'true'
      },
      */
      mapper: (flowStatus) => { // for å opprette person basert på fødselsnummer
        // Mapping av verdier fra XML-avleveringsfil fra Acos.
        return {
          ssn: flowStatus.parseJson.result.SavedValues.Login.UserID
        }
      }
    }
  },
  // CustomJob post to mongoDB
  customJobSendEpost: {
    enabled: true,
    runAfter: 'syncElevmappe',
    options: {},
    customJob: async (jobDef, flowStatus) => {
      const emailTo = []
      const subject = 'Ny søknad om mer opplæring'
      const body = `Hei, <br><br>Du har fått en ny søknad om mer opplæring.<br><br>Følgende informasjon er sendt inn:<br> Saksnummer: ${flowStatus.syncElevmappe.result.elevmappe.CaseNumber}`
      if (flowStatus.parseJson.result.DialogueInstance.Informasjon_om_1.Jeg_har_hatt_op === 'Skole') {
        // console.log('Sending email to skole')
        emailTo.push(flowStatus.parseJson.result.SavedValues.Dataset.Skole.Epost)
      } else if (flowStatus.parseJson.result.DialogueInstance.Informasjon_om_1.Jeg_har_hatt_op === 'Fagopplæring') {
        // console.log('Sending email to fagopplæring')
        emailTo.push('fagopplering@telemarkfylke.no')
      } else if (flowStatus.parseJson.result.DialogueInstance.Informasjon_om_1.Jeg_har_hatt_op === 'Voksenopplæring') {
        // console.log('Sending email to voksenopplæring')
        emailTo.push('voksenoppleringen@telemarkfylke.no')
      } else {
        console.log('Noe gikk galt, Ingen av valgene stemmer')
      }
      const result = await sendEmail(emailTo, subject, body)
      return result
    }
  },
  // Arkiverer dokumentet i 360
  archive: { // archive må kjøres for å kunne kjøre signOff (noe annet gir ikke mening)
    enabled: true,
    options: {
      mapper: (flowStatus, base64, attachments) => {
        // const xmlData = flowStatus.parseXml.result.ArchiveData
        const caseNumber = flowStatus.syncElevmappe.result.elevmappe.CaseNumber
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
                ReferenceNumber: flowStatus.parseJson.result.SavedValues.Login.UserID,
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
                Title: `Søknad om mer opplæring - ${flowStatus.parseJson.result.SavedValues.Login.FirstName} ${flowStatus.parseJson.result.SavedValues.Login.LastName}`,
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Status: 'J',
            UnofficialTitle: 'Søknad om mer opplæring',
            Title: 'Søknad om meropplæring',
            Archive: 'Sensitivt elevdokument',
            CaseNumber: caseNumber,
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200472' : '200250',
            AccessCode: '13',
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            AccessGroup: 'Fagopplæringg'
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
        // const xmlData = flowStatus.parseXml.result.ArchiveData
        const jsonData = flowStatus.parseJson.result.SavedValues
        // if (!xmlData.Postnr) throw new Error('Postnr har ikke kommet med fra XML') // validation example
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/OPT-TAN-Utdanningfolkehelseogtannhelse-Meropplring/Lists/Mer%20opplring/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/OPT-TAN-Utdanningfolkehelseogtannhelse-Meropplring/Lists/Mer%20opplring/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: jsonData.Login.UserID, // Required. Must be unique
              Fornavn: jsonData.Login.FirstName,
              Etternavn: jsonData.Login.LastName,
              Epost: jsonData.Login.Email,
              Mobilnr: jsonData.Login.Telephone,
              Adresse: jsonData.Login.Address,
              Postnr: jsonData.Login.PostalCode,
              Sted: jsonData.Login.PostalArea,
              _x00d8_nske: flowStatus.parseJson.result.DialogueInstance.Informasjon_om_1.Jeg_har_hatt_op,
              Skole: flowStatus.parseJson.result.DialogueInstance.Informasjon_om_1.Skolegruppe1.Skole,
              Skolefag: flowStatus.parseJson.result.DialogueInstance.Informasjon_om_1.Skolegruppe1.Fag_det_ønskes_,
              SkoleEpost: jsonData.Dataset.Skole.Epost,
              Fagoppl_x00e6_ring: flowStatus.parseJson.result.DialogueInstance.Informasjon_om_1.Skolegruppe1.Fagopplæring,
              Voksenoppl_x00e6_ring: flowStatus.parseJson.result.DialogueInstance.Informasjon_om_1.Skolegruppe1.Voksenopplæring
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
          company: 'Fagopplæring', // Required. The name of the company
          department: '',
          description, // Required. A description of what the statistic element represents
          type: 'Søknad om meropplæring ', // Required. A short searchable type-name that distinguishes the statistic element
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
