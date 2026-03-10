function timestamp() {
  return new Date().toISOString();
}

function info(message, meta) {
  if (meta) {
    // eslint-disable-next-line no-console
    console.log(`[${timestamp()}] INFO: ${message}`, meta);
    return;
  }
  // eslint-disable-next-line no-console
  console.log(`[${timestamp()}] INFO: ${message}`);
}

function warn(message, meta) {
  if (meta) {
    // eslint-disable-next-line no-console
    console.warn(`[${timestamp()}] WARN: ${message}`, meta);
    return;
  }
  // eslint-disable-next-line no-console
  console.warn(`[${timestamp()}] WARN: ${message}`);
}

function error(message, meta) {
  if (meta) {
    // eslint-disable-next-line no-console
    console.error(`[${timestamp()}] ERROR: ${message}`, meta);
    return;
  }
  // eslint-disable-next-line no-console
  console.error(`[${timestamp()}] ERROR: ${message}`);
}

module.exports = {
  info,
  warn,
  error,
};
