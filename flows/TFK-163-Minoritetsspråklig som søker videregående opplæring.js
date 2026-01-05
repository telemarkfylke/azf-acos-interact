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
  // Synkroniser elevmappe
  syncElevmappe: {
    enabled: true,
    options: {
      mapper: (flowStatus) => { // for å opprette person manuelt uten oppslag i Freg (Eks. utenlandske elever)
        if (flowStatus.parseJson.result.DialogueInstance.Opplysninger.Om_soker.Har_du_norsk_f\u00F8 === 'Nei') {
          let gender
          if (flowStatus.parseJson.result.DialogueInstance.Opplysninger.Om_soker.Kjonn === 'Mann') {
            gender = 'm'
          } else if (flowStatus.parseJson.result.DialogueInstance.Opplysninger.Om_soker.Kjonn === 'Kvinne') {
            gender = 'f'
          } else {
            throw new Error('Kjønn må være enten Mann eller Kvinne')
          }
          const payload = {
            fakeSsn: true,
            manualData: true,
            birthdate: flowStatus.parseJson.result.DialogueInstance.Opplysninger.Om_soker.Fodselsdato,
            gender,
            firstName: flowStatus.parseJson.result.DialogueInstance.Opplysninger.Om_soker.Fornavn,
            lastName: flowStatus.parseJson.result.DialogueInstance.Opplysninger.Om_soker.Etternavn,
            streetAddress: flowStatus.parseJson.result.DialogueInstance.Opplysninger.Om_soker.Adresse || 'Ukjent adresse',
            zipCode: flowStatus.parseJson.result.DialogueInstance.Opplysninger.Om_soker.Postnr_sted_postnr || '9999',
            zipPlace: flowStatus.parseJson.result.DialogueInstance.Opplysninger.Om_soker.Poststed || 'Ukjent poststed',
            forceUpdate: true // optional - forces update of privatePerson instead of quick return if it exists
          }
          return payload
        } else if (flowStatus.parseJson.result.DialogueInstance.Opplysninger.Om_soker.Har_du_norsk_f\u00F8 === 'Ja') {
          return {
            ssn: flowStatus.parseJson.result.DialogueInstance.Opplysninger.Om_soker.Norsk_fodselsnummer
          }
        } else throw new Error('norskFnr må være Ja eller Nei')
      }
    }
  },
  // Arkiverer dokumentet i elevmappa
  archive: { // archive må kjøres for å kunne kjøre signOff (noe annet gir ikke mening)
    enabled: true,
    options: {
      mapper: (flowStatus, base64, attachments) => {
        const p360Attachments = attachments.map(att => {
          return {
            Base64Data: att.base64,
            Format: att.format,
            Status: 'F',
            Title: 'Minoritetsspråklig som søker videregående opplæring',
            VersionFormat: att.versionFormat
          }
        })
        return {
          service: 'DocumentService',
          method: 'CreateDocument',
          parameter: {
            AccessCode: '13',
            AccessGroup: 'Elev inntak', // Tilgangsgruppe for elevinntak
            Category: 'Dokument inn',
            Contacts: [{
              ReferenceNumber: flowStatus.syncElevmappe.result.privatePerson.ssn,
              Role: 'Avsender',
              IsUnofficial: true
            }
            ],
            DocumentDate: new Date().toISOString(),
            Files: [
              {
                Base64Data: base64,
                Category: '1',
                Format: 'pdf',
                Status: 'F',
                Title: 'Minoritetsspråklig som søker videregående opplæring',
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200471' : '200250', // Inntak
            Status: 'J',
            Title: 'Minoritetsspråklig som søker videregående opplæring',
            UnofficialTitle: `Minoritetsspråklig som søker videregående opplæring - ${flowStatus.syncElevmappe.result.privatePerson.name}`,
            Archive: 'Sensitivt elevdokument',
            CaseNumber: flowStatus.syncElevmappe.result.elevmappe.CaseNumber
          }
        }
      }
    }
  },
  signOff: {
    enabled: false // Automastisk avskriving
  },

  closeCase: {
    enabled: false
  },

  statistics: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        return {
          company: 'Telemark fylkeskommune',
          department: 'Inntak',
          description: 'Men minoritetsspråklig som søker videregående opplæring',
          type: 'Minoritetsspråklig som søker videregående opplæring' // Required. A short searchable type-name that distinguishes the statistic element
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
