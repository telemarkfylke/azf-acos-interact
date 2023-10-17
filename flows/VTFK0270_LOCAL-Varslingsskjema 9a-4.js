const description = 'Arkivering av varsling ved brud på oppll. § 9 A-4 til skolen sitt 9 A-4 prosjekt. Skal opprettes en ny sak pr skjema'
const { nodeEnv } = require('../config')
const { getSchoolYear } = require('../lib/flow-helpers')
const { schoolInfo } = require('../lib/data-sources/vtfk-schools')
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
        const school = schoolInfo.find(school => school.officeLocation === flowStatus.parseXml.result.ArchiveData.skjemaInnsenderSkole)
        if(!school) throw new Error(`Could not find any school with officeLocation: ${flowStatus.parseXml.result.ArchiveData.skjemaInnsenderSkole}`)
        return {
          service: 'ProjectService',
          method: 'CreateProject',
          parameter: {
            Title:  `§9A-4 sak - ${getSchoolYear()} - ${school.officeLocation}%`, // check for exisiting project with this title, '%' er wildcard når vi søker i 360 eller sif api.
            ResponsiblePersonIdNumber: school.orgNr,
            AccessGroup: school.tilgangsgruppe
          }
        }
      },
      getProjectParameter: (flowStatus) => {
        const school = schoolInfo.find(school => school.officeLocation === flowStatus.parseXml.result.ArchiveData.skjemaInnsenderSkole)
        if(!school) throw new Error(`Could not find any school with officeLocation: ${flowStatus.parseXml.result.ArchiveData.skjemaInnsenderSkole}`)
        return {
          Title: `§9A-4 sak - ${getSchoolYear()}%`, // check for exisiting project with this title, '%' er wildcard når vi søker i 360 eller sif api.
          ContactReferenceNumber: school.orgNr,
          StatusCode: "Under utføring"
        }
      }
    }
  },

  handleCase: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        const xmlData = flowStatus.parseXml.result.ArchiveData
        const school = schoolInfo.find(school => school.officeLocation === xmlDataskjemaInnsenderSkole)
        return {
          service: 'CaseService',
          method: 'CreateCase',
          parameter: {
            CaseType: 'Sak',
            Title: '§9a-4 sak',
            UnofficialTitle: `§9a-4 sak - ${xmlData.krenketElevNavn}`,
            Status: 'B',
            AccessCode: '13',
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            AccessGroup: school['9a4Tilgangsgruppe'], //9a-4 tilgangsgruppe til den skolen det gjelder
            JournalUnit: 'Sentralarkiv',
            SubArchive: '4',
            ArchiveCodes: [
            //   {
            //     ArchiveCode: '---',
            //     ArchiveType: '',
            //     Sort: 1
            //   },
              {
                ArchiveCode: 'B31',
                ArchiveType: 'FAGKLASSE PRINSIPP',
                Sort: 2
              },
            //   {
            //     ArchiveCode: '--',
            //     ArchiveType: 'TILLEGGSKODE PRINSIPP',
            //     Sort: 3,
            //     IsManualText: true
            //   },
              {
                ArchiveCode: xmlData.krenketElevFnr,
                ArchiveType: 'FNR',
                IsManualText: true,
                Sort: 4
              }
            ],
            Contacts: [
              {
                Role: 'Sakspart',
                ReferenceNumber: xmlData.krenketElevFnr,
                IsUnofficial: true
              }
            ],
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '235285' : '236911'
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
        const caseNumber = flowStatus.handleCase.result.CaseNumber
        return {
          system: 'acos',
          template: 'mobbeombud-document',
          secure: true,
          parameter: {
            enterpriseRecno: nodeEnv === 'production' ? '235285' : '236911',
            documentDate: new Date().toISOString(),
            caseNumber,
            base64,
            documentTitle: 'Henvendelse til mobbeombud',
            innsenderSsn: xmlData.InnsenderFnr
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
            type: 'Varsling ved brudd på oppll. $9a-4', // Required. A short searchable type-name that distinguishes the statistic element
            // optional fields:
            skole: schoolInfo.find(school => school.officeLocation === xmlData.skjemaInnsenderSkole)
        }
      }
    }
  },
  failOnPurpose: {
    enabled: false
  }
}
