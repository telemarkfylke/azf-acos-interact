const description = 'Fagskolen Søknadsskjmema for ITB i bygg og anlegg for entreprenører'
const { nodeEnv } = require('../config')

const getFakturaAdresse = function (dialogData, loginData) {
  if (dialogData.Hvem_skal_betal.Velg === 'Arbeidsgiver') {
    const data = dialogData.Hvem_skal_betal.Organisasjon
    return `${data.Organisasjon_gatenavn_og__nu}, ${data.Organisasjon_postnr} ${data.Organisasjon_poststed}`
  } else {
    if (loginData.IDPorten?.Folkeregister) {
      const data = loginData.IDPorten?.Folkeregister
      return `${data.Gatenavn} ${data.Gatenummer}, ${data.Postnummer} ${data.Poststed}`
    } else {
      return `${loginData.Address}, ${loginData.PostalCode} ${loginData.PostalArea}`
    }
  }
}

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
        const archiveTitle = `Søknad kurs - ITB i bygg og anlegg for entrepenører - ${flowStatus.parseJson.result.SavedValues.Login.FirstName} ${flowStatus.parseJson.result.SavedValues.Login.LastName}`
        const publicTitle = 'Søknad kurs - ITB i bygg og anlegg for entrepenører'
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
        const dialogData = flowStatus.parseJson.result.DialogueInstance.P\u00E5melding_til_k
        const samtykkeData = flowStatus.parseJson.result.DialogueInstance.Samtykke
        const loginValues = flowStatus.parseJson.result.SavedValues.Login
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/FAGS-avdelingkursogetterutdanning/Lists/ITB%20i%20bygg%20og%20anlegg/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/FAGS-avdelingkursogetterutdanning/Lists/ITB%20i%20bygg%20og%20anlegg/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: dialogData.Gruppe.Fornavn + ' ' + dialogData.Gruppe.Etternavn,
              fnr: dialogData.Gruppe.Fodselsnummer,
              fornavn: dialogData.Gruppe.Fornavn,
              etternavn: dialogData.Gruppe.Etternavn,
              adresse: dialogData.Gruppe.Adresse,
              postnummer: dialogData.Gruppe.Postnummer_sted_postnr,
              poststed: dialogData.Gruppe.Postnummer_sted_poststed,
              mobilnummer: dialogData.Gruppe.Mobilnummer,
              epostadresse: dialogData.Gruppe.E_postadresse,
              sokertype: dialogData.Hvem_skal_betal.Velg,
              orgnr: dialogData.Hvem_skal_betal.Organisasjon.Organisasjon_orgnr,
              orgnavn: dialogData.Hvem_skal_betal.Organisasjon.Organisasjon_orgnavn,
              orgadresse: dialogData.Hvem_skal_betal.Organisasjon.Organisasjon_gatenavn_og__nu,
              orgpostnr: dialogData.Hvem_skal_betal.Organisasjon.Organisasjon_postnr,
              orgpoststed: dialogData.Hvem_skal_betal.Organisasjon.Organisasjon_poststed,
              fakturadresse: getFakturaAdresse(dialogData, loginValues),
              utdanningsnivaa: dialogData.Utdanning_og_praksis.Utdanningsniva,
              naastilling: dialogData.Utdanning_og_praksis.Navarende_stilling,
              sistearbeidssted: dialogData.Utdanning_og_praksis.Siste_arbeidssted,
              fartstid: dialogData.Utdanning_og_praksis.Fartstid__antall_ar_,
              samtykkeInfo: samtykkeData.Samtykke2.Jeg_onsker_a_motta_infor,
              studiekontrakt: samtykkeData.Studiekontrakte.Bekreft,
              fakturareferanse: dialogData.Faktura_ref.Refferanse_p\u00E5_f

              // Disse feltene ligger ikke i nye json fila, så vet ikke hvor jeg skal få dette ifra.
              /*
                oppstartmnd: xmlData.oppstartmnd,
                kontaktperson: xmlData.ekstra3,
                fylke: xmlData.ekstra4
              */
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
          company: 'Fagskolen Vestfold og Telemark',
          department: '',
          description, // Required. A description of what the statistic element represents
          type: 'Søknad Fagskolen' // Required. A short searchable type-name that distinguishes the statistic element
          // optional fields:
          // documentNumber: flowStatus.archive.result.DocumentNumber // Optional. anything you like
        }
      }
    }
  },
  failOnPurpose: {
    enabled: false
  }
}
