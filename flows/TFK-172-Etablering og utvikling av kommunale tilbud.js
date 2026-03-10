const description = 'Etablering og utvikling av kommunale frisklivs-, lærings- og mestringstilbud'
const nodeEnv = process.env.NODE_ENV || 'development'

module.exports = {
  config: {
    enabled: true,
    doNotRemoveBlobs: false
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
  syncEnterprise: {
    enabled: true,
    options: {
      mapper: (flowStatus) => { // for å opprette organisasjon basert på orgnummer
        // Mapping av verdier fra XML-avleveringsfil fra Acos.
        return {
          orgnr: flowStatus.parseJson.result.DialogueInstance.Informasjon_om_.Informasjon_om_.Organisasjonsnu.replaceAll(' ', '')
        }
      }
    }
  },
  syncPrivatePerson: {
    enabled: true,
    options: {
      mapper: (flowStatus) => { // for å opprette person basert på fødselsnummer
        return {
          ssn: flowStatus.parseJson.result.SavedValues.Login.UserID
        }
      }
    }
  },
  handleCase: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        const personData = flowStatus.syncPrivatePerson.result
        const enterpriseData = flowStatus.syncEnterprise.result
        const prosjekt = nodeEnv === 'production' ? '25-759' : '25-19' // flowStatus.handleProject.result
        console.log('Prosjektdata', prosjekt)
        console.log('personData', personData)
        return {
          service: 'CaseService',
          method: 'CreateCase',
          parameter: {
            ProjectNumber: '25-759',
            CaseType: 'Sak',
            Title: 'Etablering og utvikling av kommunale frisklivs-, lærings- og mestringstilbud',
            UnofficialTitle: 'Etablering og utvikling av kommunale frisklivs-, lærings- og mestringstilbud',
            Status: 'B',
            // AccessCode: '26',
            // Paragraph: 'Offl. § 26 femte ledd',
            JournalUnit: 'Sentralarkiv',
            SubArchive: 'Sakarkiv',
            ArchiveCodes: [
              {
                ArchiveCode: '243',
                ArchiveType: 'FELLESKLASSE PRINSIPP',
                Sort: 1
              },
              {
                ArchiveCode: 'F04',
                ArchiveType: 'FAGKLASSE PRINSIPP',
                Sort: 2
              }
            ],
            Contacts: [
              {
                Role: 'Sakspart',
                ReferenceNumber: personData.privatePerson.ssn,
                IsUnofficial: false
              }
            ],
            ResponsibleEnterpriseRecno: enterpriseData.enterprise.recno,
            // ResponsiblePersonEmail: flowStatus.syncEmployee.result.archiveManager.email,
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
        const personData = flowStatus.syncPrivatePerson.result
        const caseNumber = flowStatus.handleCase.result.CaseNumber
        const enterpriseData = flowStatus.syncEnterprise.result
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
            // AccessCode: '26',
            Category: 'Dokument inn',
            Contacts: [
              {
                ReferenceNumber: personData.privatePerson.ssn,
                Role: 'Avsender',
                IsUnofficial: false
              }
            ],
            DocumentDate: new Date().toISOString(),
            Files: [
              {
                Base64Data: base64,
                Category: '1',
                Format: 'pdf',
                Status: 'B',
                Title: `Søknad om tilskudd til etablering og utvikling av kommunale frisklivs-, lærings- og mestringstilbud - ${enterpriseData.enterprise.name}`,
                UnofficialTitle: `Søknad om tilskudd til etablering og utvikling av kommunale frisklivs-, lærings- og mestringstilbud - ${enterpriseData.enterprise.name}`,
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            // Paragraph: 'Offl. § 26 femte ledd',
            ResponsibleEnterpriseRecno: '200260',
            AccessGroup: 'Alle',
            Status: 'J',
            Title: `Søknad om tilskudd til etablering og utvikling av kommunale frisklivs-, lærings- og mestringstilbud - ${enterpriseData.enterprise.name}`,
            Archive: 'Saksdokument',
            CaseNumber: caseNumber
          }
        }
      }
    }
  },
  signOff: {
    enabled: false // Den henter dokumentnummer fra denne jobben og avskriver dokumentet med koden TO (Tatt til orientering).
  },

  closeCase: { // Den henter saksnummer fra denne jobben og lukker saken.
    enabled: false
  },
  sharepointList: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        // const xmlData = flowStatus.parseXml.result.ArchiveData
        // const formData = flowStatus.parseJson.result.DialogueInstance
        const orgData = flowStatus.parseJson.result.DialogueInstance.Informasjon_om_.Informasjon_om_
        const kontaktOpplysninger = flowStatus.parseJson.result.DialogueInstance.Informasjon_om_.Kontaktopplysni
        // const signeringsfullmakt = flowStatus.parseJson.result.DialogueInstance.Informasjon_om_.Signeringsfullma
        const overføringAvMidler = flowStatus.parseJson.result.DialogueInstance.Overf\u00F8ring_av_m.Eventuell_overf1
        const søknad = flowStatus.parseJson.result.DialogueInstance.S\u00F8knad.S\u00F8knad1
        const søknadsinfo = flowStatus.parseJson.result.DialogueInstance.S\u00F8knad
        const økonomi = flowStatus.parseJson.result.DialogueInstance.\u00D8konomi_og_buds
        const risikofaktorer = flowStatus.parseJson.result.DialogueInstance.Risikofaktorer_
        // const savedValues = flowStatus.parseJson.result.SavedValues
        console.log('OverføringAvMidler:', overføringAvMidler)
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/UT-Folkehelseoglivsmestring/Lists/Etablering%20og%20utvikling%20av%20kommunale%20tilbud/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/UT-Folkehelseoglivsmestring/Lists/Etablering%20og%20utvikling%20av%20kommunale%20tilbud/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: orgData.Organisasjonsna,
              orgnummer: orgData.Organisasjonsnu.replaceAll(' ', ''),
              kontaktperson: kontaktOpplysninger.Kontaktperson_f,
              stillingstittel: kontaktOpplysninger.Stillingstittel,
              // signeringsfullmakt: signeringsfullmakt.Sett_kryss,
              tilskudd2025: overføringAvMidler.Sett_kryss1,
              ubruktemidler: overføringAvMidler.Har_din_organis1,
              ubrukteSum: overføringAvMidler.Hvor_mye_midler2,
              brukesopp2025: overføringAvMidler.Vil_de_tildelte1,
              overf_x00f8_r2026sum: overføringAvMidler.Hvor_mye_midler3,
              tittelTiltak: søknad.Tittel_p\u00E5_tilta,
              nyttTiltak: søknad.Er_tiltaket_nytt,
              tidligereStotte: søknad.Har_dette_tilta,
              antallAarTidligereStotte: søknad.Hvor_mange_\u00E5r_h,
              bakgrunn: søknadsinfo.Bakgrunn1.Beskriv_kort_ba, // Lang tekst
              maalTiltak: søknadsinfo.M\u00E5l_og_m\u00E5lgrupp.Hva_er_m\u00E5let_fo, // Lang tekst
              maalgruppeTiltak: søknadsinfo.M\u00E5l_og_m\u00E5lgrupp.M\u00E5lgrupper_for_, // Lang tekst
              hvilkeMaalgrupper: søknadsinfo.M\u00E5l_og_m\u00E5lgrupp.Hvilke_n__m\u00E5lgr, // Lang tekst
              kommentarMaalgruppe: søknadsinfo.M\u00E5l_og_m\u00E5lgrupp.Skriv_gjerne_in, // Lang tekst
              gjennomforingInnhold: søknadsinfo.Gjennomf\u00F8ring.Beskriv_tiltaket, // Lang tekst
              gjennomforingBeskrivelse: søknadsinfo.Gjennomf\u00F8ring.Beskriv_hvordan, // Lang tekst
              gjennomforingPolitisk: søknadsinfo.Gjennomf\u00F8ring.Er_tiltaket_lag,
              gjennomforingKommentar: søknadsinfo.Gjennomf\u00F8ring.Eventuell_komme, // Lang tekst
              prosjektorgRoller: søknadsinfo.Prosjektorganis.Beskriv_roller_, // Lang tekst
              prosjektorgEventuelle: søknadsinfo.Prosjektorganis.Beskriv_eventue, // Lang tekst
              prosjektorgBrukermedvirkning: søknadsinfo.Prosjektorganis.Beskriv_hvordan1, // Lang tekst
              prosjektorgTiltak: søknadsinfo.Prosjektorganis.Hvordan_skal_ti, // Lang tekst
              prosjektorgEvaluering: søknadsinfo.Prosjektorganis.Uavhengig_av_s\u00F8, // Lang tekst
              prosjektorgInterkommunalt: søknadsinfo.Prosjektorganis.Er_tiltaket_et_,
              prosjektorgHvilkenKommune: søknadsinfo.Prosjektorganis.Hvilken_kommune,
              okonomiBudsjettOver500k: økonomi.\u00D8konomi_og_buds.Søkes_det_om_be,
              okonomiBudsjettSum: økonomi.Budsjett.Søknadsum_Telem, // Heltall
              okonomiInntekterOverforte: økonomi.Inntekter.Overførte_midle, // Heltall
              okonomiInntekterEgenfinansiering: økonomi.Inntekter.Eventuell_egenf, // Heltall
              okonomiInntekterAndreTilskudd: økonomi.Inntekter.Eventuelt_tilsk, // Heltall
              okonomiInntekterOppgiHvem: økonomi.Inntekter.Oppgi_hvem_dere,
              okonomiUtgifterListe: økonomi.Utgifter ? økonomi.Utgifter.map(item => `${item.Navn_på_utgift}: ${item.Sum_i_hele_kron3} kr`).join('\n') : '',
              okonomiUtgifterAndreKommentar_x0: økonomi.Har_du_andre_ko, // Lang tekst
              risikofaktorerVurdering: risikofaktorer.Risikofaktorer_.Vurder_og_beskr,
              risikofaktorerOverforing: risikofaktorer.Overf\u00F8ringsverd.Beskriv_hvem_so,
              risikofaktorerVidereforing1: risikofaktorer.Videref\u00F8ring_og.Beskriv_hvordan2,
              risikofaktorerVidereforing2: risikofaktorer.Videref\u00F8ring_og.Beskriv_hvordan3
            }
          }
        ]
      }
    }
  },
  statistics: {
    enabled: false,
    options: {
      mapper: (flowStatus) => {
        // Mapping av verdier fra JSON-avleveringsfil fra dialogueportal
        return {
          company: 'Utdanning og kompetanse', // Required. The company/department responsible for the statistic element
          description,
          type: 'Etablering og utvikling av kommunale tilbud' // Required. A short searchable type-name that distinguishes the statistic element
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
