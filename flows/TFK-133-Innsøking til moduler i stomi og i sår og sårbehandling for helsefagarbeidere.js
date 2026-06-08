const description = 'Fagskolen - Innsøking til moduler i stomi og i sår og sårbehandling for helsefagarbeidere'
const { nodeEnv } = require('../config')

module.exports = {
  config: {
    enabled: true,
    doNotRemoveBlobs: nodeEnv !== 'production'
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
      mapper: (flowStatus) => {
        return {
          ssn: flowStatus.parseJson.result.SavedValues.Login.UserID
        }
      }
    }
  },

  handleCase: {
    enabled: true,
    options: {
      getCaseParameter: (flowStatus) => {
        return {
          Title: 'Studentmappe',
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
            AccessGroup: 'Studentmapper'
          }
        }
      }
    }
  },

  archive: {
    enabled: true,
    options: {
      mapper: (flowStatus, base64, attachments) => {
        const login = flowStatus.parseJson.result.SavedValues.Login
        const archiveTitle = `Søknad modulbaserte utdanning i modulene Sår, sårbehandling og Stomi for helsefagarbeidere - ${login.FirstName} ${login.LastName}`
        const publicTitle = 'Søknad modulbaserte utdanning i modulene Sår, sårbehandling og Stomi for helsefagarbeidere'
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
                ReferenceNumber: login.UserID,
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
        const info = flowStatus.parseJson.result.DialogueInstance.Informasjon_om_

        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/FAGS-Elektroniskeskjemaer/Lists/Innsking%20til%20modulbasert%20fagskolegrad%20i%20sr%20og%20stom/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/FAGS-Elektroniskeskjemaer/Lists/Innsking%20til%20modulbasert%20fagskolegrad%20i%20sr%20og%20stom/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: info.Opplysning_om_s.Fødselsnummer1,
              Fornavn: info.Opplysning_om_s.Fornavn1,
              Etternavn: info.Opplysning_om_s.Etternavn1,
              Gateadresse: info.Opplysning_om_s.Adresse1,
              Postnr: info.Opplysning_om_s.Postnummer1,
              Sted: info.Opplysning_om_s.Poststed1,
              Mobil: info.Opplysning_om_s.Telefon1,
              E_x002d_post: info.Opplysning_om_s.E_post,
              Utdanningsbakgrunn: info.Bakgrunn.Utdanningsbakgr,
              ModHostPri1: info.Kursønsker.Modulvalg___Høs,
              ModVinterPri1: info.Kursønsker.Modulvalg___Vin,
              ModVaarPri1: info.Kursønsker.Modulvalg_Vår
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
          description,
          type: 'Innsøking modulbasert fagskole'
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
