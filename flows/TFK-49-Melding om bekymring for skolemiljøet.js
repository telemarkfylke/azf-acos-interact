const description = 'TFK-49 - Skole - Melding om bekymring for skolemiljøet'
const title = 'Melding om bekymring for skolemiljøet'
const nodeEnv = require('../config').nodeEnv
const { schoolInfo } = require('../lib/data-sources/tfk-schools')

/**
 * Finner skolen eleven har valgt i skjemaet, basert på orgnr fra datasettet (visningsnavnet i skjemaet, f.eks. "Bamble vgs", brukes ikke)
 * @param {object} flowStatus
 */
const getSchool = (flowStatus) => {
  const orgNr = flowStatus.parseJson.result.SavedValues?.Dataset?.Hvilke_skole_2?.OrgNr
  const school = schoolInfo.find(school => school.orgNr === Number(orgNr))
  if (!school) throw new Error(`TFK-49: Could not resolve school from Dataset.Hvilke_skole_2.OrgNr: ${orgNr}`)
  return school
}

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

  // Synkroniser elevmappe - eleven melder selv, så det er innlogget bruker som er eleven
  syncElevmappe: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        const ssn = String(flowStatus.parseJson.result.SavedValues.Login.UserID || '').trim()
        if (!ssn) throw new Error('TFK-49: Missing fødselsnummer for innlogget elev (SavedValues.Login.UserID)')
        return { ssn }
      }
    }
  },

  // Arkiverer dokumentet i elevmappa
  archive: {
    enabled: true,
    options: {
      mapper: (flowStatus, base64, attachments) => {
        const school = getSchool(flowStatus)
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
            Category: 'Dokument inn',
            Contacts: [
              {
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
        const school = getSchool(flowStatus)
        return {
          company: 'Telemark fylkeskommune',
          department: 'Pedagogisk støtte og utvikling',
          description,
          type: 'Melding om bekymring for skolemiljøet',
          // optional fields:
          skole: school.primaryLocation,
          documentNumber: flowStatus.archive?.result?.DocumentNumber
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
