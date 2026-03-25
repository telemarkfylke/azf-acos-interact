const description = 'Fagskolen søknadsskjema Energirådgiver elektro'
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
  // Synkroniser Student
  syncPrivatePerson: {
    enabled: true,
    options: {
      mapper: (flowStatus) => { // for å opprette person basert på fødselsnummer
        // Mapping av verdier fra XML-avleveringsfil fra Acos.
        return {
          ssn: flowStatus.parseJson.result.SavedValues.Login.UserID // FNR fra skjema
        }
      }
    }
  },

  handleCase: {
    enabled: true,
    options: {
      getCaseParameter: (flowStatus) => {
        return {
          Title: 'Studentmappe', // check for exisiting case with this title
          ArchiveCode: flowStatus.parseJson.result.SavedValues.Login.UserID
        }
      },
      mapper: (flowStatus) => {
        return {
          service: 'CaseService',
          method: 'CreateCase',
          parameter: {
            CaseType: 'Elev',
            // Project: '20-15',
            Title: 'Studentmappe',
            UnofficialTitle: `Studentmappe - ${flowStatus.parseJson.result.SavedValues.Login.FirstName} ${flowStatus.parseJson.result.SavedValues.Login.LastName}`,
            Status: 'B',
            AccessCode: '13',
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            JournalUnit: 'Fagskolen Vestfold og Telemark',
            SubArchive: 'Student',
            ArchiveCodes: [
              {
                ArchiveCode: flowStatus.parseJson.result.SavedValues.Login.UserID,
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
                ReferenceNumber: flowStatus.parseJson.result.SavedValues.Login.UserID,
                IsUnofficial: true
              }
            ],
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '216024' : '200314',
            // ResponsiblePersonEmail: flowStatus.syncPrivatePerson.result.
            AccessGroup: 'Studentmapper' // Automatisk
          }
        }
      }
    }
  },

  // Arkiverer dokumentet i 360
  archive: { // archive må kjøres for å kunne kjøre signOff (noe annet gir ikke mening)
    enabled: true,
    options: {
      mapper: (flowStatus, base64, attachments) => {
        const archiveTitle = `Søknad kurs - Energirådgiver elektro - ${flowStatus.parseJson.result.SavedValues.Login.FirstName} ${flowStatus.parseJson.result.SavedValues.Login.LastName}`
        const publicTitle = 'Søknad kurs - Energirådgiver elektro'
        const caseNumber = nodeEnv === 'production' ? flowStatus.handleCase.result.CaseNumber : flowStatus.handleCase.result.CaseNumber
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
                ReferenceNumber: flowStatus.parseJson.result.SavedValues.Login.UserID,
                Role: 'Avsender',
                IsUnofficial: true
              }
            ],
            Files: [
              {
                Base64Data: base64,
                Category: '1',
                Format: 'pdf',
                Status: 'F',
                Title: archiveTitle,
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Status: 'J',
            DocumentDate: new Date().toISOString(),
            UnofficialTitle: archiveTitle,
            Title: publicTitle,
            Archive: 'Elevdokument',
            CaseNumber: caseNumber,
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '216024' : '200314',
            AccessCode: '13',
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            AccessGroup: 'Studentmapper'
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
        const personData = flowStatus.parseJson.result.SavedValues.Login
        const skjemaData = flowStatus.parseJson.result.DialogueInstance.Pamelding_til_kurs
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/FAGS-avdelingkursogetterutdanning/Lists/Energiraadgiver/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/FAGS-avdelingkursogetterutdanning/Lists/Energiraadgiver/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: personData.FirstName + ' ' + personData.LastName,
              soknadsreferanse: flowStatus.parseJson.result.Metadata.ReferenceId.Value,
              fdato: personData.UserID,
              fornavn: personData.FirstName,
              etternavn: personData.LastName,
              adresse: personData.Address,
              postnummer: personData.PostalCode,
              poststed: personData.PostalArea,
              mobilnummer: personData.Telephone,
              epostadresse: personData.Email,
              sokerPaaVegneAvFirma: skjemaData.Hvem_skal_betal.Velg,
              orgnr: skjemaData.Hvem_skal_betal.Organisasjon.Organisasjon_orgnr,
              orgnavn: skjemaData.Hvem_skal_betal.Organisasjon.Organisasjon_orgnavn,
              adresseFirma: skjemaData.Hvem_skal_betal.Organisasjon.Organisasjon_gatenavn_og__nu,
              postnummerFirma: skjemaData.Hvem_skal_betal.Organisasjon.Organisasjon_postnr,
              poststedFirma: skjemaData.Hvem_skal_betal.Organisasjon.Organisasjon_poststed,
              utdanningSoker: skjemaData.Utdanning_og_praksis.Utdanningsniva,
              stillingSoker: skjemaData.Utdanning_og_praksis.Navarende_stilling,
              sisteArbeidsstedSoker: skjemaData.Utdanning_og_praksis.sisteArbeidssted,
              fartstidSoker: skjemaData.Utdanning_og_praksis.Fartstid__antall_ar_,
              samtykkeInfo: flowStatus.parseJson.result.DialogueInstance.Samtykke.Samtykke2.Jeg_onsker_a_motta_infor,
              fakturareferanse: skjemaData.Faktura_ref.Refferanse_p\u00E5_f,
              lestKontrakt: flowStatus.parseJson.result.DialogueInstance.Samtykke.Studiekontakten.Bekreft
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
        return {
          company: 'Fagskolen Vestfold og Telemark',
          department: '',
          description, // Required. A description of what the statistic element represents
          type: 'Søknad Fagskolen', // Required. A short searchable type-name that distinguishes the statistic element
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
