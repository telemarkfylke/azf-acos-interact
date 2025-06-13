const description = 'Arkivering av søknad til Trafikksikkerhetsordningen og opprettelse av et listeelement i SP. En sak pr. kommune'
const { nodeEnv } = require('../config')

/*
    Soknad {
        string Kontaktperson
        string Kommune
        string Mobilnummer
        string Epost
        string Prosjekttype
        string Prosjektnavn
        string Innspill_utvikling
        string Vegnr
        string HPMeter
        string Arsdogntrafikk
        string Fartsgrense
        string Gjennomforingstidspunkt
        string Prosjektbegrunnelse
        string Problembeskrivelse
        string ForeslattLosning
        string Trafikksikkerhetstiltak
        string ForventetEffekt
        string TotalKostnadEksMva
        string FerdigByggeplan
        string KommentarByggeplan
        string ForventetDatoFerdigByggeplan
        string GodkjentTSPlan
        string TSPlanGyldig
        string KommentarTSPlan
        string ForventetDatoForVedtak
        string BeskrevetITiltakslista
        string KommentarTiltaksliste
        string HenvisningTilKapTSplan
        string GodkjentReguleringsplan
        string KommentarReguleringsplan
        string LinkTilGodkjentRegPlan
        string DatoGodkjentReguleringsplan
        string PeriodeTSPlan
        string ForventetProsjektstart
        string ForventetFerdigstillelse
        string PrioriteringBarnOgUnge
        string PrioriteringUU
        string PrioriteringHjertesone
        string Fnr
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
      mapper: (flowStatus) => { // for å opprette person basert på fødselsnummer
        // Mapping av verdier fra XML-avleveringsfil fra Acos.
        return {
          ssn: flowStatus.parseXml.result.Soknad.Fnr
        }
      }
    }
  },

  handleCase: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        const xmlData = flowStatus.parseXml.result.Soknad
        return {
          service: 'CaseService',
          method: 'CreateCase',
          parameter: {
            CaseType: 'Sak',
            Project: nodeEnv === 'production' ? '25-470' : '24-2',
            Title: `Søknad om midler til Aksjon skolevei - ${xmlData.Prosjektnavn}`,
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
                ArchiveCode: 'Q80',
                ArchiveType: 'FAGKLASSE PRINSIPP',
                Sort: 2
              }
            ],
            Contacts: [
              {
                Role: 'Sakspart',
                ReferenceNumber: xmlData.Fnr,
                IsUnofficial: false
              }
            ],
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200018' : '200023', // Seksjon Vegforvaltning og transport'
            AccessGroup: '' // Automatisk
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
                ReferenceNumber: xmlData.Fnr,
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
                Title: `Søknad om midler til Aksjon skolevei - ${xmlData.Prosjektnavn}`,
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Status: 'J',
            DocumentDate: new Date().toISOString(),
            Title: `Søknad om midler til Aksjon skolevei - ${xmlData.Prosjektnavn}`,
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
        const Kontaktperson = flowStatus.syncPrivatePerson.result.privatePerson.name
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMF-Samferdselsektorteam/Lists/Aksjon%20skolevei/AllItems',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMF-Samferdselsektorteam/Lists/Aksjon%20skolevei/AllItems',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: Kontaktperson,
              Kommune: xmlData.Kommune || 'Ikke sendt inn',
              Prosjekttype: xmlData.Prosjekttype || 'Ikke sendt inn',
              Prosjektnavn: xmlData.Prosjektnavn || 'Ikke sendt inn',
              Vegnr_x002e_: xmlData.Vegnr || 'Ikke sendt inn',
              _x00c5_DT: xmlData.Arsdogntrafikk || 'Ikke sendt inn',
              Fartsgrense: xmlData.Fartsgrense || 'Ikke sendt inn',
              Prosjektbegrunnelse: xmlData.Prosjektbegrunnelse || 'Ikke sendt inn',
              Prosjektbeskrivelse: xmlData.Problembeskrivelse || 'Ikke sendt inn',
              Trafikksikkerhetstiltak: xmlData.Trafikksikkerhetstiltak || 'Ikke sendt inn',
              Forventeteffekt: xmlData.ForventetEffekt || 'Ikke sendt inn',
              Totalkostnadekskl_x002e_mva: xmlData.TotalKostnadEksMva || 'Ikke sendt inn',
              TS_x002d_plangyldig: xmlData.TSPlanGyldig || 'Ikke sendt inn',
              Beskrevetitiltakslista: xmlData.BeskrevetITiltakslista || 'Ikke sendt inn',
              Godkjentreguleringsplan: xmlData.GodkjentReguleringsplan || 'Ikke sendt inn',
              Ferdigbyggeplan: xmlData.FerdigByggeplan || 'Ikke sendt inn',
              Forventetprosjektstart: xmlData.ForventetProsjektstart || 'Ikke sendt inn'
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
          company: 'Vegforvaltning og transport',
          department: '',
          description, // Required. A description of what the statistic element represents
          type: 'Tilskudd til aksjon skolevei', // Required. A short searchable type-name that distinguishes the statistic element
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
