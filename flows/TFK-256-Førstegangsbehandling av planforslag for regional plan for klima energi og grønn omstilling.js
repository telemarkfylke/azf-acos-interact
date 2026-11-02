const description = 'Førstegangsbehandling av planforslag for regional plan for klima, energi og grønn omstilling'
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
        return {}
      }
    }
  },

  syncPrivatePerson: {
    enabled: true,
    options: {
      mapper: (flowStatus) => { // for å opprette person basert på fødselsnummer
        return {
          ssn: flowStatus.parseJson.result.SavedValues.Login.UserID
        }
      }
    }
  },

  syncEnterprise: {
    enabled: true,
    options: {
      condition: (flowStatus) => { // Kun når innsender svarer på vegne av en organisasjon
        return flowStatus.parseJson.result.DialogueInstance.Informasjon_om_.Svarer_som.Jeg_sender_inn === 'Organisasjon'
      },
      mapper: (flowStatus) => { // for å opprette organisasjon basert på orgnummer
        return {
          orgnr: flowStatus.parseJson.result.DialogueInstance.Informasjon_om_.Organisasjon.Organisasjon1.Organisasjonsnummer.replaceAll(' ', '')
        }
      }
    }
  },

  // Arkiverer dokumentet i samlesak i 360
  archive: {
    enabled: true,
    options: {
      mapper: (flowStatus, base64, attachments) => {
        const enterpriseNumber = flowStatus.syncEnterprise?.result?.enterprise?.EnterpriseNumber
        const title = 'Uttalelse til førstegangsbehandling av planforslag for regional plan for klima, energi og grønn omstilling'
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
                ReferenceNumber: enterpriseNumber || flowStatus.syncPrivatePerson.result.privatePerson.ssn, // Orgnr hvis organisasjon, ellers fnr
                Role: 'Avsender',
                IsUnofficial: !enterpriseNumber
              }
            ],
            DocumentDate: new Date().toISOString(),
            Files: [
              {
                Base64Data: base64,
                Category: '1',
                Format: 'pdf',
                Status: 'F',
                Title: title,
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: '',
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200024' : '200029',
            ResponsiblePersonRecno: nodeEnv === 'production' ? '200252' : undefined,
            Status: 'J',
            Title: title,
            Archive: 'Saksdokument',
            CaseNumber: nodeEnv === 'production' ? '25/03814' : '26/00190'
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

  statistics: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        return {
          company: 'Samfunnsutvikling',
          department: 'Seksjon Samfunn og plan',
          description,
          type: 'Førstegangsbehandling - Regional plan for klima, energi og grønn omstilling', // Required. A short searchable type-name that distinguishes the statistic element
          documentNumber: flowStatus.archive?.result?.DocumentNumber // Optional. anything you like
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
