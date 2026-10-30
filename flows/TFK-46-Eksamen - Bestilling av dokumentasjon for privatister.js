const description = 'TFK-46 - Eksamen - Bestilling av dokumentasjon for privatister'
const title = 'Bestilling av dokumentasjon for privatister'
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

  // Synkroniser elevmappe
  syncElevmappe: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        return {
          ssn: flowStatus.parseJson.result.DialogueInstance.Kontaktopplysninger2.Kontaktopplysni.Fodselsnummer
        }
      }
    }
  },

  // Arkiverer dokumentet i elevmappa
  archive: {
    enabled: true,
    options: {
      mapper: (flowStatus, base64, attachments) => {
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
            AccessGroup: 'Eksamen',
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
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200027' : '200021',
            Status: 'J',
            Title: title,
            UnofficialTitle: `${title} - ${flowStatus.syncElevmappe.result.privatePerson.name}`,
            Archive: 'Elevdokument',
            CaseNumber: flowStatus.syncElevmappe.result.elevmappe.CaseNumber
          }
        }
      }
    }
  },

  signOff: {
    enabled: false // Ikke automatisk avskriving
  },

  closeCase: {
    enabled: false
  },

  sharepointList: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        const kontakt = flowStatus.parseJson.result.DialogueInstance.Kontaktopplysninger2.Kontaktopplysni
        const altAdresse = flowStatus.parseJson.result.DialogueInstance.Kontaktopplysninger2.Alternativ_postadresse
        const dokumentasjon = flowStatus.parseJson.result.DialogueInstance.Hva_slags_dokumentasjon_2
        const valg = dokumentasjon.Hva_slags_dokum
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/OPT-TAN-Utdanningfolkehelseogtannhelse/Lists/Privatistdokumentasjon/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/OPT-TAN-Utdanningfolkehelseogtannhelse/Lists/Privatistdokumentasjon/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: flowStatus.parseJson.result.Metadata.ReferenceId.Value,
              Fornavn: kontakt.Fornavn,
              Etternavn: kontakt.Etternavn,
              Adresse: kontakt.Adresse,
              Postnummerogsted: `${kontakt.Postnummer_sted_postnr} ${kontakt.Postnummer_sted_poststed}`.trim(),
              Mobilnummer: kontakt.Mobilnummer,
              E_x002d_postadresse: kontakt.E_postadresse,
              Alternativadresse: [altAdresse.Gateadresse, `${altAdresse.Postnr_sted_postnr} ${altAdresse.Postnr_sted_poststed}`.trim()].filter(Boolean).join(', '),
              Eksamenssted: valg.Hvilken_skole_gar_eller_ || '',
              Typedokumentasjon: valg.Velg,
              Fag: [valg.Hvilke_fag_onsker_du_pa_, valg.Skriv_inn_hvilke_t__fag, valg.Skriv_inn_hvilke_t__fag2].filter(Boolean).join('\n'), // Flere linjer med tekst
              Eksamensperiode_x0028_semester_x: dokumentasjon['Hvilket_årstall'].Fyll_ut || valg.Skriv_inn_avgangsaret_di,
              Bestilt: flowStatus.parseJson.result.Metadata.Submitted // Dato og klokkeslett
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
          company: 'Telemark fylkeskommune',
          department: 'Eksamen',
          description,
          type: 'Bestilling av dokumentasjon for privatister',
          documentNumber: flowStatus.archive?.result?.DocumentNumber
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
