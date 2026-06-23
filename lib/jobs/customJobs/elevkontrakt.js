const { default: axios } = require('axios')
const { elevKontrakt } = require('../../../config')
const getAccessToken = require('../../get-entraid-token')

const postToElevkontrakt = async (flowStatus) => {
  const accessToken = await getAccessToken(elevKontrakt.scope)
  const response = await axios.post(`${elevKontrakt.url}/handleDbRequest`, flowStatus, { headers: { Authorization: `Bearer ${accessToken}` } })
  return response.data
}

const postUpdateToElevkontrakt = async (flowStatus) => {
  const accessToken = await getAccessToken(elevKontrakt.scope)
  const response = await axios.put(`${elevKontrakt.url}/handleDbRequest`, flowStatus, { headers: { Authorization: `Bearer ${accessToken}` } })
  return response.data
}

const formatNewFormatToOldFormat = (flowStatus) => {
  return {
    ...flowStatus,
    parseXml: {
      result: {
        ArchiveData: {
          uuid: flowStatus.parseJson.result.SavedValues.Integration.Elevavtaler.resp.uuid,
          FnrElev: flowStatus.parseJson.result.DialogueInstance.Informasjon_om_.Privatperson.Fødselsnummer1,
          FnrForesatt: flowStatus.parseJson.result.DialogueInstance.Informasjon_om_.Fødselsnummer_t2.Fødselsnummer_t3,
          SkoleOrgNr: flowStatus.parseJson.result.SavedValues.Integration.Elevavtaler.resp.schoolInfo.orgnr.toString(),
          typeKontrakt: flowStatus.acosId === 'TFK-136' ? 'leieavtale' : 'låneavtale',
          isUnder18: flowStatus.parseJson.result.SavedValues.Integration.Elevavtaler.resp.isUnder18
        }
      }
    }
  }
}

const postToElevKontraktNewAcos = async (flowStatus) => {
  const accessToken = await getAccessToken(elevKontrakt.scope)
  const oldFormat = formatNewFormatToOldFormat(flowStatus)
  try {
    const response = await axios.post(`${elevKontrakt.url}/handleDbRequest`, oldFormat, { headers: { Authorization: `Bearer ${accessToken}` } })
    return response.data
  } catch (error) {
    if (error.response?.status === 409) return error.response.data
    throw error
  }
}

const postUpdateToElevkontraktNewAcos = async (flowStatus) => {
  const accessToken = await getAccessToken(elevKontrakt.scope)
  const oldFormat = formatNewFormatToOldFormat(flowStatus)
  try {
    const response = await axios.put(`${elevKontrakt.url}/handleDbRequest`, oldFormat, { headers: { Authorization: `Bearer ${accessToken}` } })
    return response.data
  } catch (error) {
    if (error.response?.status === 409) return error.response.data
    throw error
  }
}

module.exports = {
  postToElevkontrakt,
  postUpdateToElevkontrakt,
  postToElevKontraktNewAcos,
  postUpdateToElevkontraktNewAcos
}
