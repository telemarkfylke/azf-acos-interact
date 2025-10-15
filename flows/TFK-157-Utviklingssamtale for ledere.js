const description = 'Utviklingssamtale for ledere'

module.exports = {
  config: {
    enabled: false,
    doNotRemoveBlobs: true
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
    enabled: true, // Kjør kun syncEmployee hvis IKKE politiker
    options: {
      mapper: (flowStatus) => { // for å opprette person basert på fødselsnummer
        const personData = flowStatus.parseJson.result.SavedValues.Login
        return {
          upn: personData.UserID // UPN ansatt som er logget inn
        }
      }
    }
  },
  handleCase: {
    enabled: false,
    options: {
      condition: (flowStatus) => !flowStatus.customJobIsPolitician.result,
      getCaseParameter: (flowStatus) => {
        const personData = flowStatus.parseJson.result.DialogueInstance.Informasjon_om_.Privatperson
        if (!personData?.Fødselsnummer1) {
          throw new Error('Mangler: Fødselsnummer1')
        }
        return {
          Title: 'Samtykke for sikkerhetsinstruks for informasjonssikkerhet', // check for existing case with this title
          ArchiveCode: personData.Fødselsnummer1
        }
      },
      mapper: (flowStatus) => {
        const personData = flowStatus.parseJson.result.DialogueInstance.Informasjon_om_.Privatperson
        if (!personData?.Fødselsnummer1 || !personData?.Fornavn1 || !personData?.Etternavn1) {
          throw new Error('Mangler: Fødselsnummer1, Fornavn1, eller Etternavn1')
        }
        return {
          service: 'CaseService',
          method: 'CreateCase',
          parameter: {
            CaseType: 'Personal',
            Title: 'Samtykke for sikkerhetsinstruks for informasjonssikkerhet',
            UnofficialTitle: `Samtykke for sikkerhetsinstruks for informasjonssikkerhet - ${personData.Fornavn1} ${personData.Etternavn1}`,
            Status: 'B',
            AccessCode: '13',
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            JournalUnit: 'Sentralarkiv',
            SubArchive: 'Personal',
            ArchiveCodes: [
              {
                ArchiveCode: '400',
                ArchiveType: 'FELLESKLASSE PRINSIPP',
                Sort: 2
              },
              {
                ArchiveCode: personData.Fødselsnummer1,
                ArchiveType: 'FNR',
                Sort: 1,
                IsManualText: true
              }
            ],
            Contacts: [
              {
                Role: 'Sakspart',
                ReferenceNumber: personData.Fødselsnummer1,
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
    enabled: false,
    options: {
      mapper: (flowStatus, base64, attachments) => {
        const personData = flowStatus.parseJson.result.DialogueInstance.Informasjon_om_.Privatperson
        // const caseNumber = flowStatus.handleCase.result.CaseNumber
        const caseNumber = flowStatus.customJobIsPolitician.result === true ? '25/12930' : flowStatus.handleCase.result.CaseNumber // '25/00127' // customElements.result === true? '25/12930' : handleCase.result.CaseNumber // Felles samlesak for sikkerhetsinstruks for informasjonssikkerhet KUN hvis innsender er politiker. Ellers personalmappe/handleCase
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
            AccessGroup: flowStatus.customJobIsPolitician.result === true ? 'Team politisk støtte' : '',
            Category: 'Dokument inn',
            Contacts: [
              {
                ReferenceNumber: personData.Fødselsnummer1,
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
                Title: 'Signert sikkerhetsinstruks for informasjonssikkerhet',
                UnofficialTitle: `Signert sikkerhetsinstruks for informasjonssikkerhet - ${personData.Fornavn1} ${personData.Etternavn1}`,
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            ResponsibleEnterpriseRecno: flowStatus.customJobIsPolitician.result === true ? '200066' : flowStatus.syncEmployee.result.responsibleEnterprise.recno, // Team politisk støtte for politikere: recno 200039
            // ResponsiblePersonEmail: flowStatus.syncEmployee.result.archiveManager.email,
            Status: 'J',
            Title: 'Sikkerhetsinstruks for informasjonssikkerhet',
            Archive: flowStatus.customJobIsPolitician.result === true ? 'Saksdokument' : 'Personaldokument',
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
