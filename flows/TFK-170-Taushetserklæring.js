const description = 'Taushetserklæring'
// const { schoolInfo } = require('../lib/data-sources/tfk-schools')

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
        return {
          ssn: flowStatus.parseJson.result.SavedValues.Login.UserID
        }
      }
    }
  },
  handleCase: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        const personData = flowStatus.syncPrivatePerson.result
        const arbeidssted = flowStatus.parseJson.result.DialogueInstance.Steg_1___Inform.Velg_Arbeidsste
        const seksjon = arbeidssted.Velg_
        const utdanningSektor = arbeidssted.Velg_hvilken_de
        const skoleOrgnummer = flowStatus.parseJson.result.SavedValues?.Dataset.Velg_skole1.OrgNr
        let virksomhetRecno = null

        if (seksjon === 'Utdanning, folkehelse, tannhelse' && utdanningSektor === 'Videreg\u00E5ende skole') { console.log('VGS') } else if (seksjon === 'Utdanning, folkehelse, tannhelse' && utdanningSektor === 'Administrasjon') { virksomhetRecno = '2000015' } else if (seksjon === 'Utdanning, folkehelse, tannhelse' && utdanningSektor === 'Tannhelse') { virksomhetRecno = '200022' } else if (seksjon === 'Fylkesdirektør') { virksomhetRecno = '200006' } else if (seksjon === 'Samferdsel') { virksomhetRecno = '200016' } else if (seksjon === 'Organisasjon og digitale tjenester') { virksomhetRecno = '200009' } else if (seksjon === 'Økonomi og virksomhetsstyring') { virksomhetRecno = '200009' } else if (seksjon === 'Samfunnsutvikling') { virksomhetRecno = '2000017' } else {
          console.log('Ingen virksomhet funnet')
        }
        return {
          service: 'CaseService',
          method: 'CreateCase',
          parameter: {
            // ProjectNumber: prosjekt.ProjectNumber,
            CaseType: 'Sak',
            Title: 'Taushetserklæring',
            UnofficialTitle: `Taushetserklæring - ${personData.privatePerson.name}`,
            Status: 'B',
            AccessCode: '26',
            Paragraph: 'Offl. § 26 femte ledd',
            JournalUnit: 'Sentralarkiv',
            SubArchive: 'Sakarkiv',
            ArchiveCodes: [
              {
                ArchiveCode: '043',
                ArchiveType: 'FELLESKLASSE PRINSIPP',
                Sort: 2
              },
              {
                ArchiveCode: personData.privatePerson.ssn,
                ArchiveType: 'FNR',
                Sort: 1,
                IsManualText: true
              }
            ],
            Contacts: [
              {
                Role: 'Sakspart',
                ReferenceNumber: personData.privatePerson.ssn,
                IsUnofficial: true
              }
            ],
            ResponsibleEnterpriseNumber: skoleOrgnummer || '',
            ResponsibleEnterpriseRecno: virksomhetRecno || '',
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
        const personData = flowStatus.syncPrivatePerson.result
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
            AccessCode: '26',
            Category: 'Dokument inn',
            Contacts: [
              {
                ReferenceNumber: personData.privatePerson.ssn,
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
                Status: 'B',
                Title: 'Taushetserklæring',
                UnofficialTitle: `Taushetserklæring - ${personData.privatePerson.name}`,
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: 'Offl. § 26 femte ledd',
            ResponsibleEnterpriseRecno: flowStatus.syncEmployee.result.responsibleEnterprise.recno,
            Status: 'J',
            Title: 'Taushetserklæring',
            Archive: 'Saksdokument',
            CaseNumber: caseNumber
          }
        }
      }
    }
  },
  signOff: {
    enabled: false // Den henter dokumentnummer fra denne jobben og avskriver dokumentet med koden TO (Tatt til orientering).
  },

  closeCase: { // Den henter saksnummer fra denne jobben og lukker saken.
    enabled: false
  },

  statistics: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        // Mapping av verdier fra JSON-avleveringsfil fra dialogueportal
        return {
          company: 'Telemark Fylkeskommune',
          description,
          type: 'Taushetserklæring - Signert' // Required. A short searchable type-name that distinguishes the statistic element
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
