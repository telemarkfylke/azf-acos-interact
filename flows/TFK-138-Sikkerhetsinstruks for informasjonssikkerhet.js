const description = 'Sikkerhetsinstruks for informasjonssikkerhet'
const { isPolitician } = require('../lib/jobs/customJobs/sikkerhetsinstruks')
let vanligAnsatt

module.exports = {
  config: {
    enabled: true,
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
  // CustomJob - Sjekker om ssn er politiker
  customJobIsPolitician: {
    enabled: true,
    runAfter: 'parseJson',
    options: {},
    customJob: async (jobDef, flowStatus) => {
      const result = await isPolitician(flowStatus)
      console.log('Is politician:', result)
      if (result === true) {
        vanligAnsatt = false // Skrur av syncEmployee og handleCase
      } else {
        vanligAnsatt = true
      }
      console.log('Vanlig ansatt:', vanligAnsatt)
      return result
    }
  },
  // Logikk - Sikkerhetsinstruks for informasjonssikkerhet
  // Hvis politiker/folkevalgt - Arkiver i samlesak 25/12930
  // Hvis Lærer/ansatt på skole - Arkiver i personalmappa med skole som ansvarlig virksomhet til fordeling
  // Andre ansatte - Arkiver i personalmappa

  // 1. Sync employee og sjekk om person er ansatt eller folkevalgt. Hvis folkevalgt arkiver i samlesak 22/12930
  // 2. Hvis ansatt på skole - Arkiver i personalmappa med skole som ansvarlig virksomhet til fordeling
  // 3. Hvis andre ansatte - Arkiver i personalmappa

  // Synkroniser ansatt
  syncEmployee: {
    enabled: true, // Enable true hvis ikke politiker
    options: {
      mapper: (flowStatus) => { // for å opprette person basert på fødselsnummer
        const personData = flowStatus.parseJson.result.DialogueInstance.Informasjon_om_.Privatperson
        return {
          ssn: personData.Fødselsnummer1 // Fnr ansatt som er logget inn
        }
      }
    }
  },
  handleCase: {
    enabled: true, // customJobIsPolitician.result === true ? false : true, // Skrus av når det er politiker
    options: {
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
    enabled: true,
    options: {
      mapper: (flowStatus, base64, attachments) => {
        const personData = flowStatus.parseJson.result.DialogueInstance.Informasjon_om_.Privatperson
        // const caseNumber = flowStatus.handleCase.result.CaseNumber
        const caseNumber = '25/00127' // customElements.result === true? '25/12930' : handleCase.result.CaseNumber // Felles samlesak for sikkerhetsinstruks for informasjonssikkerhet KUN hvis innsender er politiker. Ellers personalmappe/handleCase
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
            AccessGroup: 'Team politisk støtte', // Byttes ut for andre ansatte
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
            ResponsibleEnterpriseRecno: '200039', // Team politisk støtte for politikere
            // ResponsiblePersonEmail: flowStatus.syncEmployee.result.archiveManager.email,
            Status: 'J',
            Title: 'Sikkerhetsinstruks for informasjonssikkerhet',
            Archive: 'Saksdokument', // 'Personal', for alle andre ansatte
            CaseNumber: caseNumber
          }
        }
      }
    }
  },
  signOff: {
    enabled: false // Har med avskriving å gjøre
  },

  closeCase: { // handleCase må kjøres for å kunne kjøre closeCase
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
