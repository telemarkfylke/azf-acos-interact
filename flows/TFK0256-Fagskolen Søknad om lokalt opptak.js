// Fagskolen er fremdeles på VTFK-løsning. Vi kjører derfor skjemaene til lokal avlevering og lar gammel løsning på VTK-task gjøre jobben
const description = 'Søknad om lokalt opptak'
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
  groundControl: {
    enabled: false // Files will be copied to GROUND_CONTROL_STORAGE_ACCOUNT_CONTAINER_NAME, and will be downloaded on local server (./ground-control/index.js)
  },

  sharepointList: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        const xmlData = flowStatus.parseXml.result.Skjema
        // if (!xmlData.Postnr) throw new Error('Postnr har ikke kommet med fra XML') // validation example
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/FAGS-Studieadministrasjon/Lists/Lokaltopptak/AllItems.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/FAGS-Studieadministrasjon/Lists/Lokaltopptak/AllItems.aspx',
            uploadFormPdf: true,
            uploadFormAttachments: true,
            fields: {
              Title: xmlData.Fnr,
              Fornavn: xmlData.Fornavn,
              Etternavn: xmlData.Etternavn,
              Adresse: xmlData.Adresse,
              Postnummer: xmlData.Postnr,
              Poststed: xmlData.Sted,
              E_x002d_post: xmlData.Epost,
              Mobil: xmlData.Mobilnr,
              Utdanning: xmlData.Utdanning,
              Starttidspunkt: xmlData.Start,
              S_x00f8_kegrunnlag: xmlData.Grunnlag
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
        // Mapping av verdier fra XML-avleveringsfil fra Acos. Alle properties under må fylles ut og ha verdier
        return {
          company: 'Fagskolen',
          department: 'Studieadministrasjon', // denne er antakelig feil :-)
          description, // Required. A description of what the statistic element represents
          type: 'Lokalt opptak' // Required. A short searchable type-name that distinguishes the statistic element
        }
      }
    }
  },
  failOnPurpose: {
    enabled: false
  }
}
