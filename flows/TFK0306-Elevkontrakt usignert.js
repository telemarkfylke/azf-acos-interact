const description = 'Sender Elevavtale usignert til elevmappe'
const { postToElevkontrakt } = require('../lib/jobs/customJobs/elevkontrakt')
const { schoolInfo } = require('../lib/data-sources/tfk-schools')

module.exports = {
  config: {
    enabled: true,
    doNotRemoveBlobs: false
  },
  parseXml: {
    enabled: true
  },

  // CustomJob post to mongoDB
  customJobPostToMongoDB: {
    enabled: true,
    runAfter: 'parseXml', // Run this job after parseXml has run.
    options: {},
    customJob: async (jobDef, flowStatus) => {
      // This job will post the flowStatus to the elevkontrakt API.
      const result = await postToElevkontrakt(flowStatus)
      return result
    }
  },

  // Synkroniser elevmappe
  syncElevmappe: {
    enabled: false,
    options: {
      condition: (flowStatus) => { // Run syncElevmappe only if isError === false.
        return flowStatus.parseXml.result.ArchiveData.isError === 'false'
      },
      mapper: (flowStatus) => { // for å opprette person basert på fødselsnummer
        // Mapping av verdier fra XML-avleveringsfil fra Acos.
        return {
          ssn: flowStatus.parseXml.result.ArchiveData.FnrElev
        }
      }
    }
  },
  // Synkroniser foresatt
  syncPrivatePerson: {
    enabled: false,
    options: {
      condition: (flowStatus) => { // Run syncElevmappe only if isError === false.
        return flowStatus.parseXml.result.ArchiveData.isError === 'false' && flowStatus.parseXml.result.ArchiveData.FnrForesatt !== ''
      },
      mapper: (flowStatus) => { // for å opprette person basert på fødselsnummer
        // Mapping av verdier fra XML-avleveringsfil fra Acos.
        return {
          ssn: flowStatus.parseXml.result.ArchiveData.FnrForesatt
        }
      }
    }
  },
  // Arkiverer dokumentet i elevmappa
  archive: { // archive må kjøres for å kunne kjøre signOff (noe annet gir ikke mening)
    enabled: false, // This is disabled because we are not archiving the document in this flow.
    options: {
      condition: (flowStatus) => { // Run archive only if isError === false.
        return flowStatus.parseXml.result.ArchiveData.isError === 'false'
      },
      mapper: (flowStatus, base64, attachments) => {
        const xmlData = flowStatus.parseXml.result.ArchiveData
        const elevmappe = flowStatus.syncElevmappe.result.elevmappe
        const school = schoolInfo.find(school => school.orgNr.toString() === xmlData.SkoleOrgNr)
        if (!school) throw new Error(`Could not find any school with orgNr: ${xmlData.SkoleOrgNr}`)
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
                ReferenceNumber: xmlData.isUnder18 === 'true' ? xmlData.FnrForesatt : xmlData.FnrElev,
                Role: 'Mottaker',
                IsUnofficial: true
              },
              {
                ReferenceNumber: xmlData.FnrElev,
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
                Title: 'Elevavtale - Usignert',
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            ResponsibleEnterpriseNumber: xmlData.SkoleOrgNr,
            // ResponsiblePersonEmail: '',
            Status: 'J',
            Title: 'Elevavtale - Usignert',
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
        const xmlData = flowStatus.parseXml.result.ArchiveData
        const school = schoolInfo.find(school => school.orgNr.toString() === xmlData.SkoleOrgNr)
        // Mapping av verdier fra XML-avleveringsfil fra Acos. Alle properties under må fylles ut og ha verdier
        if (flowStatus.parseXml.result.ArchiveData.isError === 'false') {
          return {
            company: 'Skoleutvikling og folkehelse',
            department: !school ? 'Ukjent skole' : school.primaryLocation,
            description,
            type: 'Elevavtale usignert', // Required. A short searchable type-name that distinguishes the statistic element
            // optional fields:
            documentNumber: flowStatus.archive?.result?.DocumentNumber
          }
        } else {
          return {
            company: 'Skoleutvikling og folkehelse',
            department: !school ? 'Ukjent skole' : school.primaryLocation,
            description: 'Elevavtale usignert - Error',
            type: 'Elevavtale usignert - Error' // Required. A short searchable type-name that distinguishes the statistic element
          }
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
