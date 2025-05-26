const description = 'Sender Elevavtale signert til elevmappe'
const { postUpdateToElevkontrakt } = require('../lib/jobs/customJobs/elevkontrakt')
const { schoolInfo } = require('../lib/data-sources/tfk-schools')

module.exports = {
  config: {
    enabled: true,
    doNotRemoveBlobs: true
  },
  parseXml: {
    enabled: true,
  },

  // CustomJob post to mongoDB
  customJobPostToMongoDB: {
    enabled: true,
    runAfter: 'archive',
    options: {},
    customJob: async (jobDef, flowStatus) => {
      const result = await postUpdateToElevkontrakt(flowStatus)
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
          ssn: flowStatus.parseXml.result.ArchiveData.FnrElev
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
          ssn: flowStatus.parseXml.result.ArchiveData.FnrForesatt
        }
      }
    }
  },
  // Arkiverer dokumentet i elevmappa
  archive: { // archive må kjøres for å kunne kjøre signOff (noe annet gir ikke mening)
    enabled: true,
    options: {
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
                ReferenceNumber: xmlData.FnrElev,
                Role: 'Mottaker',
                IsUnofficial: true
              },
              {
                ReferenceNumber: xmlData.FnrForesatt,
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
            type: 'Elevavtale signert', // Required. A short searchable type-name that distinguishes the statistic element
            // optional fields:
            documentNumber: flowStatus.archive?.result?.DocumentNumber
          }
        } else {
          return {
            company: 'Skoleutvikling og folkehelse',
            department: !school ? 'Ukjent skole' : school.primaryLocation,
            description: 'Elevavtale signert - Error',
            type: 'Elevavtale signert - Error' // Required. A short searchable type-name that distinguishes the statistic element
          }
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
