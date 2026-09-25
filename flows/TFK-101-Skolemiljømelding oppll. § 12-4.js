const description = 'TFK-101 - Skolemiljømelding oppll. § 12-4'
const caseTitle = '12-4 skolemiljø'
const documentTitle = '12-4 skolemiljømelding'
const nodeEnv = require('../config').nodeEnv
const { getSchoolYear } = require('../lib/flow-helpers')
const { schoolInfo } = require('../lib/data-sources/tfk-schools')

/**
 * Finner skolen meldingen gjelder, basert på orgnr fra datasettet i skjemaet
 * @param {object} flowStatus
 */
const getSchool = (flowStatus) => {
  const orgNr = flowStatus.parseJson.result.SavedValues?.Dataset?.Skole?.OrgNr
  const school = schoolInfo.find(school => school.orgNr === Number(orgNr))
  if (!school?.primaryLocation) throw new Error(`TFK-101: Could not resolve school from Dataset.Skole.OrgNr: ${orgNr}`)
  return school
}

/**
 * Hver skole har egne 12-4-prosjekter per skoleår. Prosjekttitlene i arkivet bruker bokmålsnavnet (primaryLocation),
 * f.eks. "Bø videregående skole" - ikke officeLocation, som er nynorsk for Bø og Vest-Telemark
 * @param {object} flowStatus
 */
const getProjectTitle = (flowStatus) => `§12-4 saker - ${getSchoolYear()} - ${getSchool(flowStatus).primaryLocation}`

/**
 * Henter eleven meldingen gjelder (navn og fødselsnummer)
 * @param {object} flowStatus
 */
const getStudent = (flowStatus) => {
  const student = flowStatus.parseJson.result.DialogueInstance.Informasjon2.Hvilken_elev_gjelder_mel
  const ssn = String(student?.Fodselsnummer || '').trim()
  if (!ssn) throw new Error('TFK-101: Missing fødselsnummer for eleven meldingen gjelder')
  return {
    ssn,
    name: student.Navn3
  }
}

/**
 * Finner avsender (melder) av skjemaet.
 * Er skjemaet fylt ut på vegne av noen andre (Er_skjemaet_fylt_ut_av_d = Nei), er det
 * personen i Navn_pa_den_som_melder som er melder - innsender beholdes for sporbarhet
 * @param {object} flowStatus
 */
const getSender = (flowStatus) => {
  const dialogueInstance = flowStatus.parseJson.result.DialogueInstance
  const submitter = dialogueInstance.Informasjon2.Gruppe
  const submitterName = String(submitter?.Navn4 || '').trim()
  const submitterEmail = String(submitter?.Epost || '').trim()
  const filledOutBySubmitter = String(dialogueInstance.Om_saken?.Hvem_fyller_ut_skjema__?.Er_skjemaet_fylt_ut_av_d || '').trim().toLowerCase()
  const reporterName = String(dialogueInstance.Om_saken?.Hvem_fyller_ut_skjema__?.Navn_pa_den_som_melder || '').trim()

  if (filledOutBySubmitter === 'nei' && reporterName) {
    return `${reporterName} (innsendt av ${submitterName} - ${submitterEmail})`
  }
  return `${submitterName} (${submitterEmail})`
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

  // Oppretter/oppdaterer eleven meldingen gjelder i arkivet - brukes som sakspart
  syncPrivatePerson: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        return {
          ssn: getStudent(flowStatus).ssn
        }
      }
    }
  },

  // Finner skolens 12-4-prosjekt for inneværende skoleår, eller oppretter det hvis det ikke finnes
  handleProject: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        const school = getSchool(flowStatus)
        return {
          service: 'ProjectService',
          method: 'CreateProject',
          parameter: {
            Title: getProjectTitle(flowStatus),
            Contacts: [
              {
                ReferenceNumber: school.orgNr,
                Role: 'Ansvarlig'
              }
            ]
          }
        }
      },
      getProjectParameter: (flowStatus) => {
        return {
          // Må være identisk med tittelen i mapper over, ellers opprettes det nytt prosjekt for hver innsending
          Title: getProjectTitle(flowStatus),
          ContactReferenceNumber: getSchool(flowStatus).orgNr,
          StatusCode: 'Under utføring'
        }
      }
    }
  },

  // Ny sak per innsendt skjema
  handleCase: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        const school = getSchool(flowStatus)
        const student = getStudent(flowStatus)
        const studentName = flowStatus.syncPrivatePerson.result.privatePerson?.name || student.name
        return {
          service: 'CaseService',
          method: 'CreateCase',
          parameter: {
            CaseType: '12-4-sak',
            Title: caseTitle,
            UnofficialTitle: `12-4 - ${studentName}`,
            Status: 'B',
            AccessCode: '13',
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            JournalUnit: 'Sentralarkiv',
            SubArchive: 'Elev',
            Project: flowStatus.handleProject.result.ProjectNumber,
            ArchiveCodes: [
              {
                ArchiveCode: student.ssn,
                ArchiveType: 'FNR',
                IsManualText: true,
                Sort: 1
              },
              {
                ArchiveCode: '---',
                ArchiveType: 'FELLESKLASSE PRINSIPP',
                Sort: 2
              },
              {
                ArchiveCode: 'B08 - skolemiljø',
                ArchiveType: 'FAGKLASSE PRINSIPP',
                IsManualText: true,
                Sort: 3
              }
            ],
            Contacts: [
              {
                Role: 'Sakspart',
                ReferenceNumber: student.ssn,
                IsUnofficial: true
              }
            ],
            ResponsibleEnterpriseNumber: school.orgNr.toString()
            // AccessGroup settes automatisk av sakstypen
          }
        }
      }
    }
  },

  // Arkiverer dokumentet i 360 (kun i begrenset modus, derfor secure: true)
  archive: {
    enabled: true,
    options: {
      mapper: (flowStatus, base64, attachments) => {
        const school = getSchool(flowStatus)
        const student = getStudent(flowStatus)
        const studentName = flowStatus.syncPrivatePerson.result.privatePerson?.name || student.name
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
          secure: true,
          parameter: {
            AccessCode: '13',
            Category: 'Dokument inn',
            UnregisteredContacts: [
              {
                ContactName: getSender(flowStatus),
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
                Title: documentTitle,
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            ResponsibleEnterpriseNumber: school.orgNr.toString(),
            Status: 'J',
            Title: documentTitle,
            UnofficialTitle: `${documentTitle} - ${studentName}`,
            Archive: '12-4 Dokument',
            CaseNumber: flowStatus.handleCase.result.CaseNumber
            // AccessGroup settes automatisk av dokumenttypen
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
          type: 'Skolemiljømelding oppll. § 12-4',
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
