const description = 'Delegering av anvisningsmyndighet'
const nodeEnv = require('../config').nodeEnv

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
        const personSSN = flowStatus.parseJson.result.SavedValues.Integration.UPN_til_SSN.SSN.extension_09851fd03a344926989f13ca3b4da692_employeeNumber
        return {
          ssn: personSSN // Fnr ansatt som er logget inn
        }
      }
    }
  },
  archive: {
    enabled: true,
    options: {
      mapper: (flowStatus, base64, attachments) => {
        const personData = flowStatus.parseJson.result.SavedValues.Login
        const personDelegere = flowStatus.parseJson.result.DialogueInstance.Telemark_fylkes.Delegere_myndig
        const personSSN = flowStatus.parseJson.result.SavedValues.Integration.UPN_til_SSN.SSN.extension_09851fd03a344926989f13ca3b4da692_employeeNumber
        const caseNumber = nodeEnv === 'production' ? '25/20533' : '25/00230'
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
            AccessCode: 'U',
            Category: 'Internt notat med oppfølging',
            Contacts: [
              {
                ReferenceNumber: personSSN,
                Role: 'Avsender',
                IsUnofficial: false
              }
            ],
            DocumentDate: new Date().toISOString(),
            Files: [
              {
                Base64Data: base64,
                Category: '1',
                Format: 'pdf',
                Status: 'B',
                Title: `Delegering av anvisningsmyndighet - ${personDelegere.Fornavn___mello} ${personDelegere.Etternavn}`,
                UnofficialTitle: `Delegering av anvisningsmyndighet - ${personDelegere.Fornavn___mello} ${personDelegere.Etternavn}`,
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            // Paragraph: 'Offl. § 26 femte ledd',
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200012' : '200010', // Sektor for økonomi og virksomhetsstyring
            ResponsiblePersonEmail: personData.Email, // Trine
            Status: 'J',
            Title: 'Delegering av anvisningsmyndighet',
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
          type: 'Delegering av anvisningsmyndighet' // Required. A short searchable type-name that distinguishes the statistic element
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
