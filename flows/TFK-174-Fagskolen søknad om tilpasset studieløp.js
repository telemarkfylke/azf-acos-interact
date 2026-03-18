const description = 'Fagskolen søknadsskjema tilpasset studieløp'
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
        const archiveTitle = `Søknad om tilpasset studieløp - ${flowStatus.parseJson.result.SavedValues.Login.FirstName} ${flowStatus.parseJson.result.SavedValues.Login.LastName}`
        const publicTitle = 'Søknad om tilpasset studieløp'
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
        const personData = flowStatus.parseJson.result.SavedValues
        const skjemaData = flowStatus.parseJson.result.DialogueInstance.S\u00F8knad_om_tilpa
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/FAGS-Studieadministrasjon/Lists/Tilpasset%20studielp/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/FAGS-Studieadministrasjon/Lists/Tilpasset%20studielp/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: personData.Login.UserID.slice(0, 6),
              fornavn: personData.Login.FirstName,
              etternavn: personData.Login.LastName,
              adresse: personData.Login.Address,
              postnummer: personData.Login.PostalCode,
              poststed: personData.Login.PostalArea,
              mobilnummer: personData.Login.Telephone,
              epost: personData.Login.Email,
              studium: skjemaData.Informasjon_om_.Hvilket_studium,
              klasse: skjemaData.Informasjon_om_.Klasse,
              begrunnelse: skjemaData.\u00C5rsak.Begrunnelse_for,
              dokumentasjon: skjemaData.\u00C5rsak.\u00D8nsker_du_\u00E5_las,
              _x0061_ar1: skjemaData.Tilpasset_studi.\u00C5r_1_,
              _x0061_ar2: skjemaData.Tilpasset_studi.\u00C5r_2_,
              _x0061_ar3: skjemaData.Tilpasset_studi.\u00C5r_3_,
              _x0061_ar4: skjemaData.Tilpasset_studi.\u00C5r_4_,
              kommentar: skjemaData.Tilpasset_studi.Kommentar
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
