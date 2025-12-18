const description = 'Utviklingssamtale for ledere'

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
  syncEmployee: {
    enabled: true,
    options: {
      mapper: (flowStatus) => { // for å opprette person basert på fødselsnummer
        const personData = flowStatus.parseJson.result.SavedValues.Integration.UPN_til_SSN.SSN.extension_09851fd03a344926989f13ca3b4da692_employeeNumber
        return {
          ssn: personData // SSN ansatt som er logget inn
        }
      }
    }
  },
  handleProject: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        return {
          service: 'ProjectService',
          method: 'CreateProject',
          parameter: {
            Title: `Personaldokumentasjon - ${flowStatus.syncEmployee.result.privatePerson.name}`,
            // ResponsiblePersonEmail: flowStatus.parseJsonsyncEmployee.result.email,
            Contacts: [
              {
                Role: 'Kontakt',
                ReferenceNumber: flowStatus.syncEmployee.result.privatePerson.ssn
              }
            ]
          }
        }
      },
      getProjectParameter: (flowStatus) => {
        return {
          Title: `Personaldokumentasjon - ${flowStatus.syncEmployee.result.privatePerson.name}` // check for exisiting project with this title
        }
      }
    }
  },
  handleCase: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        // const personData = flowStatus.parseJson.result.DialogueInstance.Informasjon_om_.Privatperson
        const prosjekt = flowStatus.handleProject.result
        if (!prosjekt.ProjectNumber) {
          throw new Error('Mangler: ProjectNumber')
        }
        return {
          service: 'CaseService',
          method: 'CreateCase',
          parameter: {
            ProjectNumber: prosjekt.ProjectNumber,
            CaseType: 'Personal',
            Title: 'Utviklingssamtale',
            UnofficialTitle: `Utviklingssamtale - ${flowStatus.syncEmployee.result.privatePerson.name}`,
            Status: 'B',
            AccessCode: '13',
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            JournalUnit: 'Sentralarkiv',
            SubArchive: 'Personal',
            ArchiveCodes: [
              {
                ArchiveCode: '431',
                ArchiveType: 'FELLESKLASSE PRINSIPP',
                Sort: 2
              },
              {
                ArchiveCode: flowStatus.syncEmployee.result.privatePerson.ssn,
                ArchiveType: 'FNR',
                Sort: 1,
                IsManualText: true
              }
            ],
            Contacts: [
              {
                Role: 'Sakspart',
                ReferenceNumber: flowStatus.syncEmployee.result.privatePerson.ssn,
                IsUnofficial: true
              }
            ],
            ResponsibleEnterpriseRecno: flowStatus.syncEmployee.result.responsibleEnterprise.recno,
            // ResponsiblePersonEmail: flowStatus.syncEmployee.result.archiveManager.email,
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
        const personData = flowStatus.syncEmployee.result.privatePerson
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
            AccessCode: '13',
            // AccessGroup: flowStatus.customJobIsPolitician.result === true ? 'Team politisk støtte' : '',
            Category: 'Dokument inn',
            Contacts: [
              {
                ReferenceNumber: personData.ssn,
                Role: 'Avsender',
                IsUnofficial: true
              }
              /*,
              {
                ReferenceNumber: `recno: ${flowStatus.syncEmployee.result.archiveManager.recno}`,
                Role: 'Mottaker'
              }
              */
            ],
            DocumentDate: new Date().toISOString(),
            Files: [
              {
                Base64Data: base64,
                Category: '1',
                Format: 'pdf',
                Status: 'B',
                Title: 'Utviklingssamtale',
                UnofficialTitle: `Utviklingssamtale - ${personData.name}`,
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            ResponsibleEnterpriseRecno: flowStatus.syncEmployee.result.responsibleEnterprise.recno,
            Status: 'J',
            Title: 'Utviklingssamtale',
            Archive: 'Personaldokument',
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
    enabled: false,
    options: {
      mapper: (flowStatus) => {
        // Mapping av verdier fra JSON-avleveringsfil fra dialogueportal
        return {
          company: 'Telemark Fylkeskommune',
          description,
          type: 'Sikkerhetsinstruks for informasjonssikkerhet - Signert' // Required. A short searchable type-name that distinguishes the statistic element
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
