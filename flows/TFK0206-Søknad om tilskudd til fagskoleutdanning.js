const description = 'Søknad om tilskudd til fagskoleutdanning'
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
  string OrgNavn
  string OrgNr
  tilbud[] Tilbud
    tilbud{
      string Omrade
      string Tilbudstype
      string Tilbudsnavn
      string Studiested
      string Studieform
      string ForventetAntStudieplasser
      string StudiepoengTotalt
      string StudiepoengPrAr
      string Varighet
      string Startmaned
      string Startar
      string Sluttmaned
      string Sluttar
      string Skolenummer
      string Studiestednummer
      string Tilbudskode
      string NUSkode
    }
}

  */

  syncEnterprise: {
    enabled: true,
    options: {
      mapper: (flowStatus) => { // for å opprette person basert på fødselsnummer
        // Mapping av verdier fra XML-avleveringsfil fra Acos.
        return {
          orgnr: flowStatus.parseXml.result.ArchiveData.OrgNr.replaceAll(' ', '')
        }
      }
    }
  },
  // Arkiverer dokumentet i 360
  archive: {
    enabled: true,
    options: {
      mapper: (flowStatus, base64, attachments) => {
        const xmlData = flowStatus.parseXml.result.ArchiveData
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
            Category: 'Dokument inn',
            Contacts: [
              {
                Role: 'Avsender',
                ReferenceNumber: xmlData.OrgNr.replaceAll(' ', ''),
                IsUnofficial: false
              }
            ],
            DocumentDate: new Date().toISOString(),
            Files: [
              {
                Base64Data: base64,
                Category: '1',
                Format: 'pdf',
                Status: 'F',
                Title: 'Søknad om tilskudd til fagskoleutdanning',
                VersionFormat: 'A'
              },
              ...p360Attachments
            ],
            ResponsibleEnterpriseRecno: nodeEnv === 'production' ? '200026' : '200020', // Seksjon kompetanse og integrering
            // ResponsiblePersonEmail: nodeEnv === 'production' ? '' : '',
            Status: 'J',
            Title: `Søknad om tilskudd til fagskoleutdanning - ${xmlData.OrgNavn}`,
            Archive: 'Saksdokument',
            CaseNumber: nodeEnv === 'production' ? '24/21559' : '23/00076'
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
        const xmlData = flowStatus.parseXml.result.ArchiveData
        const sharepointElements = []
        const tilbudsliste = Array.isArray(xmlData.Tilbud.tilbud) ? xmlData.Tilbud.tilbud : [xmlData.Tilbud.tilbud] // Sjekker om det er mer enn ett tilbud i lista (altså et array). Hvis ikke lag et array med det ene elementet
        for (const tilbud of tilbudsliste) {
          const sharepointElement = {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/FagskoleforvaltningTelemark/Lists/Driftstilskudd%20til%20fagskolene/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/FagskoleforvaltningTelemark/Lists/Driftstilskudd%20til%20fagskolene/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: xmlData.OrgNavn || 'Mangler title', // husk å bruke internal name på kolonnen
              Omr_x00e5_de: tilbud.Omrade,
              Tilbudstype: tilbud.Tilbudstype,
              Tilbudsnavn: tilbud.Tilbudsnavn,
              Studiested: tilbud.Studiested, 
              Studieform: tilbud.Studieform,
              Forventetant_x002e_st_x002e_plas: tilbud.ForventetAntStudieplasser,
              Studiepoengtotalt: tilbud.StudiepoengTotalt,
              Studiepoengpr_x002e__x00e5_r: tilbud.StudiepoengPrAr,
              Varighet: tilbud.Varighet,
              Startm_x00e5_ned: tilbud.Startmaned,
              Start_x00e5_r: tilbud.Startar,
              Sluttm_x00e5_ned: tilbud.Sluttmaned,
              Slutt_x00e5_r: tilbud.Sluttar,
              Fagskolenummer: xmlData.Skolenummer, 
              Tilbudskode: tilbud.Tilbudskode, 
              Alterendesamlinger: tilbud.Alterende, 
              Alterendefylker: tilbud.AlterendeFylker,
              Dokumentnummeri360: flowStatus.archive.result.DocumentNumber 
            }
          }
          sharepointElements.push(sharepointElement)
        }
        return sharepointElements
      }
    }
  },
  statistics: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        // Mapping av verdier fra XML-avleveringsfil fra Acos. Alle properties under må fylles ut og ha verdier
        return {
          company: 'Utdanning, folkehelse og tannhelse',
          department: 'Seksjon kompetanse og integrering',
          description, // Required. A description of what the statistic element represents
          type: 'Søknad om tilskudd til fagskoleutdanning', // Required. A short searchable type-name that distinguishes the statistic element
          // optional fields:
          documentNumber: flowStatus.archive.result.DocumentNumber // Optional. anything you like
        }
      }
    }
  },
  failOnPurpose: {
    enabled: false
  }
}
