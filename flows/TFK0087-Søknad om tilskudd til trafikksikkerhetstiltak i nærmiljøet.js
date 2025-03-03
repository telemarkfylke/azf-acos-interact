const description = 'TFK0087-Søknad om tilskudd til trafikksikkerhetstiltak i nærmiljøet'
const { nodeEnv } = require('../config')

/*
  Soknad {
    string Fnr
    string OrgNr
    string Navn
    string Epost
    string Type
    string Tiltak
    int Totalkostnad
    int Soknadsbelop
    string Egenfinansiering
    string Beskrivelse
    string Forslag
    string AndreOpplysninger
    string OrgNavn
    string reserve2
  }
*/

module.exports = {
  config: {
    enabled: true,
    doNotRemoveBlobs: false
  },
  parseXml: {
    enabled: true
  },
  syncPrivatePerson: {
    enabled: true,
    options: {
      condition: (flowStatus) => { // use this if you only need to archive some of the forms.
        return flowStatus.parseXml.result.Soknad.Fnr !== ''
      },
      mapper: (flowStatus) => { // for å opprette person basert på fødselsnummer
        // Mapping av verdier fra XML-avleveringsfil fra Acos.
        return {
          ssn: flowStatus.parseXml.result.Soknad.Fnr
        }
      }
    }
  },
  syncEnterprise: {
    enabled: true,
    options: {
      condition: (flowStatus) => { // use this if you only need to archive some of the forms.
        return flowStatus.parseXml.result.Soknad.OrgNr !== ''
      },
      mapper: (flowStatus) => { // for å opprette organisasjon basert på orgnummer
        // Mapping av verdier fra XML-avleveringsfil fra Acos.
        return {
          orgnr: flowStatus.parseXml.result.Soknad.OrgNr.replaceAll(' ', '')
        }
      }
    }
  },
  // Arkiverer dokumentet i 360
  handleCase: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        return {
          service: 'CaseService',
          method: 'CreateCase',
          parameter: {
            CaseType: 'Sak',
            Project: nodeEnv === 'production' ? '25-182' : '24-3',
            Title: 'Søknad om tilskudd til trafikksikkerhetstiltak i nærmiljøet 2025',
            // UnofficialTitle: ,
            Status: 'B',
            JournalUnit: 'Sentralarkiv',
            SubArchive: 'Sakarkiv',
            ArchiveCodes: [
              {
                ArchiveCode: '243',
                ArchiveType: 'FELLESKLASSE PRINSIPP',
                Sort: 1
              },
              {
                ArchiveCode: 'Q88',
                ArchiveType: 'FAGKLASSE PRINSIPP',
                Sort: 2
              }
            ],
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200018' : '200023', // Seksjon Vegforvaltning og transport
            ResponsiblePersonEmail: 'anncarin.risinggaard@telemarkfylke.no',
            AccessGroup: 'Alle'
          }
        }
      }
    }
  },
  archive: {
    enabled: true,
    options: {
      mapper: (flowStatus, base64, attachments) => {
        const xmlData = flowStatus.parseXml.result.Soknad
        const caseNumber = flowStatus.handleCase.result.CaseNumber
        let contact
        if (xmlData.OrgNr !== undefined || xmlData.OrgNr !== 'undefined') {
          contact = xmlData.OrgNr.replaceAll(' ', '')
        } else {
          contact = xmlData.Fnr
        }
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
            Category: 'Dokument inn',
            Contacts: [
              {
                ReferenceNumber: contact,
                Role: 'Avsender',
                IsUnofficial: false
              }
            ],
            Files: [
              {
                Base64Data: base64,
                Category: '1',
                Format: 'pdf',
                Status: 'F',
                Title: 'Søknad om tilskudd til trafikksikkerhetstiltak i nærmiljøet 2025',
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Status: 'J',
            DocumentDate: new Date().toISOString(),
            Title: 'Søknad om tilskudd til trafikksikkerhetstiltak i nærmiljøet 2025',
            Archive: 'Saksdokument',
            CaseNumber: caseNumber,
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200018' : '200023', // Seksjon Vegforvaltning og transport
            AccessCode: 'U',
            Paragraph: '',
            AccessGroup: 'Alle'
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
        const xmlData = flowStatus.parseXml.result.Soknad
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMF-Samferdselsektorteam/Lists/soknaderTilskuddTrafikksikkerhetstiltak/AllItems',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMF-Samferdselsektorteam/Lists/soknaderTilskuddTrafikksikkerhetstiltak/AllItems',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Navn: xmlData.Navn,
              Epost: xmlData.Epost,
              Soknadstype: xmlData.Type,
              Tiltak: xmlData.Tiltak,
              Totalkostnad: xmlData.Totalkostnad,
              Soknadsbelop: xmlData.Soknadsbelop,
              Egenfinansiering: xmlData.Egenfinansiering,
              Beskrivelse: xmlData.Beskrivelse,
              Forslag: xmlData.Forslag,
              AndreOpplysninger: xmlData.AndreOpplysninger,
              OrgNavn: xmlData.OrgNavn
              // reserve2: xmlData.reserve2
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
        // Mapping av verdier fra XML-avleveringsfil fra Acos. Alle properties under må fylles ut og ha verdier
        return {
          company: 'Samferdsel',
          department: 'Vegforvaltning og transport',
          description, // Required. A description of what the statistic element represents
          type: 'Tilskudd til trafikksikkerhetstiltak i nærmiljøet', // Required. A short searchable type-name that distinguishes the statistic element
          // optional fields:
          documentNumber: flowStatus.archive.result.DocumentNumber // Optional. anything you like
        }
      }
    }
  },
  failOnPurpose: {
    enabled: false
  }
}
