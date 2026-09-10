const description = 'TFK-30 - Frasier seg hele eller deler av tilbudet om individuelt tilrettelagt opplæring'
const title = 'Frasier seg hele eller deler av tilbudet om individuelt tilrettelagt opplæring'
const nodeEnv = require('../config').nodeEnv
const { schoolInfo } = require('../lib/data-sources/tfk-schools')

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
          ssn: flowStatus.parseJson.result.DialogueInstance.Innhenting_av.Gruppe.Fodselsnummer
        }
      }
    }
  },

  // Arkiverer dokumentet i elevmappa
  archive: {
    enabled: true,
    options: {
      mapper: (flowStatus, base64, attachments) => {
        const schoolName = flowStatus.parseJson.result.DialogueInstance.Innhenting_av.Informasjon_om?.Skole
        const school = schoolInfo.find(school => schoolName && (school.primaryLocation === schoolName || school.officeLocation === schoolName))
        if (!school) throw new Error('TFK-30: Could not resolve school from Innhenting_av.Informasjon_om.Skole')
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
            AccessGroup: school.tilgangsgruppe,
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
                Title: title,
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            ResponsibleEnterpriseNumber: school.orgNr.toString(),
            Status: 'J',
            Title: title,
            UnofficialTitle: `${title} - ${flowStatus.syncElevmappe.result.privatePerson.name}`,
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

  statistics: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        return {
          company: 'Opplæring',
          department: '',
          description,
          type: 'Frasier seg hele eller deler av tilbudet om individuelt tilrettelagt opplæring',
          documentNumber: flowStatus.archive?.result?.DocumentNumber
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
