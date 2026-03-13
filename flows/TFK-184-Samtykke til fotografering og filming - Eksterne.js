const { nodeEnv } = require('../config')

const description = 'Samtykke til fotografering og filming - Eksterne'

const formatDate = (iso) => {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} kl.${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`
}

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
        const caseNumber = nodeEnv === 'production' ? '26/000593' : '26/00002'
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
            AccessGroup: 'Alle',
            Category: 'Dokument inn',
            Contacts: [
              {
                ReferenceNumber: flowStatus.parseJson.result.SavedValues.Login.UserID,
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
                Title: `Samtykke til fotografering og filming - ${flowStatus.parseJson.result.SavedValues.Login.FirstName} ${flowStatus.parseJson.result.SavedValues.Login.LastName}`,
                UnofficialTitle: '',
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: 'Offl. § 26 femte ledd',
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200058' : '200040',
            Status: 'J',
            Title: `Samtykke til fotografering og filming - ${flowStatus.parseJson.result.SavedValues.Login.FirstName} ${flowStatus.parseJson.result.SavedValues.Login.LastName}`,
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
  sharepointList: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        const personData = flowStatus.parseJson.result.SavedValues.Login
        const skjemaData = flowStatus.parseJson.result.DialogueInstance
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/Kommunikasjonsgruppa/Lists/SamtykkerFotoFilm/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/Kommunikasjonsgruppa/Lists/SamtykkerFotoFilm/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: flowStatus.parseJson.result.Metadata.ReferenceId.Value,
              Dato: formatDate(flowStatus.parseJson.result.Metadata.Submitted),
              Navn: personData.FirstName + ' ' + personData.LastName,
              Rolle: 'Ekstern',
              Samtykke: skjemaData.Samtykke.Samtykke.Kryss_av,
              SamtykkeEkstern: skjemaData.Samtykke.Samtykke.Kryss_av1
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
        // Mapping av verdier fra JSON-avleveringsfil fra dialogueportal
        return {
          company: 'Telemark Fylkeskommune',
          description,
          type: 'Samtykke til fotografering og filming - Eksterne' // Required. A short searchable type-name that distinguishes the statistic element
        }
      }
    }
  },
  failOnPurpose: {
    enabled: false
  }
}
