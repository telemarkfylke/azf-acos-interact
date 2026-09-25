const description = 'TFK-210 - Skolemiljømelding oppll. § 12-5'
const caseTitle = '§12-5 - Skolemiljø'
const documentTitle = '§12-5 - Skolemiljømelding'
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
  if (!school?.primaryLocation) throw new Error(`TFK-210: Could not resolve school from Dataset.Skole.OrgNr: ${orgNr}`)
  return school
}

/**
 * Hver skole har egne 12-5-prosjekter per skoleår. Prosjekttitlene i arkivet bruker bokmålsnavnet (primaryLocation),
 * f.eks. "Bø videregående skole" - ikke officeLocation, som er nynorsk for Bø og Vest-Telemark
 * @param {object} flowStatus
 */
const getProjectTitle = (flowStatus) => `§12-5 saker - ${getSchoolYear()} - ${getSchool(flowStatus).primaryLocation}`

/**
 * Henter eleven meldingen gjelder (navn og fødselsnummer)
 * @param {object} flowStatus
 */
const getStudent = (flowStatus) => {
  const student = flowStatus.parseJson.result.DialogueInstance.Opplysninger?.Hvilken_elev
  const ssn = String(student?.Fødselsnummer || '').trim()
  if (!ssn) throw new Error('TFK-210: Missing fødselsnummer for eleven meldingen gjelder')
  return {
    ssn,
    name: student.Navn
  }
}

/**
 * Avsender er innlogget bruker (den som melder). NB: Informasjon_om_den1 er den det meldes om, og skal aldri brukes som avsender
 * @param {object} flowStatus
 */
const getSender = (flowStatus) => {
  const login = flowStatus.parseJson.result.SavedValues.Login
  return `${login.FirstName} ${login.LastName}`
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

  // Finner skolens 12-5-prosjekt for inneværende skoleår, eller oppretter det hvis det ikke finnes
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
            CaseType: '12-5-sak',
            Title: caseTitle,
            UnofficialTitle: `§12-5 - ${studentName}`,
            Status: 'B',
            AccessCode: '13',
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            JournalUnit: 'Sentralarkiv',
            SubArchive: 'Elev',
            Project: flowStatus.handleProject.result.ProjectNumber,
            // Fellesklasse skal ikke brukes for 12-5-saker
            ArchiveCodes: [
              {
                ArchiveCode: student.ssn,
                ArchiveType: 'FNR',
                IsManualText: true,
                Sort: 1
              },
              {
                ArchiveCode: 'B08 - Skolemiljø',
                ArchiveType: 'FAGKLASSE PRINSIPP',
                IsManualText: true,
                Sort: 2
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
            Archive: '12-5 Dokument', // Samme skrivemåte som '12-4 Dokument' i TFK-101 - regnearket sier '12-5-dokument', men den finnes ikke i arkivet
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
          type: 'Skolemiljømelding oppll. § 12-5',
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
