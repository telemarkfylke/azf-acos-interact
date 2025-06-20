const description = 'Sikkerhetsinstruks for informasjonssikkerhet'

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

  // Synkroniser ansatt
  syncEmployee: {
    enabled: true,
    options: {
      mapper: (flowStatus) => { // for å opprette person basert på fødselsnummer
        const personData = flowStatus.parseJson.result.DialogueInstance.Informasjon_om_.Privatperson
        return {
          ssn: personData.Fødselsnummer1 // Fnr til den som er logget inn
        }
      }
    }
  },
  // handleCase: {
  //   enabled: true,
  //   options: {
  //     getCaseParameter: (flowStatus) => {
  //       const personData = flowStatus.parseJson.result.DialogueInstance.Informasjon_om_.Privatperson
  //       if (!personData?.Fødselsnummer1) {
  //         throw new Error('Mangler: Fødselsnummer1')
  //       }
  //       return {
  //         Title: 'Samtykke for sikkerhetsinstruks for informasjonssikkerhet', // check for existing case with this title
  //         ArchiveCode: personData.Fødselsnummer1
  //       }
  //     },
  //     mapper: (flowStatus) => {
  //       const personData = flowStatus.parseJson.result.DialogueInstance.Informasjon_om_.Privatperson
  //       if (!personData?.Fødselsnummer1 || !personData?.Fornavn1 || !personData?.Etternavn1) {
  //         throw new Error('Mangler: Fødselsnummer1, Fornavn1, eller Etternavn1')
  //       }
  //       return {
  //         service: 'CaseService',
  //         method: 'CreateCase',
  //         parameter: {
  //           CaseType: 'Personal',
  //           Title: 'Samtykke for sikkerhetsinstruks for informasjonssikkerhet',
  //           UnofficialTitle: `Samtykke for sikkerhetsinstruks for informasjonssikkerhet - ${personData.Fornavn1} ${personData.Etternavn1}`,
  //           Status: 'B',
  //           AccessCode: '13',
  //           Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
  //           JournalUnit: 'Sentralarkiv',
  //           SubArchive: 'Personal',
  //           ArchiveCodes: [
  //             {
  //               ArchiveCode: '400',
  //               ArchiveType: 'FELLESKLASSE PRINSIPP',
  //               Sort: 2
  //             },
  //             {
  //               ArchiveCode: personData.Fødselsnummer1,
  //               ArchiveType: 'FNR',
  //               Sort: 1,
  //               IsManualText: true
  //             }
  //           ],
  //           Contacts: [
  //             {
  //               Role: 'Sakspart',
  //               ReferenceNumber: personData.Fødselsnummer1,
  //               IsUnofficial: true
  //             }
  //           ],
  //           ResponsibleEnterpriseRecno: '200011', // flowStatus.syncEmployee.result.responsibleEnterprise.recno,
  //           // ResponsiblePersonEmail: flowStatus.syncEmployee.result.archiveManager.email,
  //           AccessGroup: '' // Automatisk
  //         }
  //       }
  //     }
  //   }
  // },
  archive: {
    enabled: true,
    options: {
      mapper: (flowStatus, base64, attachments) => {
        const personData = flowStatus.parseJson.result.DialogueInstance.Informasjon_om_.Privatperson
        // const caseNumber = flowStatus.handleCase.result.CaseNumber
        const caseNumber = '25/12930' // Felles samlesak for sikkerhetsinstruks for informasjonssikkerhet
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
            // AccessGroup: '', Automatisk tilgangsgruppe
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
                Title: `Signert samtykke for sikkerhetsinstruks for informasjonssikkerhet - ${personData.Fornavn1} ${personData.Etternavn1}`,
                UnofficialTitle: `Signert samtykke for sikkerhetsinstruks for informasjonssikkerhet - ${personData.Fornavn1} ${personData.Etternavn1}`,
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            ResponsibleEnterpriseRecno: '200011', // flowStatus.syncEmployee.result.responsibleEnterprise.recno, Prod 200011 Test 200016
            // ResponsiblePersonEmail: flowStatus.syncEmployee.result.archiveManager.email,
            Status: 'J',
            Title: 'Sikkerhetsinstruks for informasjonssikkerhet',
            Archive: 'Saksdokument',
            CaseNumber: caseNumber
          }
        }
      }
    }
  },
  signOff: {
    enabled: false // Har med abskriving å gjøre
  },

  closeCase: { // handleCase må kjøres for å kunne kjøre closeCase
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
          type: 'Sikkerhetsinstruks for informasjonssikkerhet - Signert' // Required. A short searchable type-name that distinguishes the statistic element
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
