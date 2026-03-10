const { app } = require("electron");
const { startServer } = require("./server");
const logger = require("./logger");

let localServer = null;

async function bootstrap() {
  localServer = startServer();
}

app.whenReady().then(bootstrap);

app.on("window-all-closed", (event) => {
  // Mantem processo em background sem UI.
  event.preventDefault();
});

app.on("before-quit", () => {
  if (!localServer) return;
  try {
    localServer.close();
  } catch (error) {
    logger.warn("Falha ao fechar servidor local no quit", { message: error.message });
  }
});
