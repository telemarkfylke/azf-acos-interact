// const description = 'Sender Elevavtale signert til elevmappe'
const { postUpdateToElevkontraktNewAcos, postToElevKontraktNewAcos } = require('../lib/jobs/customJobs/elevkontrakt')
const { schoolInfo } = require('../lib/data-sources/tfk-schools')

module.exports = {
  config: {
    enabled: true,
    doNotRemoveBlobs: false
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
  // CustomJob post to mongoDB
  customJobPostToMongoDB: {
    enabled: true,
    runAfter: 'archive',
    options: {},
    customJob: async (jobDef, flowStatus) => {
      const result = await postToElevKontraktNewAcos(flowStatus)
      return result
    }
  },
  // CustomJob post update to mongoDB
  customJobPostUpdateToMongoDB: {
    enabled: true,
    runAfter: 'customJobPostToMongoDB',
    options: {},
    customJob: async (jobDef, flowStatus) => {
      const result = await postUpdateToElevkontraktNewAcos(flowStatus)
      return result
    }
  },
  // Synkroniser elevmappe
  syncElevmappe: {
    enabled: true,
    options: {
      mapper: (flowStatus) => { // for å opprette person basert på fødselsnummer
        // Mapping av verdier fra XML-avleveringsfil fra Acos.
        return {
          ssn: flowStatus.parseJson.result.DialogueInstance.Informasjon_om_.Privatperson.Fødselsnummer1 // Fnr til den som er logget inn (Elev)
        }
      }
    }
  },
  // Synkroniser foresatt
  syncPrivatePerson: {
    enabled: true,
    options: {
      mapper: (flowStatus) => { // for å opprette person basert på fødselsnummer
        // Mapping av verdier fra XML-avleveringsfil fra Acos.
        return {
          ssn: flowStatus.parseJson.result.DialogueInstance.Informasjon_om_.Fødselsnummer_t2.Fødselsnummer_t3 // Fnr til den som signerer avtalen (Elev eller Foresatt)
        }
      }
    }
  },
  // Arkiverer dokumentet i elevmappa
  archive: { // archive må kjøres for å kunne kjøre signOff (noe annet gir ikke mening)
    enabled: true,
    options: {
      mapper: (flowStatus, base64, attachments) => {
        const jsonData = flowStatus.parseJson.result
        const elevmappe = flowStatus.syncElevmappe.result.elevmappe
        const schoolOrgNr = jsonData.SavedValues.Integration.Elevavtaler.resp.schoolInfo.orgnr
        const school = schoolInfo.find(school => school.orgNr === schoolOrgNr)
        if (!school) throw new Error(`Could not find any school with orgNr: ${schoolOrgNr}`)
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
            Category: 'Dokument ut',
            Contacts: [ // Her vil alltid avsender være eleven, men mottaker kan være enten eleven (over 18) eller en foresatt (for elev under 18)
              {
                ReferenceNumber: jsonData.DialogueInstance.Informasjon_om_.Privatperson.Fødselsnummer1,
                Role: 'Mottaker',
                IsUnofficial: true
              },
              {
                ReferenceNumber: jsonData.DialogueInstance.Informasjon_om_.Fødselsnummer_t2.Fødselsnummer_t3,
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
                Title: 'Elevavtale - Signert',
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            ResponsibleEnterpriseNumber: schoolOrgNr,
            // ResponsiblePersonEmail: '',
            Status: 'J',
            Title: 'Elevavtale - Signert',
            // UnofficialTitle: '',
            Archive: 'Elevdokument',
            CaseNumber: elevmappe.CaseNumber
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
        const jsonData = flowStatus.parseJson.result
        const schoolOrgNr = jsonData.SavedValues.Integration.Elevavtaler.resp.schoolInfo.orgnr
        const school = schoolInfo.find(school => school.orgNr === schoolOrgNr)
        // Mapping av verdier fra XML-avleveringsfil fra Acos. Alle properties under må fylles ut og ha verdier
        return {
          company: 'Skoleutvikling og folkehelse',
          department: !school ? 'Ukjent skole' : school.primaryLocation,
          description: 'Elevavtale signert - låneavtale',
          type: 'Elevavtale signert - låneavtale' // Required. A short searchable type-name that distinguishes the statistic element
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
