const description = 'Sender elevkontrakt usignert til elevmappe'
const { nodeEnv } = require('../config')
const { postToElevkontrakt } = require('../lib/jobs/customJobs/elevkontrakt')
module.exports = {
  config: {
    enabled: false,
    doNotRemoveBlobs: true
  },
  parseXml: {
    enabled: true,
    options: {
    }
  },

  // CustomJob post to mongoDB
  customJobPostToMongoDB: {
    enabled: true,
    runAfter: 'parseXml',
    options:{},
    customJob: async (flowStatus) => {
      console.log(flowStatus)
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
          ssn: flowStatus.parseXml.result.ArchiveData.Fnr
        }
      }
    }
  },
  // Arkiverer dokumentet i elevmappa
  archive: { // archive må kjøres for å kunne kjøre signOff (noe annet gir ikke mening)
    enabled: false,
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
              },
            ],
            DocumentDate: new Date().toISOString(),
            Files: [
              {
                Base64Data: base64,
                Category: '1',
                Format: 'pdf',
                Status: 'F',
                Title: 'Elevkontrakt - Usignert',
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            ResponsibleEnterpriseNumber: xmlData.SkoleOrgNr,
            // ResponsiblePersonEmail: '',
            Status: 'J',
            Title: 'Elevkontrakt - Usignert',
            // UnofficialTitle: '',
            Archive: 'Sensitivt elevdokument',
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
    enabled: false,
    options: {
      mapper: (flowStatus) => {
        const school = schoolInfo.find(school => school.orgNr.toString() === xmlData.SkoleOrgNr)
        // Mapping av verdier fra XML-avleveringsfil fra Acos. Alle properties under må fylles ut og ha verdier
        if(flowStatus.parseXml.result.ArchiveData.isError === 'false') {
          return {
            company: 'Skoleutvikling og folkehelse',
            department: !school ? 'Ukjent skole' : school.primaryLocation,
            description,
            type: 'Elevkontrakt usignert', // Required. A short searchable type-name that distinguishes the statistic element
            // optional fields:
            documentNumber: flowStatus.archive?.result?.DocumentNumber
          }
        } else {
          return {
            company: 'Skoleutvikling og folkehelse',
            department: !school ? 'Ukjent skole' : school.primaryLocation,
            description: 'Elevkontrakt usignert - Error',
            type: 'Elevkontrakt usignert - Error', // Required. A short searchable type-name that distinguishes the statistic element
          }
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}