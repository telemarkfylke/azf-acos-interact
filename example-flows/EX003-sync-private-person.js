module.exports = {
  config: {
    enabled: true
  },
  parseXml: {
    enabled: true,
    options: {
    }
  },
  syncPrivatePerson: {
    enabled: true,
    options: {
      mapper: (flowStatus) => { // for å opprette person med fiktivt fødselsnummer
        // Mapping av verdier fra XML-avleveringsfil fra Acos. Alle properties under må fylles ut og ha verdier for å opprette privatperson med fiktivt fødselsnummer
        return {
          generateFakeSsn: true,
          birthdate: flowStatus.parseXml.result.ArchiveData.Foedselsdato,
          gender: flowStatus.parseXml.result.ArchiveData.Kjoenn,
          firstName: flowStatus.parseXml.result.ArchiveData.Fornavn,
          lastName: flowStatus.parseXml.result.ArchiveData.Etternavn,
          streetAddress: flowStatus.parseXml.result.ArchiveData.Adresse,
          zipCode: flowStatus.parseXml.result.ArchiveData.Postnr,
          zipPlace: flowStatus.parseXml.result.ArchiveData.Sted
        }
      },
      mapper2: (flowStatus) => { // for å opprette person basert på fødselsnummer
        // Mapping av verdier fra XML-avleveringsfil fra Acos.
        return {
          ssn: flowStatus.parseXml.result.ArchiveData.Fnr
        }
      },
      mapper3: (flowStatus) => { // for å opprette person manuelt uten oppslag i Freg (Eks. utenlandske elever)
        // Mapping av verdier fra XML-avleveringsfil fra Acos.
        return {
          skipDsf: true,
          ssn: flowStatus.parseXml.result.ArchiveData.Fnr,
          firstName: flowStatus.parseXml.result.ArchiveData.Fornavn,
          lastName: flowStatus.parseXml.result.ArchiveData.Etternavn,
          streetAddress: flowStatus.parseXml.result.ArchiveData.Adresse,
          zipCode: flowStatus.parseXml.result.ArchiveData.Postnr,
          zipPlace: flowStatus.parseXml.result.ArchiveData.Sted
        }
      }
    }
  }
}
