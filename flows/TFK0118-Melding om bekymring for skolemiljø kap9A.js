const description = 'Arkivering av melding om bekymring for skolemiljø kap. 9a4'
// const { nodeEnv } = require('../config')
const { getSchoolYear } = require('../lib/flow-helpers')
const { schoolInfo } = require('../lib/data-sources/tfk-schools')
module.exports = {
  config: {
    enabled: true,
    doNotRemoveBlobs: false
  },
  parseXml: {
    enabled: true
  },

  /* XML from Acos:
ArchiveData {
string Fnr
string Fornavn
string Etternavn
string Adresse
string Postnr
string Poststed
string Mobilnr
string Epost
string SkoleOrgNr
}

  */

  // Arkivert som 9a-4 elvens navn
  syncPrivatePerson: {
    enabled: true,
    options: {
      mapper: (flowStatus) => { // for å opprette person basert på fødselsnummer
        // Mapping av verdier fra XML-avleveringsfil fra Acos.
        return {
          ssn: flowStatus.parseXml.result.ArchiveData.Fnr
        }
      }
    }
  },

  handleProject: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        const school = schoolInfo.find(school => flowStatus.parseXml.result.ArchiveData.skjemaInnsenderSkole.startsWith(school.officeLocation))
        if (!school) throw new Error(`Could not find any school with officeLocation: ${flowStatus.parseXml.result.ArchiveData.skjemaInnsenderSkole}`)
        return {
          service: 'ProjectService',
          method: 'CreateProject',
          parameter: {
            Title: `§12-4 saker - ${getSchoolYear()}-${school.officeLocation}`,
            Contacts: [
              {
                ReferenceNumber: school.orgNr,
                Role: 'Ansvarlig'
              }
            ]
            // AccessGroup: 'Alle'
          }
        }
      },
      getProjectParameter: (flowStatus) => {
        const school = schoolInfo.find(school => flowStatus.parseXml.result.ArchiveData.skjemaInnsenderSkole.startsWith(school.officeLocation))
        if (!school) throw new Error(`Could not find any school with officeLocation: ${flowStatus.parseXml.result.ArchiveData.skjemaInnsenderSkole}`)
        console.log(school.officeLocation)
        return {
          // §12-4 saker - 2024/2025 - %
          Title: `§12-4 saker - ${getSchoolYear()}-${school.officeLocation}`, // check for exisiting project with this title, '%' er wildcard når vi søker i 360 eller sif api.
          ContactReferenceNumber: school.orgNr,
          StatusCode: 'Under utføring'
        }
      }
    }
  },

  handleCase: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        const xmlData = flowStatus.parseXml.result.ArchiveData
        // const school = schoolInfo.find(school => xmlData.skjemaInnsenderSkole.startsWith(school.officeLocation))
        // if (!school) throw new Error(`Could not find any school with officeLocation: ${xmlData.skjemaInnsenderSkole}`)
        return {
          service: 'CaseService',
          method: 'CreateCase',
          parameter: {
            CaseType: '12-4-Sak',
            Title: `§12-4-sak - ${xmlData.Fornavn} ${xmlData.Etternavn}`,
            UnofficialTitle: 'Elevsak',
            Status: 'B',
            AccessCode: '13',
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            // AccessGroup: school['9a4Tilgangsgruppe'], // 9a-4 tilgangsgruppe til den skolen det gjelder
            JournalUnit: 'Sentralarkiv',
            SubArchive: 'Elev',
            Project: flowStatus.handleProject.result.ProjectNumber,
            ArchiveCodes: [
              {
                ArchiveCode: xmlData.Fnr,
                ArchiveType: 'FNR',
                IsManualText: true,
                Sort: 1
              },
              {
                ArchiveCode: 'B31 - Elever',
                ArchiveType: 'FAGKLASSE PRINSIPP',
                Sort: 2,
                IsManualText: true
              }
            ],
            Contacts: [
              {
                Role: 'Sakspart',
                ReferenceNumber: xmlData.Fnr,
                IsUnofficial: true
              }
            ],
            ResponsibleEnterpriseNumber: xmlData.SkoleOrgNr
          }
        }
      }
    }
  },
  // Arkiverer dokumentet i 360
  archive: { // archive må kjøres for å kunne kjøre signOff (noe annet gir ikke mening)
    enabled: true,
    options: {
      mapper: (flowStatus, base64, attachments) => {
        const xmlData = flowStatus.parseXml.result.ArchiveData
        // const school = schoolInfo.find(school => flowStatus.parseXml.result.ArchiveData.skjemaInnsenderSkole.startsWith(school.officeLocation))
        // if (!school) throw new Error(`Could not find any school with officeLocation: ${flowStatus.parseXml.result.ArchiveData.skjemaInnsenderSkole}`)
        return {
          service: 'DocumentService',
          method: 'CreateDocument',
          secure: true,
          parameter: {
            Category: 'Dokument inn',
            UnregisteredContacts: [
              {
                ContactName: `${xmlData.Fornavn} ${xmlData.Etternavn} (${xmlData.Epost})`,
                Role: 'Avsender',
                IsUnofficial: true
              }
            ],
            Files: [
              {
                Base64Data: base64,
                Category: '1',
                Format: 'pdf',
                Status: 'F',
                Title: '12-4 sak',
                VersionFormat: 'A'
              }
            ],
            Status: 'J',
            DocumentDate: new Date().toISOString(),
            Title: '12-4 sak',
            UnofficialTitle: 'Elevsak',
            Archive: '12-4 Dokument',
            CaseNumber: flowStatus.handleCase.result.CaseNumber,
            ResponsibleEnterpriseNumber: xmlData.SkoleOrgNr,
            AccessCode: '13',
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1'
            // AccessGroup: school['9a4Tilgangsgruppe'] // Trenger ikke denne, står "Automatisk i excel?"
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
        // const xmlData = flowStatus.parseXml.result.ArchiveData
        const schoolName = schoolInfo.find(schoolName => Number(flowStatus.parseXml.result.ArchiveData.SkoleOrgNr) === schoolName.orgNr)
        if (!schoolName) throw new Error(`Could not find any school with officeLocation: ${flowStatus.parseXml.result.ArchiveData.skjemaInnsenderSkole}`)
        // Mapping av verdier fra XML-avleveringsfil fra Acos. Alle properties under må fylles ut og ha verdier
        return {
          company: 'OF',
          department: 'Pedagogisk støtte og utvikling',
          description,
          type: 'Melding om bekymring for skolemiljø §9a-4', // Required. A short searchable type-name that distinguishes the statistic element
          // optional fields:
          skole: schoolName.officeLocation
        }
      }
    }
  },
  failOnPurpose: {
    enabled: false
  }
}
