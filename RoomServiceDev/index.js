const roomService = require('../lib/room-service/room-service')
const { logger } = require('@vestfoldfylke/loglady')

module.exports = async function (context, req) {
  logger.logConfig({
    prefix: 'azf-acos-interact - RoomService'
  })
  try {
    await roomService()
  } catch (error) {
    logger.errorException(error, 'Statusrapportering feilet')
  }

  return {
    status: 200,
    body: 'OK'
  }
}
