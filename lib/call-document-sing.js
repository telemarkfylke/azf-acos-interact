const { sign } = require('../config')
const axios = require('axios').default
const getAccessToken = require('./get-entraid-token')
/**
 * 
 * @param {String} endpoint | sign/portal for å signere et dokument, sign/document/{documentNumber} for å laste ned signert dokument, sign/status/{documentNumber} for å sjekke status på signering.
 * @param {Object} payload 
 * @returns 
 */
module.exports.callSign = async (endpoint, payload, method) => {
  const accessToken = await getAccessToken(sign.scope)
  if(method === 'GET') {
    if(endpoint.startsWith('sign/document/')) {
      console.log('Calling Sign API to download document with endpoint:', endpoint)
      const { data } = await axios.get(`${sign.url}/${endpoint}`, { headers: { Authorization: `Bearer ${accessToken}` }, responseType: 'arraybuffer' })
      return data
    } else {
      const { data } = await axios.get(`${sign.url}/${endpoint}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      return data
    }
  } else if (method === 'POST') {
    const { data } = await axios.post(`${sign.url}/${endpoint}`, payload, { headers: { Authorization: `Bearer ${accessToken}` } })
    return data
  } else {
    throw new Error('Method not supported for callSign. Please use GET or POST')
  }
}
