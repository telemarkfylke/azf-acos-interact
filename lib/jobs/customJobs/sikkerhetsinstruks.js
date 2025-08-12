const { default: axios } = require('axios')
const getAccessToken = require('../../get-entraid-token')
const { fintfolk, archive } = require('../../../config')

const isPolitician = async (flowStatus) => {
  // Bruk axios og gjør et kall til FINT-folk-API med ssn som identifikator. Hent ut funksjon for å sjekke om bruker er politiker
  // const ssn = flowStatus.user.ssn
  const accessToken = await getAccessToken(fintfolk.scope)
  console.log('Access token:', accessToken)
  console.log('FINTFOLK API URL:', `${fintfolk.baseUrl}/teacher/upn/eva.christiansen@telemarkfylke.no`)
  const { data } = await axios.get(`${fintfolk.baseUrl}/teacher/upn/eva.christiansen@telemarkfylke.no`, { headers: { Authorization: `Bearer ${accessToken}` } })
  console.log('FINTFOLK response', data)
  // const erPolitiker = response.data?.entraIdOfficeLocation === 'Politisk ledelse og utvalg'
  return true
}

module.exports = {
  isPolitician
}
