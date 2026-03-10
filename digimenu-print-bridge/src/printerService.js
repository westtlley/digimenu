const { execFile } = require("node:child_process");

function getElectronBrowserWindow() {
  try {
    // No runtime do Electron, require("electron") retorna o objeto completo.
    const electron = require("electron");
    if (electron && typeof electron === "object" && electron.BrowserWindow) {
      return electron.BrowserWindow;
    }
    return null;
  } catch (_error) {
    return null;
  }
}

function runPowerShell(command) {
  return new Promise((resolve, reject) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
      { windowsHide: true, maxBuffer: 1024 * 1024 * 5 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
          return;
        }
        resolve(stdout || "");
      }
    );
  });
}

function normalizePrinterList(raw) {
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list.map((printer) => ({
    name: printer.Name || "",
    driverName: printer.DriverName || "",
    portName: printer.PortName || "",
    isDefault: Boolean(printer.Default),
    status: printer.PrinterStatus ?? null,
    shared: Boolean(printer.Shared),
  }));
}

function ensureHtmlDocument(content) {
  const text = String(content || "").trim();
  if (!text) {
    throw new Error("Conteudo de impressao vazio");
  }

  if (/<html[\s>]/i.test(text)) {
    return text;
  }

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>DigiMenu Print Job</title>
    <style>
      body {
        font-family: "Courier New", monospace;
        color: #000;
        margin: 0;
        padding: 0;
      }
      * {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      pre {
        white-space: pre-wrap;
        word-break: break-word;
      }
    </style>
  </head>
  <body>${text}</body>
</html>`;
}

async function listWindowsPrinters() {
  const command =
    "Get-Printer | Select-Object Name,DriverName,PortName,PrinterStatus,Shared,Default | ConvertTo-Json -Depth 3";
  const output = await runPowerShell(command);

  if (!output || !output.trim()) {
    return [];
  }

  let parsed;
  try {
    parsed = JSON.parse(output);
  } catch (error) {
    throw new Error(`Falha ao parsear impressoras do Windows: ${error.message}`);
  }

  return normalizePrinterList(parsed);
}

async function ensurePrinterExists(printerName) {
  const normalized = String(printerName || "").trim().toLowerCase();
  if (!normalized) {
    throw new Error("printerName e obrigatorio");
  }

  const printers = await listWindowsPrinters();
  const selected = printers.find((printer) => String(printer.name || "").trim().toLowerCase() === normalized);

  if (!selected) {
    throw new Error(`Impressora nao encontrada: ${printerName}`);
  }

  return selected;
}

function printHtmlWithElectron({ printerName, htmlContent, copies = 1, timeoutMs = 30000 }) {
  const BrowserWindow = getElectronBrowserWindow();
  if (!BrowserWindow) {
    throw new Error("Impressao real exige execucao via Electron (npm run dev)");
  }

  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({
      show: false,
      autoHideMenuBar: true,
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    let done = false;
    const safeCopies = Math.max(1, Math.min(20, Number(copies) || 1));

    const finish = (error, result) => {
      if (done) return;
      done = true;

      clearTimeout(timer);
      try {
        if (!win.isDestroyed()) {
          win.close();
        }
      } catch (_closeError) {
        // ignore
      }

      if (error) {
        reject(error);
        return;
      }
      resolve(result);
    };

    const timer = setTimeout(() => {
      finish(new Error("Tempo limite excedido ao enviar trabalho para impressora"));
    }, timeoutMs);

    win.webContents.once("did-fail-load", (_event, code, description) => {
      finish(new Error(`Falha ao carregar documento para impressao (${code}): ${description}`));
    });

    win.webContents.once("did-finish-load", () => {
      win.webContents.print(
        {
          silent: true,
          printBackground: true,
          deviceName: printerName,
          copies: safeCopies,
        },
        (success, failureReason) => {
          if (!success) {
            finish(new Error(failureReason || "Falha desconhecida no spooler"));
            return;
          }

          finish(null, {
            printerName,
            copies: safeCopies,
            printedAt: new Date().toISOString(),
          });
        }
      );
    });

    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
    win.loadURL(dataUrl).catch((error) => {
      finish(new Error(`Falha ao iniciar carga do documento: ${error.message}`));
    });
  });
}

async function printDocument({
  printerName,
  jobType = "cupom",
  contentType = "html",
  content,
  copies = 1,
  jobId = "",
}) {
  const printer = await ensurePrinterExists(printerName);
  const normalizedType = String(contentType || "html").toLowerCase();

  if (!["html", "text"].includes(normalizedType)) {
    throw new Error(`contentType nao suportado: ${contentType}`);
  }

  const htmlContent =
    normalizedType === "html"
      ? ensureHtmlDocument(content)
      : ensureHtmlDocument(`<pre>${String(content || "")}</pre>`);

  const printed = await printHtmlWithElectron({
    printerName: printer.name,
    htmlContent,
    copies,
  });

  return {
    ok: true,
    jobId: String(jobId || ""),
    jobType: String(jobType || "cupom"),
    contentType: normalizedType,
    printer: printer.name,
    copies: printed.copies,
    printedAt: printed.printedAt,
  };
}

async function printTestPage({ printerName }) {
  const now = new Date().toLocaleString("pt-BR");
  const testHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Teste DigiMenu Print Bridge</title>
    <style>
      body { font-family: "Courier New", monospace; color: #000; margin: 0; padding: 8px; font-weight: 600; }
      .line { white-space: pre; }
      .center { text-align: center; }
    </style>
  </head>
  <body>
    <div class="center">DIGIMENU PRINT BRIDGE</div>
    <div class="line">--------------------------------</div>
    <div>Teste de impressao</div>
    <div>Data/Hora: ${now}</div>
    <div>Impressora: ${String(printerName || "")}</div>
    <div class="line">--------------------------------</div>
  </body>
</html>`;

  return printDocument({
    printerName,
    jobType: "test-print",
    contentType: "html",
    content: testHtml,
    copies: 1,
    jobId: `test-${Date.now()}`,
  });
}

module.exports = {
  listWindowsPrinters,
  printDocument,
  printTestPage,
};
