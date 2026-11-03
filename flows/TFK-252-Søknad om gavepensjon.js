const description = 'Søknad om gavepensjon'
const nodeEnv = require('../config').nodeEnv

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
  syncEmployee: {
    enabled: true,
    options: {
      mapper: (flowStatus) => { // for å opprette person basert på fødselsnummer
        const personData = flowStatus.parseJson.result.SavedValues.Integration.UPN_til_SSN.SSN.extension_09851fd03a344926989f13ca3b4da692_employeeNumber
        return {
          ssn: personData // SSN ansatt som er logget inn
        }
      }
    }
  },
  handleProject: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        return {
          service: 'ProjectService',
          method: 'CreateProject',
          parameter: {
            Title: `Personaldokumentasjon - ${flowStatus.syncEmployee.result.privatePerson.name}`,
            Contacts: [
              {
                Role: 'Kontakt',
                ReferenceNumber: flowStatus.syncEmployee.result.privatePerson.ssn
              }
            ]
          }
        }
      },
      getProjectParameter: (flowStatus) => {
        return {
          Title: `Personaldokumentasjon - ${flowStatus.syncEmployee.result.privatePerson.name}` // check for exisiting project with this title
        }
      }
    }
  },
  handleCase: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        const prosjekt = flowStatus.handleProject.result
        if (!prosjekt.ProjectNumber) {
          throw new Error('Mangler: ProjectNumber')
        }
        return {
          service: 'CaseService',
          method: 'CreateCase',
          parameter: {
            ProjectNumber: prosjekt.ProjectNumber,
            CaseType: 'Personal',
            Title: 'Gavepensjon',
            UnofficialTitle: `Gavepensjon - ${flowStatus.syncEmployee.result.privatePerson.name}`,
            Status: 'B',
            AccessCode: '13',
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            JournalUnit: 'Sentralarkiv',
            SubArchive: 'Personal',
            ArchiveCodes: [
              {
                ArchiveCode: '572',
                ArchiveType: 'FELLESKLASSE PRINSIPP',
                Sort: 2
              },
              {
                ArchiveCode: flowStatus.syncEmployee.result.privatePerson.ssn,
                ArchiveType: 'FNR',
                Sort: 1,
                IsManualText: true
              }
            ],
            Contacts: [
              {
                Role: 'Sakspart',
                ReferenceNumber: flowStatus.syncEmployee.result.privatePerson.ssn,
                IsUnofficial: true
              }
            ],
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200010' : '200015',
            AccessGroup: '' // Automatisk
          }
        }
      }
    }
  },
  archive: {
    enabled: true,
    options: {
      mapper: (flowStatus, base64, attachments) => {
        const personData = flowStatus.syncEmployee.result.privatePerson
        const manager = flowStatus.syncEmployee.result.archiveManager
        const caseNumber = flowStatus.handleCase.result.CaseNumber
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
            AccessGroup: '', // Automatisk
            Category: 'Dokument inn',
            Contacts: [
              {
                ReferenceNumber: personData.ssn,
                Role: 'Avsender',
                IsUnofficial: true
              },
              {
                ReferenceNumber: `recno:${manager.recno}`, // Ansattes leder skal være kopimottaker
                Role: 'Kopi til'
              }
            ],
            DocumentDate: new Date().toISOString(),
            Files: [
              {
                Base64Data: base64,
                Category: '1',
                Format: 'pdf',
                Status: 'B',
                Title: 'Søknad om gavepensjon',
                UnofficialTitle: `Søknad om gavepensjon - ${personData.name}`,
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            Paragraph: 'Offl. § 13 jf. fvl. § 13 (1) nr.1',
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200010' : '200015',
            Status: 'J',
            Title: 'Søknad om gavepensjon',
            UnofficialTitle: `Søknad om gavepensjon - ${personData.name}`,
            Archive: 'Personaldokument',
            CaseNumber: caseNumber
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

  sharepointList: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        const omDeg = flowStatus.parseJson.result.DialogueInstance.Om_deg_steg.Om_deg
        const leder = flowStatus.parseJson.result.DialogueInstance.Om_deg_steg.Nærmeste_leder
        const arbeidssted = flowStatus.parseJson.result.DialogueInstance.Arbeidssted_og_pensjon_s.Arbeidssted_og_pensjon
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/T-Organisasjonogdigitalutvikling-Personal_ledersttte_rekruttering2/Lists/soknaderGavepensjon/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/T-Organisasjonogdigitalutvikling-Personal_ledersttte_rekruttering2/Lists/soknaderGavepensjon/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: `${omDeg.Hva_er_fornavnet_ditt_} ${omDeg.Hva_er_etternavnet_ditt_}`,
              epost: omDeg.Hva_er_e_postadressen_di,
              telefon: omDeg.Hva_er_telefonnummeret_d,
              leder: `${leder.Fornavn1} ${leder.Etternavn1}`,
              lederEpost: leder.E_post,
              arbeidssted: arbeidssted.Hvor_jobber_du_,
              stillingstittel: arbeidssted.Tittel1,
              pensjonskasse: arbeidssted.Pensjonskasse,
              lokasjon: arbeidssted.Lokasjon,
              onsketSluttdato: arbeidssted.Ønsket_sluttdato
            }
          }
        ]
      }
    }
  },

  statistics: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        return {
          company: 'Personal, lederstøtte og rekruttering',
          description,
          type: 'Søknad om gavepensjon' // Required. A short searchable type-name that distinguishes the statistic element
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
