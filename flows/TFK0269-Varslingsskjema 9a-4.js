const description = 'Arkivering av varsling ved brud på oppll. § 9 A-4. Skal opprettes en ny sak pr skjema'
// const { nodeEnv } = require('../config')
const { getSchoolYear } = require('../lib/flow-helpers')
const { schoolInfo } = require('../lib/data-sources/tfk-schools')
const { nodeEnv } = require('../config')
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
    string skjemaInnsenderNavn
    string skjemaInnsenderEpost
    string skjemaInnsenderSkole
    string datoForVarsling
    string krenketElevNavn
    string krenketElevFnr
    string krenketElevKlasse
    string ivolverte
    string informerte
    string epostRektor
    string epostAvdLeder
    string epostAvdLederSkjult
    string typeVold
    string typeTrakassering
    string typeMobbing
    string typeDiskriminering
    string typeDigiKrenkelser
    string typeAnnet
    string hendelseBeskrivelse
    string handlingBeskrivelse
    string tqmVarsling
    string fyltutAvVarsler
    string navnPaVarsler
  }

  */

  /**
   * Hva som brukes i denne flowen (det vi trenger fra skjemaet):
   * krenketElevNavn
   * krenketElevFnr
   * skjemaInnsenderEpost
   * skjemaInnsenderNavn
   * skjemaInnsenderSkole
   * */

  // Arkivert som 9a-4 elvens navn
  syncPrivatePerson: {
    enabled: true,
    options: {
      mapper: (flowStatus) => { // for å opprette person basert på fødselsnummer
        // Mapping av verdier fra XML-avleveringsfil fra Acos.
        return {
          ssn: flowStatus.parseXml.result.ArchiveData.krenketElevFnr
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
        const school = schoolInfo.find(school => xmlData.skjemaInnsenderSkole.startsWith(school.officeLocation))
        if (!school) throw new Error(`Could not find any school with officeLocation: ${xmlData.skjemaInnsenderSkole}`)
        return {
          service: 'CaseService',
          method: 'CreateCase',
          parameter: {
            CaseType: nodeEnv === 'production' ? '12-4-Sak' : '9A4-Sak', // 12-4-Sak
            Title: 'Elevsak',
            UnofficialTitle: `12-4-sak - ${xmlData.krenketElevNavn}`,
            Status: 'B',
            AccessCode: '13',
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            // AccessGroup: school['9a4Tilgangsgruppe'], // 9a-4 tilgangsgruppe til den skolen det gjelder
            JournalUnit: 'Sentralarkiv',
            SubArchive: '4',
            Project: flowStatus.handleProject.result.ProjectNumber,
            ArchiveCodes: [
            //   {
            //     ArchiveCode: '---',
            //     ArchiveType: '',
            //     Sort: 1
            //   },
              {
                ArchiveCode: xmlData.krenketElevFnr,
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
                ArchiveCode: 'B39 - Elevforhold - Annet',
                ArchiveType: 'FAGKLASSE PRINSIPP',
                Sort: 3,
                IsManualText: true
              }
            ],
            Contacts: [
              {
                Role: 'Sakspart',
                ReferenceNumber: xmlData.krenketElevFnr,
                IsUnofficial: true
              }
            ],
            ResponsibleEnterpriseNumber: school.orgNr
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
        const school = schoolInfo.find(school => flowStatus.parseXml.result.ArchiveData.skjemaInnsenderSkole.startsWith(school.officeLocation))
        if (!school) throw new Error(`Could not find any school with officeLocation: ${flowStatus.parseXml.result.ArchiveData.skjemaInnsenderSkole}`)
        return {
          service: 'DocumentService',
          method: 'CreateDocument',
          secure: true,
          parameter: {
            Category: 'Dokument inn',
            UnregisteredContacts: [
              {
                ContactName: `${xmlData.skjemaInnsenderNavn} (${xmlData.skjemaInnsenderEpost})`,
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
                Title: 'Varslingsskjema opplæringsloven § 12-4',
                VersionFormat: 'A'
              }
            ],
            Status: 'J',
            DocumentDate: new Date().toISOString(),
            Title: 'Varsling',
            UnofficialTitle: 'Varslingsskjema § 12-4',
            Archive: nodeEnv === 'production' ? '12-4 Dokument' : '9A4 dokument', // 12-4 Dokument
            CaseNumber: flowStatus.handleCase.result.CaseNumber,
            ResponsibleEnterpriseNumber: school.orgNr,
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
        const xmlData = flowStatus.parseXml.result.ArchiveData
        // Mapping av verdier fra XML-avleveringsfil fra Acos. Alle properties under må fylles ut og ha verdier
        return {
          company: 'OF',
          department: 'Pedagogisk støtte og utvikling',
          description,
          type: 'Varsling ved brudd på oppll. §9a-4', // Required. A short searchable type-name that distinguishes the statistic element
          // optional fields:
          skole: xmlData.skjemaInnsenderSkole
        }
      }
    }
  },
  failOnPurpose: {
    enabled: false
  }
}
