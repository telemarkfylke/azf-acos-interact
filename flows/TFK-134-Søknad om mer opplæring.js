const description = 'Søknad om mer opplæring'
const { nodeEnv } = require('../config')
const { sendEmail } = require('../lib/jobs/customJobs/sendemail')

let recnoFagopplering = null
let tilgangsgruppe = null

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
      recnoFagopplering = null
      tilgangsgruppe = null
      const emailTo = []
      const subject = 'Kvittering - Ny søknad om mer opplæring'
      const body = `Til orientering<br>Du har fått en ny søknad om mer opplæring.<br>Du finner søknaden i P360. Saksnummer: ${flowStatus.syncElevmappe.result.elevmappe.CaseNumber}<br>Mer om saksbehanling finner du på innsida: <a href="https://telemarkfylke.sharepoint.com/sites/Min-arbeidshverdag/SitePages/Mer-oppl%C3%A6ring.aspx?csf=1&web=1&e=DWZOzR&CID=c31b6df8-34a0-4fac-b13a-7ccd25e3cca9&xsdata=MDV8MDJ8fDU0MmVlMWRmODEwNzRjNWI5ODQzMDhkZGE0MmNlNDAwfGQ2NDQwOGVlY2U1MjRhMDg5N2ZmNjU4YzAyY2NmNzdifDB8MHw2Mzg4NDcyMzQ4NjcyMzg5Nzl8VW5rbm93bnxWR1ZoYlhOVFpXTjFjbWwwZVZObGNuWnBZMlY4ZXlKV0lqb2lNQzR3TGpBd01EQWlMQ0pRSWpvaVYybHVNeklpTENKQlRpSTZJazkwYUdWeUlpd2lWMVFpT2pFeGZRPT18MXxMMk5vWVhSekx6RTVPak0yTlRaak9UZ3pMV000TlRrdE5HRTRaUzFoTm1GbExXUTNNRFE0WWpKbU9HUTNZMTlpWVdRMVpqWmpPUzB4TUdFMExUUmhNelF0T0RObE9DMWhPVEJsTlRWaVpHTTBOalJBZFc1eExtZGliQzV6Y0dGalpYTXZiV1Z6YzJGblpYTXZNVGMwT1RFeU5qWXhNVGN6Tnc9PXw1MDU4MDhlOTNlMDc0MmNiOTg0MzA4ZGRhNDJjZTQwMHw3ZWFiOGNmYTY4ZmE0ZjA2ODhmN2U2Njc0NDk5MmFiNg%3D%3D&sdata=SWowamRYNGF1R1FtMW0rZUdwWTB1aVVwaDVqMFFlT0pDTVhTeHhoNkNRbz0%3D&ovuser=d64408ee-ce52-4a08-97ff-658c02ccf77b%2Ctom.jarle.christiansen%40telemarkfylke.no&OR=Teams-HL&CT=1749204981627&clickparams=eyJBcHBOYW1lIjoiVGVhbXMtRGVza3RvcCIsIkFwcFZlcnNpb24iOiI1MC8yNTA2MDIwNjYwMSIsIkhhc0ZlZGVyYXRlZFVzZXIiOmZhbHNlfQ%3D%3D">Mer opplæring</a><br><br>Med vennlig hilsen<br>Telemark fylkeskommune`
      if (flowStatus.parseJson.result.DialogueInstance.Informasjon_om_1.Jeg_har_hatt_op === 'Skole') {
        if (flowStatus.parseJson.result.SavedValues.Dataset.Skole.Epost === 'ranveig.gule@telemarkfylke.no') {
          emailTo.push('ranveig.gule@telemarkfylke.no')
          tilgangsgruppe = 'Elev Inntak'
        } else {
          emailTo.push(flowStatus.parseJson.result.SavedValues.Dataset.Skole.Epost)
          tilgangsgruppe = `Elev ${flowStatus.parseJson.result.SavedValues.Dataset.Skole.kolonne1}`
        }
        console.log(`Tilgangsgruppe satt til: ${tilgangsgruppe}`)
      } else if (flowStatus.parseJson.result.DialogueInstance.Informasjon_om_1.Jeg_har_hatt_op === 'Fagopplæring') {
        emailTo.push('fagopplering@telemarkfylke.no')
        recnoFagopplering = nodeEnv === 'production' ? '200472' : '200249' // Fagopplæring recno
        tilgangsgruppe = 'Fagopplæring'
      } else if (flowStatus.parseJson.result.DialogueInstance.Informasjon_om_1.Jeg_har_hatt_op === 'Voksenopplæring') {
        emailTo.push('voksenoppleringen@telemarkfylke.no')
        recnoFagopplering = nodeEnv === 'production' ? '200472' : '200249' // Fagopplæring recno
        tilgangsgruppe = 'Voksenopplæring'
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
            Title: 'Søknad om mer opplæring',
            Archive: 'Sensitivt elevdokument',
            CaseNumber: caseNumber,
            ResponsibleEnterpriseRecno: recnoFagopplering,
            ResponsibleEnterpriseNumber: flowStatus.parseJson.result.SavedValues.Dataset.Skole.OrgNr,
            AccessCode: '13',
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            AccessGroup: tilgangsgruppe
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
              Voksenoppl_x00e6_ring: flowStatus.parseJson.result.DialogueInstance.Informasjon_om_1.Skolegruppe1.Voksenopplæring,
              Saksnummer: flowStatus.syncElevmappe.result.elevmappe.CaseNumber
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
          type: 'Søknad om mer opplæring ', // Required. A short searchable type-name that distinguishes the statistic element
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
