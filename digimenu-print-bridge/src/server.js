const express = require("express");
const { HOST, PORT, APP_NAME } = require("./config");
const { listWindowsPrinters, printDocument, printTestPage } = require("./printerService");
const { createPrintQueue } = require("./printQueue");
const logger = require("./logger");

function isLocalAddress(address = "") {
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}

function normalizeCopies(value, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(20, Math.floor(parsed)));
}

function createApp() {
  const app = express();
  const printQueue = createPrintQueue(async (job) => {
    if (job.type === "test-print") {
      return printTestPage(job.payload);
    }
    if (job.type === "print") {
      return printDocument(job.payload);
    }
    throw new Error(`Tipo de job nao suportado: ${job.type}`);
  });

  app.use(express.json({ limit: "1mb" }));

  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-DigiMenu-Bridge-Key");
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use((req, res, next) => {
    const remoteAddress = req.socket?.remoteAddress || "";
    if (!isLocalAddress(remoteAddress)) {
      logger.warn("Requisicao bloqueada: origem nao local", { remoteAddress });
      res.status(403).json({
        ok: false,
        message: "Acesso permitido apenas via localhost",
      });
      return;
    }
    next();
  });

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      app: APP_NAME,
    });
  });

  app.get("/printers", async (_req, res) => {
    try {
      const printers = await listWindowsPrinters();
      res.json({
        ok: true,
        printers,
      });
    } catch (error) {
      logger.error("Falha ao listar impressoras", { message: error.message });
      res.status(500).json({
        ok: false,
        message: "Falha ao listar impressoras do Windows",
      });
    }
  });

  app.post("/test-print", async (req, res) => {
    const printerName = String(req.body?.printerName || "").trim();
    if (!printerName) {
      res.status(400).json({
        ok: false,
        message: "printerName e obrigatorio",
      });
      return;
    }

    const jobId = `test-${Date.now()}`;

    try {
      const result = await printQueue.enqueue({
        type: "test-print",
        jobId,
        payload: { printerName },
      });

      res.json({
        ok: true,
        jobId,
        result,
      });
    } catch (error) {
      logger.error("Falha ao executar test-print", { printerName, message: error.message });
      res.status(500).json({
        ok: false,
        jobId,
        message: "Falha ao imprimir teste",
        error: error.message,
      });
    }
  });

  app.post("/print", async (req, res) => {
    const printerName = String(req.body?.printerName || "").trim();
    const jobType = String(req.body?.jobType || "cupom").trim() || "cupom";
    const contentType = String(req.body?.contentType || "html").trim().toLowerCase();
    const content = typeof req.body?.content === "string" ? req.body.content : "";
    const copies = normalizeCopies(req.body?.copies, 1);
    const jobId = String(req.body?.jobId || `job-${Date.now()}`).trim();

    if (!printerName) {
      res.status(400).json({ ok: false, message: "printerName e obrigatorio" });
      return;
    }

    if (!content) {
      res.status(400).json({ ok: false, message: "content e obrigatorio" });
      return;
    }

    if (!["html", "text"].includes(contentType)) {
      res.status(400).json({
        ok: false,
        message: "contentType invalido. Use html ou text",
      });
      return;
    }

    try {
      const result = await printQueue.enqueue({
        type: "print",
        jobId,
        payload: {
          printerName,
          jobType,
          contentType,
          content,
          copies,
          jobId,
        },
      });

      res.json({
        ok: true,
        jobId,
        result,
      });
    } catch (error) {
      logger.error("Falha no endpoint /print", {
        printerName,
        jobId,
        message: error.message,
      });

      res.status(500).json({
        ok: false,
        jobId,
        message: "Falha ao enviar documento para impressao",
        error: error.message,
      });
    }
  });

  app.get("/queue/status", (_req, res) => {
    res.json({
      ok: true,
      queue: printQueue.getStatus(),
    });
  });

  return app;
}

function startServer() {
  const app = createApp();
  const server = app.listen(PORT, HOST, () => {
    logger.info(`${APP_NAME} ativo em http://${HOST}:${PORT}`);
  });

  server.on("error", (error) => {
    logger.error("Erro ao iniciar servidor local", { message: error.message });
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createApp,
  startServer,
};
