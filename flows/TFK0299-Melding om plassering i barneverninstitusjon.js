const { nodeEnv } = require('../config')
// const { toGroundControl } = require('../lib/jobs/customJobs/groundcontrol')
const description = 'Skjemaer arkiveres i P360 og sendes til ground control for videre behandling'

module.exports = {
  config: {
    enabled: true,
    doNotRemoveBlobs: false
  },
  parseXml: {
    enabled: true,
    options: {
    }
  },
  groundControl: {
    enabled: true,
    options: {
      condition: (flowStatus) => {
        return flowStatus.parseXml.result.ArchiveData.Egendefinert1 === 'true'
      }
    }
  },
  handleCase: {
    enabled: true,
    options: {
      getCaseParameter: (flowStatus) => {
        return {
          Title: 'Opplæring i barnevern- og helseinstitusjoner', // check for exisiting case with this title
          ArchiveCode: flowStatus.parseXml.result.ArchiveData.Fnr // Sjekker om det finnes en sak med fnr
        }
      },
      mapper: (flowStatus) => {
        return {
          service: 'CaseService',
          method: 'CreateCase',
          parameter: {
            CaseType: 'Elev',
            Title: 'Opplæring i barnevern- og helseinstitusjoner',
            UnofficialTitle: `Opplæring i barnevern- og helseinstitusjoner - ${flowStatus.parseXml.result.ArchiveData.Fornavn} ${flowStatus.parseXml.result.ArchiveData.Etternavn}`,
            Status: 'B',
            AccessCode: '13',
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            SubArchive: 'Elev',
            ArchiveCodes: [
              {
                ArchiveCode: flowStatus.parseXml.result.ArchiveData.Fnr,
                ArchiveType: 'FNR',
                Sort: 1,
                IsManualText: true
              },
              {
                ArchiveCode: 'B31',
                ArchiveType: 'FAGKLASSE PRINSIPP',
                Sort: 2
              }
            ],
            Contacts: [
              {
                Role: 'Sakspart',
                ReferenceNumber: flowStatus.parseXml.result.ArchiveData.Fnr,
                IsUnofficial: true
              }
            ],
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200027' : '200021',
            AccessGroup: 'Opplæring barnevernsinstitusjoner'
          }
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
        const caseNumber = nodeEnv === 'production' ? flowStatus.handleCase.result.CaseNumber : flowStatus.handleCase.result.CaseNumber
        const p360Attachments = attachments.map(att => {
          return {
            Base64Data: att.base64,
            Format: att.format,
            Status: 'F',
            Title: 'Melding om plassering i barneverninstitusjon',
            VersionFormat: att.versionFormat
          }
        })
        const documentData = {
          service: 'DocumentService',
          method: 'CreateDocument',
          parameter: {
            CaseType: 'Elev',
            AccessCode: '13',
            AccessGroup: 'Opplæring barnevernsinstitusjoner',
            Category: 'Dokument inn', // 'Dokument inn' fra foresatt til PPT
            Contacts: [
              {
                ReferenceNumber: xmlData.Egendefinert2, // Foresatt får kopi
                Role: 'Kopi til',
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
                Title: 'Melding om plassering i barneverninstitusjon',
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            Status: 'M',
            Title: 'Melding om plassering i barneverninstitusjon',
            UnofficialTitle: `Melding om plassering i barneverninstitusjon - ${xmlData.Fornavn} ${xmlData.Etternavn}`,
            Archive: 'Sensitivt elevdokument',
            CaseNumber: caseNumber, // Elevmappe eller Opplæring i barnevern- og helseinstitusjoner egen mappe?
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200027' : '200021' // Seksjon skoleutvikling og folkehelse
          }
        }
        return documentData
      }
    }
  },
  statistics: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        // const xmlData = flowStatus.parseXml.result.ArchiveData
        // Mapping av verdier fra XML-avleveringsfil fra Acos. Alle properties under må fylles ut og ha verdier
        return {
          company: 'PPT',
          department: 'Melding om behov for opplæring ved innleggelse i helseinstitusjon',
          description,
          type: 'Henvisning-PPT-Helseinstitusjon' // Required. A short searchable type-name that distinguishes the statistic element
          // optional fields:
          // tilArkiv: flowStatus.parseXml.result.ArchiveData.TilArkiv,
          // documentNumber: flowStatus.archive?.result?.DocumentNumber || 'tilArkiv er false' // Optional. anything you like
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
