const description = 'Sender til elevmappe'
const { nodeEnv } = require('../config')
const title = 'Klage - standpunkt og eksamen'
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
            Title: att.title,
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
                Title: title,
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            Status: 'J',
            Title: title,
            // UnofficialTitle: '',
            Archive: 'Sensitivt elevdokument',
            CaseNumber: elevmappe.CaseNumber
          }
        }

        if (xmlData.Egendefinert1 === 'Eleveksamen eller standpunkt') {
          const school = schoolInfo.find(school => school.orgNr.toString() === xmlData.SkoleOrgNr)
          if (!school) throw new Error(`Could not find any school with orgNr: ${xmlData.SkoleOrgNr}`)
          documentData.parameter.ResponsibleEnterpriseNumber = xmlData.SkoleOrgNr
          documentData.parameter.AccessGroup = school.tilgangsgruppe
        } else if (xmlData.Egendefinert1 === 'Privatisteksamen') {
          documentData.parameter.ResponsibleEnterpriseRecno = nodeEnv === 'production' ? '200471' : '200250' // Seksjon Sektorstøtte, inntak og eksamen
          documentData.parameter.AccessGroup = 'Eksamen'
        } else {
          throw new Error('Fikk ukjent verdi inn i Egendefinert1 fra skjemaets xml-fil. Trenger "Privatisteksamen" eller "Eleveksamen eller standpunkt"')
        }
        return documentData
      }
    }

  },

  signOff: {
    enabled: false
  },

  closeCase: {
    enabled: false
  },

  // SP-info er kun template. Venter på info om avlevering
  sharepointList: {
    enabled: true,
    options: {
      condition: (flowStatus) => { // use this if you only need to archive some of the forms.
        return flowStatus.parseXml.result.ArchiveData.Egendefinert1 === 'Privatisteksamen'
      },
      mapper: (flowStatus) => {
        const xmlData = flowStatus.parseXml.result.ArchiveData
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/T-Utdanningfolkehelseogtannhelse-Eksamen-mottakdigitaleskjemaer/Lists/Privatisteksamen%20%20Klager/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/T-Utdanningfolkehelseogtannhelse-Eksamen-mottakdigitaleskjemaer/Lists/Privatisteksamen%20%20Klager/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: false,
            fields: {
              Title: xmlData.Fnr,
              Navn: `${xmlData.Fornavn} + ${xmlData.Etternavn}`,
              Mobilnummer: xmlData.mobilnr,
              Fagkode: xmlData.Egendefinert2
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
          company: 'Opplæring',
          department: 'FAGOPPLÆRING',
          description,
          type: title, // Required. A short searchable type-name that distinguishes the statistic element
          // optional fields:
          tilArkiv: flowStatus.parseXml.result.ArchiveData.TilArkiv,
          documentNumber: flowStatus.archive?.result?.DocumentNumber || 'tilArkiv er false' // Optional. anything you like
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
