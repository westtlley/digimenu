const logger = require("./logger");

function createPrintQueue(processJob) {
  if (typeof processJob !== "function") {
    throw new Error("processJob deve ser uma funcao");
  }

  const pending = [];
  let activeJob = null;
  let running = false;

  async function drain() {
    if (running) return;
    running = true;

    while (pending.length > 0) {
      const entry = pending.shift();
      activeJob = {
        jobId: entry.job?.jobId || null,
        type: entry.job?.type || null,
        startedAt: new Date().toISOString(),
      };

      try {
        logger.info("Iniciando job de impressao", { jobId: activeJob.jobId, type: activeJob.type });
        const result = await processJob(entry.job);
        entry.resolve(result);
      } catch (error) {
        logger.error("Falha em job de impressao", {
          jobId: activeJob.jobId,
          type: activeJob.type,
          message: error.message,
        });
        entry.reject(error);
      } finally {
        activeJob = null;
      }
    }

    running = false;
  }

  function enqueue(job) {
    return new Promise((resolve, reject) => {
      pending.push({
        job,
        resolve,
        reject,
        enqueuedAt: new Date().toISOString(),
      });

      logger.info("Job enfileirado", {
        jobId: job?.jobId || null,
        type: job?.type || null,
        pending: pending.length,
      });

      void drain();
    });
  }

  function getStatus() {
    return {
      pending: pending.length,
      running,
      activeJob,
    };
  }

  return {
    enqueue,
    getStatus,
  };
}

module.exports = {
  createPrintQueue,
};
