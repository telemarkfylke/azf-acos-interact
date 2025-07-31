const description = 'Sender til Sharepoint'
// const { nodeEnv } = require('../config')

module.exports = {
  config: {
    enabled: true,
    doNotRemoveBlobs: false
  },
  parseXml: {
    enabled: true,
    options: {
    }
  },

  sharepointList: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        const xmlData = flowStatus.parseXml.result.ArchiveData
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMF-Samferdselsektorteam/Lists/Prosjektoversikt%20til%20geodata/Allitems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/SAMF-Samferdselsektorteam/Lists/Prosjektoversikt%20til%20geodata/Allitems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Innsendtav: xmlData.navn,
              Epost: xmlData.upn,
              Typeprosjekt: xmlData.typeProsjekt,
              Prosjektnavn: xmlData.prosjektNavn,
              Prosjektbeskrivelse: xmlData.prosjektBeskrivelse,
              Prosjektstatus: xmlData.prosjektStatus,
              Byggestart: xmlData.byggeStart,
              Ferdigstilt: xmlData.ferdigstilt,
              Trafikk_x00e5_pning: xmlData.trafikkåpning,
              Medf_x00f8_rervegnettsendring: xmlData.vegnettsendring,
              Merknaddataleveranse: xmlData.merknadDataleveranse,
              Prosjektinformasjon: xmlData.prosjektInformasjon,
              Arkivreferanse: xmlData.arkivreferanse,
              Tilleggsinformasjon: xmlData.tilleggsinformasjon,
              Prosjektreferanse: xmlData.prosjektNr
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
        // const xmlData = flowStatus.parseXml.result.ArchiveData
        // Mapping av verdier fra XML-avleveringsfil fra Acos. Alle properties under må fylles ut og ha verdier
        return {
          company: 'SMM',
          department: 'Team prosjektstøtte',
          description,
          type: 'Prosjektoversikt til geodata' // Required. A short searchable type-name that distinguishes the statistic element
          // optional fields:
          // tilArkiv: flowStatus.parseXml.result.ArchiveData.TilArkiv,
          // documentNumber: flowStatus.archive?.result?.DocumentNumber || 'tilArkiv er false' // Optional. anything you like
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
