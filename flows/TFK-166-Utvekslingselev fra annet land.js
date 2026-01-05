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

  syncElevmappe: {
    enabled: true,
    options: {
      mapper: (flowStatus) => { // for å opprette person manuelt uten oppslag i Freg (Eks. utenlandske elever)
        // Mapping av verdier fra XML-avleveringsfil fra Acos.
        // const dateList = flowStatus.parseJson.result.DialogueInstance.Opplysninger.Om_eleven.Fodselsdato.split('-')
        // const newDate = `${dateList[2]}-${dateList[1]}-${dateList[0]}`
        let gender
        if (flowStatus.parseJson.result.DialogueInstance.Opplysninger.Om_eleven.Kjonn2 === 'Mann') {
          gender = 'm'
        } else if (flowStatus.parseJson.result.DialogueInstance.Opplysninger.Om_eleven.Kjonn2 === 'Kvinne') {
          gender = 'f'
        } else {
          throw new Error('Kjønn må være enten Mann eller Kvinne')
        }
        const payload = {
          fakeSsn: true,
          manualData: true,
          birthdate: flowStatus.parseJson.result.DialogueInstance.Opplysninger.Om_eleven.Fodselsdato,
          gender,
          firstName: flowStatus.parseJson.result.DialogueInstance.Opplysninger.Om_eleven.Fornavn,
          lastName: flowStatus.parseJson.result.DialogueInstance.Opplysninger.Om_eleven.Etternavn2,
          streetAddress: flowStatus.parseJson.result.DialogueInstance.Opplysninger.Om_eleven.Adresse_der_ele || 'Ukjent adresse',
          zipCode: flowStatus.parseJson.result.DialogueInstance.Opplysninger.Om_eleven.Postnr__sted_postnr || '9999',
          zipPlace: flowStatus.parseJson.result.DialogueInstance.Opplysninger.Om_eleven.Sted || 'Ukjent poststed',
          forceUpdate: true // optional - forces update of privatePerson instead of quick return if it exists
        }
        return payload
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
            Title: 'Utvekslingselev fra annet land',
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
                Title: 'Utvekslingselev fra annet land',
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200471' : '200250', // Inntak
            Status: 'J',
            Title: 'Utvekslingselev fra annet land',
            UnofficialTitle: `Utvekslingselev fra annet land - ${flowStatus.syncElevmappe.result.privatePerson.name}`,
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
          description: 'Utvekslingselev fra annet land arkivert i elevmappe',
          type: 'Utvekslingselev fra annet land' // Required. A short searchable type-name that distinguishes the statistic element
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
