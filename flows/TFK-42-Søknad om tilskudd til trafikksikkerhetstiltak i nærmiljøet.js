const description = 'TFK-42-Søknad om tilskudd til trafikksikkerhetstiltak i nærmiljøet'
const { nodeEnv } = require('../config')

module.exports = {
  config: {
    enabled: true,
    doNotRemoveBlobs: false
  },
  parseJson: {
    enabled: true,
    options: {
      mapper: (dialogueData) => {
        return {
        }
      }
    }
  },
  syncPrivatePerson: {
    enabled: true,
    options: {
      mapper: (flowStatus) => { // for å opprette person basert på fødselsnummer
        // Mapping av verdier fra XML-avleveringsfil fra Acos.
        return {
          ssn: flowStatus.parseJson.result.DialogueInstance.Kontaktopplysninger.Informasjon_om_innsender.Fodselsnummer
        }
      }
    }
  },
  syncEnterprise: {
    enabled: true,
    options: {
      condition: (flowStatus) => { // use this if you only need to archive some of the forms.
        return flowStatus.parseJson.result.DialogueInstance.Kontaktopplysninger.Informasjon_om_organisas.Eventuelt_organisasjonsn !== ''
      },
      mapper: (flowStatus) => { // for å opprette organisasjon basert på orgnummer
        // Mapping av verdier fra XML-avleveringsfil fra Acos.
        return {
          orgnr: flowStatus.parseJson.result.DialogueInstance.Kontaktopplysninger.Informasjon_om_organisas.Eventuelt_organisasjonsn.replaceAll(' ', '')
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
            Project: nodeEnv === 'production' ? '26-142' : '26-3',
            Title: `Tilskudd til trafikksikkerhetstiltak i nærmiljøet - ${flowStatus.syncPrivatePerson.result.privatePerson.name}`,
            // UnofficialTitle: ,
            Status: 'B',
            AccessCode: 'U',
            JournalUnit: 'Sentralarkiv',
            SubArchive: 'Sakarkiv',
            ArchiveCodes: [
              {
                ArchiveCode: '243',
                ArchiveType: 'FELLESKLASSE PRINSIPP',
                Sort: 1
              },
              {
                ArchiveCode: 'Q80',
                ArchiveType: 'FAGKLASSE PRINSIPP',
                Sort: 2
              }
            ],
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200018' : '200023', // Seksjon Vegforvaltning og transport
            ResponsiblePersonEmail: nodeEnv === 'production' ? 'anncarin.risinggaard@telemarkfylke.no' : 'tom.jarle.christiansen@telemarkfylke.no',
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
        const caseNumber = flowStatus.handleCase.result.CaseNumber
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
                ReferenceNumber: flowStatus.syncEnterprise?.result?.enterprise?.EnterpriseNumber || flowStatus.syncPrivatePerson.result.privatePerson.ssn,
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
                Title: `Søknad om tilskudd til trafikksikkerhetstiltak i nærmiljøet - ${flowStatus.syncPrivatePerson.result.privatePerson.name}`,
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Status: 'J',
            DocumentDate: new Date().toISOString(),
            Title: `Søknad om tilskudd til trafikksikkerhetstiltak i nærmiljøet - ${flowStatus.syncPrivatePerson.result.privatePerson.name}`,
            Archive: 'Saksdokument',
            CaseNumber: caseNumber,
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200018' : '200023', // Seksjon Vegforvaltning og transport
            ResponsiblePersonEmail: nodeEnv === 'production' ? 'anncarin.risinggaard@telemarkfylke.no' : 'tom.jarle.christiansen@telemarkfylke.no',
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
        const jsonData = flowStatus.parseJson.result.DialogueInstance
        const sokernavn = flowStatus.syncEnterprise?.result?.enterprise?.name || flowStatus.syncPrivatePerson.result.privatePerson.name
        const sokerBeskrivelse = flowStatus.parseJson.result.DialogueInstance.Beskrivelse_og_gjennomfo.Beskrivelse_og_gjennomfo2
        const sokerdata = flowStatus.parseJson.result.DialogueInstance.Finansiering
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMF-Samferdselsektorteam/Lists/soknaderTilskuddTrafikksikkerhetstiltak/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMF-Samferdselsektorteam/Lists/soknaderTilskuddTrafikksikkerhetstiltak/AllItems',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: flowStatus.parseJson.result.Metadata.ReferenceId.Value,
              Navn: sokernavn,
              Epost: jsonData.Kontaktopplysninger.Informasjon_om_innsender.E_post,
              Soknadstype: jsonData.Kontaktopplysninger.S\u00F8keren.Jeg_soker,
              Tiltak: sokerdata.Sokekriterier_og_finansi.Hva_slags_tiltak_soker_d,
              Totalkostnad: sokerdata.Sokekriterier_og_finansi.Hva_er_totalkostnaden_.toString(),
              Soknadsbelop: sokerdata.Sokekriterier_og_finansi.Hvor_mye_soker_du_om_.toString(),
              Egenfinansiering: sokerdata.Sokekriterier_og_finansi.Hvordan_skal_du_dekke_eg.toString(),
              Beskrivelse: sokerBeskrivelse.Beskriv_dagens_trafikksi,
              Forslag: sokerBeskrivelse.Beskriv_plan_for_gjennom,
              AndreOpplysninger: sokerBeskrivelse.Har_du_har_andre_relevan,
              OrgNavn: jsonData.Kontaktopplysninger.Informasjon_om_organisas.Navn_pa_organisasjon,
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
