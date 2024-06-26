const description = 'TFK0280-Bestilling arbeid utført av seksjon vegutbygging'
const { nodeEnv } = require('../config')

/*
ArchiveData {
  string Seksjon
  string Navn
  string Epost
  string Tjeneste
  string Omfang
  string SupInfo
  string Start
  string Stopp
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
    enabled: false,
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
    enabled: false,
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
    enabled: false,
    options: {
      mapper: (flowStatus) => {
        return {
          service: 'CaseService',
          method: 'CreateCase',
          parameter: {
            CaseType: 'Sak',
            Project: nodeEnv === 'production' ? '24-485' : '24-3',
            Title: `Søknad om tilskudd til trafikksikkerhetstiltak - Vegnummer: ${flowStatus.parseXml.result.Soknad.Type}`,
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
    enabled: false,
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
                Title: 'Søknad om tilskudd til rafikksikkerhetstiltak i nærmiljøet 2024',
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Status: 'J',
            DocumentDate: new Date().toISOString(),
            Title: `Søknad om tilskudd til trafikksikkerhetstiltak - Vegnummer: ${flowStatus.parseXml.result.Soknad.Type}`,
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
        const xmlData = flowStatus.parseXml.result.ArchiveData
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMF-Samferdselsektorteam/Lists/bestillingArbeidVegutbygging/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMF-Samferdselsektorteam/Lists/bestillingArbeidVegutbygging/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Seksjon: xmlData.Seksjon,
              Navn: xmlData.Navn,
              Epost: xmlData.Epost,
              Tjeneste: xmlData.Tjeneste,
              Omfang: xmlData.Omfang,
              SupInfo: xmlData.SupInfo,
              Start: xmlData.Start,
              Stopp: xmlData.Stopp
            }
          }
        ]
      }
    }
  },
  statistics: {
    enabled: false,
    options: {
      mapper: (flowStatus) => {
        // Mapping av verdier fra XML-avleveringsfil fra Acos. Alle properties under må fylles ut og ha verdier
        return {
          company: 'Kultur',
          department: '',
          description, // Required. A description of what the statistic element represents
          type: 'Tilskudd til idrettsarrangement og regionale idrettsanlegg', // Required. A short searchable type-name that distinguishes the statistic element
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
