
const { default: axios } = require("axios")
const { elevKontrakt } = require("../../../config")
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
module.exports = {
    postToElevkontrakt,
    postUpdateToElevkontrakt
}