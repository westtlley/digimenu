import { getScopedStorageKey } from "./tenantScope";

const BRIDGE_BASE_URL = "http://127.0.0.1:48931";
const HEALTH_CACHE_KEY = "digimenu_print_bridge_health";
const DEFAULT_PRINTER_CACHE_KEY = "digimenu_print_bridge_default_printer";

const HEALTH_CACHE_TTL_MS = 300000;
const HEALTH_REQUEST_TIMEOUT_MS = 700;
const DEFAULT_REQUEST_TIMEOUT_MS = 2500;
const PRINT_REQUEST_TIMEOUT_MS = 4500;

let healthCache = {
  available: false,
  lastCheckedAt: 0,
};
let healthRequestPromise = null;

function nowMs() {
  return Date.now();
}

function createBridgeError(message, extras = {}) {
  const error = new Error(message);
  Object.assign(error, extras);
  return error;
}

function isLikelyConnectionError(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();
  return (
    code === "BRIDGE_TIMEOUT" ||
    code === "BRIDGE_NETWORK" ||
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("timeout")
  );
}

function loadHealthCacheFromStorage() {
  if (typeof window === "undefined") return;

  try {
    const raw = localStorage.getItem(HEALTH_CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.available === "boolean" && Number.isFinite(parsed?.lastCheckedAt)) {
      healthCache = {
        available: parsed.available,
        lastCheckedAt: parsed.lastCheckedAt,
      };
    }
  } catch (_error) {
    // ignore invalid cache
  }
}

function persistHealthCache() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HEALTH_CACHE_KEY, JSON.stringify(healthCache));
  } catch (_error) {
    // ignore storage errors
  }
}

function setHealthCache(available) {
  healthCache = {
    available: Boolean(available),
    lastCheckedAt: nowMs(),
  };
  persistHealthCache();
}

function isHealthCacheFresh() {
  return nowMs() - healthCache.lastCheckedAt <= HEALTH_CACHE_TTL_MS;
}

function buildUrl(pathname) {
  const clean = String(pathname || "").startsWith("/") ? pathname : `/${pathname}`;
  return `${BRIDGE_BASE_URL}${clean}`;
}

async function fetchJson(
  pathname,
  { method = "GET", body, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS, uncertainPrintedOnTimeout = false } = {}
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(buildUrl(pathname), {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await response.text();
    let data = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (_jsonError) {
        data = { raw: text };
      }
    }

    if (!response.ok) {
      const message = data?.message || `Bridge HTTP ${response.status}`;
      throw createBridgeError(message, {
        code: "BRIDGE_HTTP_ERROR",
        status: response.status,
      });
    }

    return data;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw createBridgeError("Timeout ao comunicar com DigiMenu Print Bridge", {
        code: "BRIDGE_TIMEOUT",
        retryable: true,
        uncertainPrinted: Boolean(uncertainPrintedOnTimeout),
      });
    }

    if (error?.code === "BRIDGE_HTTP_ERROR") {
      throw error;
    }

    throw createBridgeError(error?.message || "Falha de rede ao comunicar com o bridge", {
      code: "BRIDGE_NETWORK",
      retryable: true,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function getConfiguredPrinterName() {
  if (typeof window === "undefined") return "";
  try {
    const raw =
      localStorage.getItem(getScopedStorageKey("printerConfigLocal", null, "global")) ||
      localStorage.getItem("printerConfigLocal");
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    return String(parsed?.printer_name || "").trim();
  } catch (_error) {
    return "";
  }
}

function getCachedDefaultPrinterName() {
  if (typeof window === "undefined") return "";
  try {
    return String(localStorage.getItem(DEFAULT_PRINTER_CACHE_KEY) || "").trim();
  } catch (_error) {
    return "";
  }
}

function cacheDefaultPrinterName(printerName) {
  if (typeof window === "undefined") return;
  const normalized = String(printerName || "").trim();
  if (!normalized) return;
  try {
    localStorage.setItem(DEFAULT_PRINTER_CACHE_KEY, normalized);
  } catch (_error) {
    // ignore storage errors
  }
}

async function resolvePrinterName(printerName) {
  const explicit = String(printerName || "").trim();
  if (explicit) {
    cacheDefaultPrinterName(explicit);
    return explicit;
  }

  const configured = getConfiguredPrinterName();
  if (configured) {
    cacheDefaultPrinterName(configured);
    return configured;
  }

  const cached = getCachedDefaultPrinterName();
  if (cached) {
    return cached;
  }

  const listResponse = await getBridgePrinters();
  const list = Array.isArray(listResponse?.printers) ? listResponse.printers : [];
  const selected = list.find((printer) => printer?.isDefault) || list[0];
  const selectedName = String(selected?.name || "").trim();
  if (selectedName) {
    cacheDefaultPrinterName(selectedName);
  }
  return selectedName;
}

export function isBridgeLikelyAvailableSync() {
  if (!healthCache.lastCheckedAt) {
    loadHealthCacheFromStorage();
  }
  return Boolean(healthCache.available && isHealthCacheFresh());
}

export async function isBridgeAvailable({ force = false, timeoutMs = HEALTH_REQUEST_TIMEOUT_MS } = {}) {
  if (!force && isHealthCacheFresh()) {
    return Boolean(healthCache.available);
  }

  if (healthRequestPromise) {
    return healthRequestPromise;
  }

  healthRequestPromise = (async () => {
    try {
      const data = await fetchJson("/health", { timeoutMs });
      const available = Boolean(data?.ok);
      setHealthCache(available);
      return available;
    } catch (_error) {
      setHealthCache(false);
      return false;
    } finally {
      healthRequestPromise = null;
    }
  })();

  return healthRequestPromise;
}

export function primeBridgeAvailability() {
  if (typeof window === "undefined") return;
  if (isHealthCacheFresh()) return;
  void isBridgeAvailable().catch(() => {});
}

export async function getBridgePrinters() {
  const available = await isBridgeAvailable();
  if (!available) {
    throw createBridgeError("DigiMenu Print Bridge indisponivel", { code: "BRIDGE_UNAVAILABLE" });
  }
  return fetchJson("/printers");
}

export async function testBridgePrinter(printerName) {
  const available = await isBridgeAvailable({ force: true });
  if (!available) {
    throw createBridgeError("DigiMenu Print Bridge indisponivel", { code: "BRIDGE_UNAVAILABLE" });
  }

  const resolvedPrinterName = await resolvePrinterName(printerName);
  if (!resolvedPrinterName) {
    throw createBridgeError("Nenhuma impressora disponivel no bridge", { code: "BRIDGE_NO_PRINTER" });
  }

  const response = await fetchJson("/test-print", {
    method: "POST",
    body: { printerName: resolvedPrinterName },
  });

  cacheDefaultPrinterName(resolvedPrinterName);
  return response;
}

export async function printViaBridge(payload = {}) {
  const available = await isBridgeAvailable({ force: true });
  if (!available) {
    throw createBridgeError("DigiMenu Print Bridge indisponivel", { code: "BRIDGE_UNAVAILABLE" });
  }

  const resolvedPrinterName = await resolvePrinterName(payload?.printerName);
  if (!resolvedPrinterName) {
    throw createBridgeError("Nenhuma impressora disponivel no bridge", { code: "BRIDGE_NO_PRINTER" });
  }

  const jobId = String(payload?.jobId || `web-${Date.now()}`);

  try {
    const response = await fetchJson("/print", {
      method: "POST",
      timeoutMs: Number(payload?.timeoutMs) || PRINT_REQUEST_TIMEOUT_MS,
      uncertainPrintedOnTimeout: true,
      body: {
        printerName: resolvedPrinterName,
        jobType: payload?.jobType || "documento",
        contentType: payload?.contentType || "html",
        content: payload?.content || "",
        copies: Number(payload?.copies) || 1,
        jobId,
      },
    });

    setHealthCache(true);
    cacheDefaultPrinterName(resolvedPrinterName);
    return response;
  } catch (error) {
    if (isLikelyConnectionError(error)) {
      setHealthCache(false);
    }
    throw error;
  }
}

primeBridgeAvailability();
