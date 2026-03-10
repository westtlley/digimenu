const HOST = process.env.PRINT_BRIDGE_HOST || "127.0.0.1";
const PORT = Number(process.env.PRINT_BRIDGE_PORT || 48931);
const APP_NAME = "DigiMenu Print Bridge";

module.exports = {
  HOST,
  PORT,
  APP_NAME,
};
