require('dotenv').config()

module.exports = {
  GROUND_CONTROL_STORAGE_ACCOUNT_CONNECTION_STRING: process.env.GROUND_CONTROL_STORAGE_ACCOUNT_CONNECTION_STRING || 'ein connnceoiton string',
  GROUND_CONTROL_STORAGE_ACCOUNT_CONTAINER_NAME: process.env.GROUND_CONTROL_STORAGE_ACCOUNT_CONTAINER_NAME || 'namnet på conteinereanen',
  AVLEVERING_ROOT: process.env.AVLEVERING_ROOT
}
