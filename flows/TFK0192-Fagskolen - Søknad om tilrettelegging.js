// Fagskolen er fremdeles på VTFK-løsning. Vi kjører derfor skjemaene til lokal avlevering og lar gammel løsning på VTK-task gjøre jobben
const description = 'Søknad om tilrettelegging'
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
  statistics: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        // Mapping av verdier fra XML-avleveringsfil fra Acos. Alle properties under må fylles ut og ha verdier
        return {
          company: 'Fagskolen',
          department: 'Studieadministrasjon', // denne er antakelig feil :-)
          description, // Required. A description of what the statistic element represents
          type: 'Tilrettelegging' // Required. A short searchable type-name that distinguishes the statistic element
        }
      }
    }
  },
  failOnPurpose: {
    enabled: false
  }
}
