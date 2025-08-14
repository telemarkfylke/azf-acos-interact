const { default: axios } = require('axios')
const getAccessToken = require('../../get-entraid-token')
const { graph } = require('../../../config')

const isPolitician = async (flowStatus) => {
  // Bruk axios og gjør et kall til Graph med ssn som filter. Hent ut funksjon for å sjekke om bruker er "Folkevalgt"
  const ssn = flowStatus.parseJson.result.DialogueInstance.Informasjon_om_.Privatperson.Fødselsnummer1
  console.log('SSN:', ssn)
  const accessToken = await getAccessToken(graph.scope)
  console.log('Access token:', accessToken)
  console.log('Graph url:', `${graph.urlBeta}/users`)
  const { data } = await axios.get(`${graph.urlBeta}/users?$filter=extension_09851fd03a344926989f13ca3b4da692_employeeNumber/any(s:s+eq+'${ssn}')`, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (data.value[0].jobTitle === 'Folkevalgt') {
    return true
  } else {
    return false
  }
}

module.exports = {
  isPolitician
}
