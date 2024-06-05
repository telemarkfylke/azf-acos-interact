const addLopenummerIfEqualFileName = (fileList) => {
  // REMEMBER: This function modifies the file-objects in place - aka the objects inside the list you provide to the function will be modified
  // Sjekk om det finnes flere filer med nøyaktig samme navn - da må vi slenge på suffix _{løpenummer} i file._ (siden blob-storage gjør det - spør Nils om du lurer)
  for (const file of fileList) {
    const filesWithEqualName = fileList.filter(f => f._ === file._)
    const filesWithEqualDesc = fileList.filter(f => f.$.BESK === file.$.BESK)
    if (filesWithEqualName.length > 1) {
      // Da har vi flere enn en fil med samme navn som file - vi må slenge på suffix
      let lopenummer = 1
      // Håndter like filnavn
      for (const equalFile of filesWithEqualName) {
        const filenameList = equalFile._.split('.')
        const fileext = filenameList.pop()
        const filename = filenameList.join('.')
        equalFile._ = `${filename}_${lopenummer}.${fileext}`
        lopenummer++
      }
    }
    if (filesWithEqualDesc.length > 1) {
      // Da har vi flere enn en fil med samme beskrivelse som file - vi må slenge på suffix
      // Dersom man sender inn en fil, og navngir fila i acos-skjema, så skal vi bruke det navnet som filnavn. Om filen ikke blir navngitt brukes filnavnet som desk by default.
      let lopenummer = 1
      // Håndter like BESK
      for (const equalFile of filesWithEqualDesc) {
        const deskList = equalFile.$.BESK.split('.')
        deskList.pop()
        const desk = deskList.join('.')
        equalFile.$.BESK = `${desk}_${lopenummer}`
        lopenummer++
      }
    }
  }
  return fileList
}

module.exports = { addLopenummerIfEqualFileName }
