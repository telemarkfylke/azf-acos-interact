const description = 'Sender til ground control for videre behandling'
// const { nodeEnv } = require('../config')
const { schoolInfo } = require('../lib/data-sources/tfk-schools')

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
    enabled: true // Files will be copied to GROUND_CONTROL_STORAGE_ACCOUNT_CONTAINER_NAME, and will be downloaded on local server (./ground-control/index.js)
  },
  // Synkroniser elevmappe
  syncElevmappe: {
    enabled: true,
    options: {
      mapper: (flowStatus) => { // for å opprette person basert på fødselsnummer
        return {
          ssn: flowStatus.parseXml.result.ArchiveData.Fnr
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
            Title: 'Henvisning til pedagogisk psykologisk tjeneste (Signert)',
            VersionFormat: att.versionFormat
          }
        })
        const documentData = {
          service: 'DocumentService',
          method: 'CreateDocument',
          parameter: {
            AccessCode: '13',
            Category: 'Dokument inn',
            Contacts: [
              {
                ReferenceNumber: xmlData.Fnr,
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
                Title: 'Henvisning til pedagogisk psykologisk tjeneste (Signert)',
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            ResponsibleEnterpriseNumber: school.orgNr,
            Status: 'J',
            Title: 'Henvisning til pedagogisk psykologisk tjeneste (Signert)',
            UnofficialTitle: `Henvisning til pedagogisk psykologisk tjeneste (Signert) -  ${xmlData.Fornavn} ${xmlData.Etternavn}`,
            Archive: 'Sensitivt elevdokument',
            CaseNumber: elevmappe.CaseNumber
            // ResponsibleEnterpriseRecno: nodeEnv === 'production' ? xmlData.SkoleOrgNr : xmlData.SkoleOrgNr, // Team fag-, yrkes- og voksenopplæring
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
          department: 'Henvisning til pedagogisk-psykologisk tjeneste (PPT)',
          description,
          type: 'Henvisning' // Required. A short searchable type-name that distinguishes the statistic element
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
