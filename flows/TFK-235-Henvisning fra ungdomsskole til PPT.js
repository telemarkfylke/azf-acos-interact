const description = 'TFK-235 - Henvisning fra ungdomsskole til PPT'
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

  // Ingen arkivering - skjema, vedlegg og datafila sendes til ground control og lastes ned på lokal server (./ground-control/index.js)
  groundControl: {
    enabled: true
  },

  statistics: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        return {
          company: 'Opplæring',
          department: 'PP-tjenesten',
          description,
          type: 'Henvisning fra ungdomsskole til PPT'
        }
      }
    }
  },

  failOnPurpose: {
    enabled: false
  }
}
