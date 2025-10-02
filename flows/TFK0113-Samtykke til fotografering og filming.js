const description = 'Sender til Sharepoint. Samme liste som VFK0112'
const { schoolInfo } = require('../lib/data-sources/tfk-schools')
// const { nodeEnv } = require('../config')

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

  // Synkroniser elevmappe
  syncElevmappe: {
    enabled: true,
    options: {
      mapper: (flowStatus) => { // for å opprette person basert på fødselsnummer
        // Mapping av verdier fra XML-avleveringsfil fra Acos.
        return {
          ssn: flowStatus.parseXml.result.ArchiveData.Fnr // Fnr til den som er logget inn (Elev)
        }
      }
    }
  },

  // Arkiverer dokumentet i elevmappa
  archive: { // archive må kjøres for å kunne kjøre signOff (noe annet gir ikke mening)
    enabled: true,
    options: {
      /*
      condition: (flowStatus) => { // use this if you only need to archive some of the forms.
        return flowStatus.parseXml.result.ArchiveData.TilArkiv === 'true'
      },
      */
      mapper: (flowStatus, base64, attachments) => {
        const xmlData = flowStatus.parseXml.result.ArchiveData
        const elevmappe = flowStatus.syncElevmappe.result.elevmappe
        const school = schoolInfo.find(school => school.orgNr.toString() === xmlData.Tilgangsgruppe) // Bruker tilgangsgrupper fordi jeg ikke gidder å skrive om avleveringen fra Gamle acos. Robin. 02-10-2025
        if (!school) throw new Error(`Could not find any school with orgNr: ${xmlData.Tilgangsgruppe}`)
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
                Title: 'Samtykke til fotografering og filming',
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            ResponsibleEnterpriseNumber: xmlData.Tilgangsgruppe,
            // ResponsiblePersonEmail: '',
            Status: 'J',
            Title: 'Samtykke til fotografering og filming',
            UnofficialTitle: `Samtykke til fotografering og filming - ${xmlData.Fornavn} ${xmlData.Etternavn}`,
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

  sharepointList: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        const xmlData = flowStatus.parseXml.result.ArchiveData
        // if (!xmlData.Postnr) throw new Error('Postnr har ikke kommet med fra XML') // validation example
        return [
          {
            testListUrl: '',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/BDK-Bilde-ogvideoarkiv-Samtykkeskjema20212/Lists/Samtykke',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              AnsattVTFK: xmlData.AnsattVTFK,
              Brukernavn_x0028_ansatt_x0029_: xmlData.Brukernavn,
              Etternavn: `${xmlData.Navn} ${xmlData.Etternavn}`,
              Datoforsamtykke: xmlData.DatoSamtykke,
              E_x002d_postadresse: xmlData.Epost,
              Mobilnummer: xmlData.Mobil,
              Samtykkesituasjonsbilde_x0028_an: xmlData.SamtykkeInterneKanaler,
              Digitalekanaler: xmlData.SamtykkeMedier,
              Internekanaler_x002f_systemer: xmlData.SamtykkeProfilbilde
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
        // const xmlData = flowStatus.parseXml.result.ArchiveData
        // Mapping av verdier fra XML-avleveringsfil fra Acos. Alle properties under må fylles ut og ha verdier
        return {
          company: 'Stab',
          department: 'Kommunikasjon',
          description,
          type: 'Samtykke til fotografering og filming' // Required. A short searchable type-name that distinguishes the statistic element
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
