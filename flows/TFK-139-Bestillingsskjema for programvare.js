const description = 'Søknad om mer opplæring'
const { sendEmail } = require('../lib/jobs/customJobs/sendemail')

module.exports = {
  config: {
    enabled: true,
    doNotRemoveBlobs: false
  },
  parseJson: {
    enabled: true,
    options: {
      mapper: (dialogueData) => {
        // if (!dialogueData.Testskjema_for_?.Gruppa_øverst?.Fornavn) throw new Error('Missing Gruppa_øverst.Fornavn mangler i JSON filen')
        return {
        }
      }
    }
  },
  // // Sender epostvarsel basrt på utfylt skjema
  customJobSendEpost: {
    enabled: true,
    runAfter: 'parseJson',
    options: {},
    customJob: async (jobDef, flowStatus) => {
      const jsonData = flowStatus.parseJson.result.DialogueInstance
      const emailTo = ['jon.kvist@telemarkfylke.no', 'anette.dordal@telemarkfylke.no', 'kaja.bergjensen@telemarkfylke.no', 'richard.dolven.nilsen@telemarkfylke.no', 'paal.are.solberg@telemarkfylke.no', 'anders.weston.roine@telemarkfylke.no', 'rune.almenning@telemarkfylke.no', '23e1ca10.telemarkfylke.no@no.teams.ms']
      const subject = 'Melding om nytt ønske om programvare'
      const body = `
      <h3>Nytt ønske om programvare</h3>
      <p>Til orientering,</p>
      <p>Det har kommet inn et nytt ønske om programvaren: <strong>${jsonData.Informasjon_om_.Informasjon_om_.Navn_på_system}</strong></p>
      <p>Du finner mer informasjon i <a href="https://telemarkfylke.sharepoint.com/sites/innsida-stottefunksjoner/Lists/Programvareoversikt/MaaFyllesUt.aspx?viewid=feab8433%2D5fca%2D4c5c%2D96d0%2Dea24258a3ea7&ovuser=d64408ee%2Dce52%2D4a08%2D97ff%2D658c02ccf77b%2Ctom%2Ejarle%2Echristiansen%40telemarkfylke%2Eno&OR=Teams%2DHL&CT=1750249709144&clickparams=eyJBcHBOYW1lIjoiVGVhbXMtRGVza3RvcCIsIkFwcFZlcnNpb24iOiI1MC8yNTA2MDUxNzYwNSIsIkhhc0ZlZGVyYXRlZFVzZXIiOmZhbHNlfQ%3D%3D">programvareoversikten</a>.</p>
      <br>
      <p>Med vennlig hilsen,<br>
      Den automagiske programvarebestillingsepostvarslebotten</p>
      `.trim()
      const result = await sendEmail(emailTo, subject, body)
      return result
    }
  },
  sharepointList: {
    enabled: true,
    options: {
      mapper: (flowStatus) => {
        const jsonData = flowStatus.parseJson.result.DialogueInstance
        return [
          {
            testListUrl: 'https://telemarkfylke.sharepoint.com/sites/innsida-stottefunksjoner/Lists/Programvareoversikt/MaaFyllesUt.aspx',
            prodListUrl: 'https://telemarkfylke.sharepoint.com/sites/innsida-stottefunksjoner/Lists/Programvareoversikt/MaaFyllesUt.aspx',
            uploadFormPdf: false,
            uploadFormAttachments: false,
            fields: {
              Title: jsonData.Informasjon_om_.Informasjon_om_.Navn_på_system, // Enkel linje med tekst
              Bestiller_x: jsonData.Informasjon_om_.Informasjon_om_.Brukernavn1, // Personoppslag
              Navnp_x00e5_virksomhet_x002c_sko: jsonData.Informasjon_om_.Informasjon_om_.Navn_på_virksom, // Enkel linje med tekst
              Godkjenning_x: jsonData.Informasjon_om_.Informasjon_om_.Navn_på_nærmest, // Personoppslag
              Brukes_x0020_i_x0020_undervisnin: jsonData.Informasjon_om_.Skal_tjenesten_, // Enkel linje med tekst
              Antattkostnad: jsonData.Informasjon_om_.Annen_informasj.Antatt_kostnad, // Enkel linje med tekst
              // Systemeier_x: jsonData.Informasjon_om_.Annen_informasj.Navn_på_systema, // Personoppslag
              Systemansvarlig_x: jsonData.Informasjon_om_.Annen_informasj.Navn_på_systema, // Personoppslag
              Beskrivelse: jsonData.Informasjon_om_.Annen_informasj.Hva_er_formålet, // Lang tekst
              Kategoriregistrerte_x: jsonData.Informasjon_om_.Annen_informasj.Hvem_skal_benyt1, // Valg
              Autentisering_x: jsonData.Informasjon_om_.Annen_informasj.Hvilken_løsning, // Valg
              Kategoripersonvern_x: jsonData.Informasjon_om_.Annen_informasj.Hvilke_personop, //  Valg
              H_x00e5_ndtererl_x00f8_sningenka: jsonData.Informasjon_om_.Tjenesten_skal_1.Håndterer_løsni1 === 'Ja', // Sjekkboks
              H_x00e5_ndtererl_x00f8_sningenel: jsonData.Informasjon_om_.Tjenesten_skal_1.Håndterer_løsni === 'Ja', // Sjekkboks
              H_x00e5_ndtererl_x00f8_sningenvu: jsonData.Informasjon_om_.Tjenesten_skal_1.Håndterer_løsni2 === 'Ja', // Sjekkboks
              kontaktpersonleverand_x00f8_r: jsonData.Informasjon_om_.Annen_informasj.Lenke_til_tjene, // Lang tekst
              Kommentar: jsonData.Informasjon_om_.Annen_informasj.Annet_ // Lang tekst
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
          company: 'Digitale tjenester', // Required. The name of the company
          department: '',
          description, // Required. A description of what the statistic element represents
          type: 'Bestilling av programvare' // Required. A short searchable type-name that distinguishes the statistic element
          // optional fields:
          // documentNumber: ''// Optional. anything you like
        }
      }
    }
  },
  failOnPurpose: {
    enabled: false
  }
}
