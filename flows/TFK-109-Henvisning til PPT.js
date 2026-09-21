const description = 'TFK-109 - Henvisning til PPT'
const title = 'Henvisning til PPT'
const nodeEnv = require('../config').nodeEnv
const { schoolInfo } = require('../lib/data-sources/tfk-schools')

module.exports = {
  config: {
    enabled: true,
    doNotRemoveBlobs: nodeEnv !== 'production'
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

  // Ground Control må tilpasses parseJson og avklares med mottakersystemet før aktivering.
  // Dagens jobb krever parseXml og websak_hode-filen fra den gamle avleveringen.
  // groundControl: {
  //   enabled: true
  // },

  // Synkroniser elevmappe
  syncElevmappe: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        const personalia = flowStatus.parseJson.result.DialogueInstance.Informasjon_om_elev_kand.Personalia
        const numberType = String(personalia.Velg_nummertype_for_id || '').toLowerCase().replace(/[-\s]/g, '')
        let ssn
        if (numberType === 'personnummer') {
          ssn = personalia.Personnummer
        } else if (numberType === 'dnummer') {
          ssn = personalia.D_nummer
        } else {
          throw new Error('TFK-109: Unknown student identification number type')
        }
        if (typeof ssn !== 'string' || !ssn.trim()) throw new Error('TFK-109: Missing selected student identification number')
        return { ssn: ssn.trim() }
      }
    }
  },

  // Arkiverer dokumentet i elevmappa
  archive: {
    enabled: true,
    options: {
      mapper: (flowStatus, base64, attachments) => {
        const schoolOrgNr = flowStatus.parseJson.result.SavedValues?.Dataset?.Skole5?.OrgNr
        const school = schoolInfo.find(school => school.orgNr === Number(schoolOrgNr))
        if (!school) throw new Error('TFK-109: Could not resolve school from Skole5.OrgNr')
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
            AccessGroup: school.tilgangsgruppe,
            Category: 'Dokument ut',
            Contacts: [
              {
                ReferenceNumber: school.orgNr.toString(),
                Role: 'Avsender',
                IsUnofficial: true
              },
              {
                ReferenceNumber: '918124136', // PP-tjenesten: recno 211331 i prod, 200571 i test
                Role: 'Mottaker',
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
                Title: title,
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            ResponsibleEnterpriseNumber: school.orgNr.toString(),
            Status: 'J',
            Title: title,
            UnofficialTitle: `${title} - ${flowStatus.syncElevmappe.result.privatePerson.name}`,
            Archive: 'Sensitivt elevdokument',
            CaseNumber: flowStatus.syncElevmappe.result.elevmappe.CaseNumber
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
          company: 'Opplæring',
          department: 'PP-tjenesten',
          description,
          type: 'Henvisning til PPT',
          documentNumber: flowStatus.archive?.result?.DocumentNumber
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
