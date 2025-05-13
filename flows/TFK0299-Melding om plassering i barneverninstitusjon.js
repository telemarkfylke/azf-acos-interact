const description = 'Skjemaer arkiveres i P360 og sendes til ground control for videre behandling'
// const { nodeEnv } = require('../config')
// const { schoolInfo } = require('../lib/data-sources/tfk-schools')

module.exports = {
  config: {
    enabled: true,
    doNotRemoveBlobs: true
  },
  parseXml: {
    enabled: true,
    options: {
    }
  },
  groundControl: {
    enabled: true, // Files will be copied to GROUND_CONTROL_STORAGE_ACCOUNT_CONTAINER_NAME, and will be downloaded on local server (./ground-control/index.js)
    options: {
      condition: (flowStatus) => { // Run archive only if isError === false.
        if (flowStatus.parseXml.result.ArchiveData.Egendefinert1) { return true } else { return false } // Skal kun til arkiv hvis sjekkboks er huket av
      }
    }
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
            AccessCode: '13',
            AccessGroup: 'Elev PPT', // Skal være 'Elev PPT' i prod
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
            // ResponsibleEnterpriseNumber: '200019', // Her må det være orgnr til PPT - Sjekk med arkiv
            Status: 'J',
            Title: 'Melding om plassering i barneverninstitusjon',
            UnofficialTitle: `Melding om plassering i barneverninstitusjon -  ${xmlData.Fornavn} ${xmlData.Etternavn}`,
            Archive: 'Sensitivt elevdokument',
            CaseNumber: elevmappe.CaseNumber,
            ResponsibleEnterpriseRecno: '200019' // Seksjon PPT, OT og alternative opplæringsarenaer
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
