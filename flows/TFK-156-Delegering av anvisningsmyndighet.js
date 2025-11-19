const description = 'Delegering av anvisningsmyndighet'
const nodeEnv = require('../config').nodeEnv

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
  archive: {
    enabled: true,
    options: {
      mapper: (flowStatus, base64, attachments) => {
        const personData = flowStatus.parseJson.result.SavedValues.Login
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
            Category: 'Dokument inn',
            Contacts: [
              {
                ReferenceNumber: personData.UserID,
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
                Title: 'Delegering av anvisningsmyndighet',
                UnofficialTitle: `Delegering av anvisningsmyndighet - ${personData.FirstName} ${personData.LastName}`,
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            // Paragraph: 'Offl. § 26 femte ledd',
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200012' : '200010', // Sektor for økonomi og virksomhetsstyring
            // ResponsibleEnterpriseNumber: skoleOrgnummer || '',
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
