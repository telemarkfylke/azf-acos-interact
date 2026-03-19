const description = 'Fagskolen Industrifagskolen Ekomteknikker - Søknadsskjema'
const { nodeEnv } = require('../config')

module.exports = {
  config: {
    enabled: true,
    doNotRemoveBlobs: nodeEnv !== 'production' // For testing purposes, we want to keep the blobs in non-prod environments
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
      mapper: (flowStatus) => {
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
        const archiveTitle = `Søknad kurs - Industrifagskolen Ekomteknikker - ${flowStatus.parseJson.result.SavedValues.Login.FirstName} ${flowStatus.parseJson.result.SavedValues.Login.LastName}`
        const publicTitle = 'Søknad kurs - Industrifagskolen Ekomteknikker'
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
        const skjemaData = flowStatus.parseJson.result.DialogueInstance
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/FAGS-avdelingkursogetterutdanning/Lists/Ekomtekniker%20Industrifagskolen/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/FAGS-avdelingkursogetterutdanning/Lists/Ekomtekniker%20Industrifagskolen/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: flowStatus.parseJson.result.Metadata.ReferenceId.Value,
              fnr: personData.UserID,
              fornavn: personData.FirstName,
              etternavn: personData.LastName,
              adresse: personData.Address,
              postnummer: personData.PostalCode,
              poststed: personData.PostalArea,
              mobilnummer: personData.Telephone,
              epostadresse: personData.Email,
              utdanning: skjemaData.Informasjon_om_.Utdanning.Hvilken_utdanni,
              grunnlag: skjemaData.Informasjon_om_.Utdanning.P\u00E5_hvilket_grun,
              samtykkeInfo: skjemaData.Samtykke.Samtykke.Jeg_\u00F8nsker_\u00E5_mo,
              studiekontrakt: skjemaData.Samtykke.Studiekontrakte.Bekreft
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
