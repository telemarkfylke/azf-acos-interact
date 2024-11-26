const schoolInfo = [
  {
    orgNr: 974568098, // Skolen sitt org nummer
    tilgangsgruppe: 'Elev Bamble vgs', // Tilgangsgruppe i arkiv
    officeLocation: 'Bamble videregående skole', // Officelocation som kommer og matcher fra AD (graph)
    primaryLocation: 'Bamble videregående skole', // Dette er navnet som vil bli brukt for å søke etter prosjektet til skolen i arkivet
    '9a4Tilgangsgruppe': '§9A4 Bamble vgs', // 9a-4 tilgangsgruppe i arkivet
    '9a5Tilgangsgruppe': '§9A5 Bamble vgs' // 9a-5 tilgangsgruppe i arkivet
  },
  {
    orgNr: 974567997,
    tilgangsgruppe: 'Elev Bø vgs',
    officeLocation: 'Bø vidaregåande skule',
    primaryLocation: 'Bø videregående skole',
    '9a4Tilgangsgruppe': '§9A4 Bø vgs',
    '9a5Tilgangsgruppe': '§9A5 Bø vgs'
  },
  {
    orgNr: 974568071,
    tilgangsgruppe: 'Elev Hjalmar Johansen vgs',
    officeLocation: 'Hjalmar Johansen videregående skole',
    primaryLocation: 'Hjalmar Johansen videregående skole',
    '9a4Tilgangsgruppe': '§9A4 Hjalmar Johansen vgs',
    '9a5Tilgangsgruppe': '§9A5 Hjalmar Johansen vgs'
  },
  {
    orgNr: 994309153,
    tilgangsgruppe: 'Elev Kompetansebyggeren',
    officeLocation: 'Kompetansebyggeren Vestfold',
    primaryLocation: 'Kompetansebyggeren Vestfold',
    '9a4Tilgangsgruppe': '§9A4 Kompetansebyggeren',
    '9a5Tilgangsgruppe': '§9A5 Kompetansebyggeren'
  },
  {
    orgNr: 974568004,
    tilgangsgruppe: 'Elev Kragerø vgs',
    officeLocation: 'Kragerø videregående skole',
    primaryLocation: 'Kragerø videregående skole',
    '9a4Tilgangsgruppe': '§9A4 Kragerø vgs',
    '9a5Tilgangsgruppe': '§9A5 Kragerø vgs'
  },
  {
    orgNr: 974568187,
    tilgangsgruppe: 'Elev Nome vgs',
    officeLocation: 'Nome videregående skole',
    primaryLocation: 'Nome videregående skole',
    '9a4Tilgangsgruppe': '§9A4 Nome vgs',
    '9a5Tilgangsgruppe': '§9A5 Nome vgs'
  },
  {
    orgNr: 974568012,
    tilgangsgruppe: 'Elev Notodden vgs',
    officeLocation: 'Notodden videregående skole',
    primaryLocation: 'Notodden videregående skole',
    '9a4Tilgangsgruppe': '§9A4 Notodden vgs',
    '9a5Tilgangsgruppe': '§9A5 Notodden vgs'
  },
  {
    orgNr: 974568020,
    tilgangsgruppe: 'Elev Porsgrunn vgs',
    officeLocation: 'Porsgrunn videregående skole',
    primaryLocation: 'Porsgrunn videregående skole',
    '9a4Tilgangsgruppe': '§9A4 Porsgrunn vgs',
    '9a5Tilgangsgruppe': '§9A5 Porsgrunn vgs'
  },
  {
    orgNr: 874568082,
    tilgangsgruppe: 'Elev Rjukan vgs',
    officeLocation: 'Rjukan videregående skole',
    primaryLocation: 'Rjukan videregående skole',
    '9a4Tilgangsgruppe': '§9A4 Rjukan vgs',
    '9a5Tilgangsgruppe': '§9A5 Rjukan vgs'
  },
  {
    orgNr: 974568039,
    tilgangsgruppe: 'Elev Skien vgs',
    officeLocation: 'Skien videregående skole',
    primaryLocation: 'Skien videregående skole',
    '9a4Tilgangsgruppe': '§9A4 Skien vgs',
    '9a5Tilgangsgruppe': '§9A5 Skien vgs'
  },
  {
    orgNr: 974568152,
    tilgangsgruppe: 'Elev Skogmo vgs',
    officeLocation: 'Skogmo videregående skole',
    primaryLocation: 'Skogmo videregående skole',
    '9a4Tilgangsgruppe': '§9A4 Skogmo vgs',
    '9a5Tilgangsgruppe': '§9A5 Skogmo vgs'
  },
  {
    orgNr: 973754815,
    tilgangsgruppe: 'Elev Skolen for sosiale og medisinske institusjoner',
    officeLocation: 'SMI-skolen',
    primaryLocation: 'SMI-skolen',
    '9a4Tilgangsgruppe': '§9A4 SMI',
    '9a5Tilgangsgruppe': '§9A5 SMI'
  },
  {
    orgNr: 974568055,
    tilgangsgruppe: 'Elev Vest-Telemark vgs',
    officeLocation: 'Vest-Telemark vidaregåande skule',
    primaryLocation: 'Vest-Telemark videregående skole',
    '9a4Tilgangsgruppe': '§9A4 Vest-Telemark vgs',
    '9a5Tilgangsgruppe': '§9A5 Vest-Telemark vgs'
  },
  {
    orgNr: 974568055,
    tilgangsgruppe: 'Elev Vest-Telemark vgs',
    officeLocation: 'Vest-Telemark vgs avd Dalen',
    primaryLocation: 'Vest-Telemark videregående skole',
    '9a4Tilgangsgruppe': '§9A4 Vest-Telemark vgs',
    '9a5Tilgangsgruppe': '§9A5 Vest-Telemark vgs'
  },
  {
    // Har ingen tilgangsgrupper eller prosjekt tilsvarende de andre skolene, ta tak i dette om det skulle komme noen caser.
    orgNr: 90300,
    tilgangsgruppe: 'Student Fagskolen',
    officeLocation: 'Fagskolen Vestfold og Telemark',
    '9a4Tilgangsgruppe': '',
    '9a5Tilgangsgruppe': ''
  },
  { // Ekstern virksomhet - Orgnummer satt til TFK
    orgNr: 929882989, // Ekstern virksomhet - Orgnummer satt til TFK
    tilgangsgruppe: 'Elev PPT', // Tilgangsgruppe i arkiv
    officeLocation: 'Seksjon PPT,OT og alternative opplæringsarenaer',
    primaryLocation: 'Seksjon PPT,OT og alternative opplæringsarenaer'
  }
]

module.exports = {
  schoolInfo
}
