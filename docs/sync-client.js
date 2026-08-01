(function (root) {
  "use strict";

  const KEYS = {
    config: "irrigation_sync_config_v1",
    remote: "irrigation_sync_remote_v1",
    pending: "irrigation_sync_pending_v1",
    conflicts: "irrigation_sync_conflicts_v1",
    cursor: "irrigation_sync_cursor_v1",
    device: "irrigation_sync_device_v1",
  };
  const DEFAULT_ENDPOINT = "https://script.google.com/macros/s/AKfycbzhH_U8JxPr-VK_ZCtYI_sbHslOlXiytTaQB_IhL57Zxysb2mg3tBV_27ncjOX8KO0-8A/exec";

  function safeParse(value, fallback) {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function makeId(prefix) {
    const uuid = root.crypto && typeof root.crypto.randomUUID === "function"
      ? root.crypto.randomUUID()
      : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
    return prefix + "-" + uuid;
  }

  function fnv1a64(text) {
    let hash = 14695981039346656037n;
    const prime = 1099511628211n;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= BigInt(text.charCodeAt(index));
      hash = BigInt.asUintN(64, hash * prime);
    }
    return hash.toString(36);
  }

  function stableRecordId(asset) {
    const identity = [
      asset.adm, asset.eng, asset.canal, asset.name,
      asset.km ?? "", asset.lon ?? "", asset.lat ?? "",
    ].join("|").normalize("NFKC");
    return "asset-" + fnv1a64(identity);
  }

  function normalizeChange(change) {
    return {
      changeId: String(change.changeId || ""),
      recordId: String(change.recordId || ""),
      operation: change.operation === "delete" ? "delete" : "upsert",
      entityType: "asset",
      payload: change.payload && typeof change.payload === "object" ? change.payload : {},
      baseVersion: Number(change.baseVersion) || 0,
      version: Number(change.version) || 0,
      updatedAt: String(change.updatedAt || ""),
      updatedBy: String(change.updatedBy || ""),
      deviceId: String(change.deviceId || ""),
      deleted: Boolean(change.deleted || change.operation === "delete"),
      checksum: String(change.checksum || ""),
    };
  }

  function createSyncManager(options) {
    const storage = options.storage || root.localStorage;
    const fetchImpl = options.fetch || root.fetch.bind(root);
    const onStatus = options.onStatus || function () {};
    const onDataChange = options.onDataChange || function () {};
    const isOnline = options.isOnline || function () {
      return !root.navigator || root.navigator.onLine !== false;
    };

    const read = (key, fallback) => safeParse(storage.getItem(key), fallback);
    const write = (key, value) => storage.setItem(key, JSON.stringify(value));
    let activeRequest = null;

    let deviceId = storage.getItem(KEYS.device);
    if (!deviceId) {
      deviceId = makeId("device");
      storage.setItem(KEYS.device, deviceId);
    }

    function getConfig() {
      return Object.assign({ endpoint: DEFAULT_ENDPOINT, key: "", user: "" }, read(KEYS.config, {}));
    }

    function saveConfig(config) {
      const endpoint = String(config.endpoint || "").trim().replace(/\/+$/, "");
      if (endpoint && (!/^https:\/\/script\.google\.com\/macros\/s\//.test(endpoint) || !/\/exec$/.test(endpoint))) {
        throw new Error("رابط Web app غير صحيح؛ يجب أن يبدأ بـ script.google.com وينتهي بـ /exec");
      }
      const clean = {
        endpoint,
        key: String(config.key || "").trim(),
        user: String(config.user || "").trim(),
      };
      write(KEYS.config, clean);
      return clean;
    }

    function isConfigured() {
      const config = getConfig();
      return Boolean(config.endpoint && config.key && config.user);
    }

    function getRemoteMap() {
      return read(KEYS.remote, {});
    }

    function getPending() {
      return read(KEYS.pending, []).map(normalizeChange);
    }

    function getConflicts() {
      return read(KEYS.conflicts, []);
    }

    function pendingCount() {
      return getPending().length;
    }

    function applyOverlay(baseAssets) {
      const records = new Map(baseAssets.map((asset) => [asset.recordId, Object.assign({}, asset)]));
      const orderedChanges = [
        ...Object.values(getRemoteMap()).map(normalizeChange),
        ...getPending(),
      ];
      for (const change of orderedChanges) {
        if (!change.recordId) continue;
        if (change.deleted) {
          records.delete(change.recordId);
          continue;
        }
        const previous = records.get(change.recordId) || {};
        records.set(change.recordId, Object.assign({}, previous, change.payload, {
          recordId: change.recordId,
          version: change.version || previous.version || 0,
          locallyPending: !change.version,
        }));
      }
      return [...records.values()];
    }

    function queue(operation, asset) {
      const config = getConfig();
      const remote = getRemoteMap();
      const pending = getPending();
      const recordId = asset.recordId || makeId("asset");
      const priorPending = pending.find((item) => item.recordId === recordId);
      const change = normalizeChange({
        changeId: priorPending ? priorPending.changeId : makeId("change"),
        recordId,
        operation,
        payload: Object.assign({}, asset, { recordId }),
        baseVersion: priorPending ? priorPending.baseVersion : Number(remote[recordId]?.version) || Number(asset.version) || 0,
        updatedAt: new Date().toISOString(),
        updatedBy: config.user || "مستخدم محلي",
        deviceId,
        deleted: operation === "delete",
      });
      const next = pending.filter((item) => item.recordId !== recordId);
      next.push(change);
      write(KEYS.pending, next);
      onStatus({ state: isOnline() ? "pending" : "offline", pending: next.length });
      onDataChange();
      return change;
    }

    function queueUpsert(asset) {
      return queue("upsert", asset);
    }

    function queueDelete(asset) {
      return queue("delete", asset);
    }

    async function request(payload, timeoutMs) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs || 18000);
      try {
        const response = await fetchImpl(getConfig().endpoint, {
          method: "POST",
          redirect: "follow",
          cache: "no-store",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("فشل الاتصال بخدمة المزامنة");
        const result = await response.json();
        if (!result || result.ok !== true) throw new Error(result?.error || "استجابة مزامنة غير صالحة");
        return result;
      } finally {
        clearTimeout(timer);
      }
    }

    async function sync(forceFull) {
      if (activeRequest) return activeRequest;
      if (!isConfigured()) {
        onStatus({ state: "setup", pending: pendingCount() });
        return { ok: false, setup: true };
      }
      if (!isOnline()) {
        onStatus({ state: "offline", pending: pendingCount() });
        return { ok: false, offline: true };
      }

      const config = getConfig();
      const pending = getPending();
      onStatus({ state: "syncing", pending: pending.length });
      activeRequest = request({
        action: "sync",
        apiVersion: 1,
        key: config.key,
        user: config.user,
        deviceId,
        since: forceFull ? "" : (storage.getItem(KEYS.cursor) || ""),
        changes: pending,
      }).then((result) => {
        const remote = getRemoteMap();
        for (const item of result.changes || []) {
          const change = normalizeChange(item);
          if (change.recordId) remote[change.recordId] = change;
        }
        for (const item of result.accepted || []) {
          const change = normalizeChange(item);
          if (change.recordId) remote[change.recordId] = change;
        }
        for (const item of result.conflicts || []) {
          if (item.server && item.server.recordId) {
            const change = normalizeChange(item.server);
            remote[change.recordId] = change;
          }
        }
        write(KEYS.remote, remote);

        const acceptedIds = new Set((result.accepted || []).map((item) => item.changeId));
        const conflictIds = new Set((result.conflicts || []).map((item) => item.changeId));
        write(KEYS.pending, pending.filter((item) => !acceptedIds.has(item.changeId) && !conflictIds.has(item.changeId)));
        if ((result.conflicts || []).length) {
          write(KEYS.conflicts, [...getConflicts(), ...result.conflicts].slice(-100));
        }
        if (result.serverTime) storage.setItem(KEYS.cursor, result.serverTime);
        const remaining = pendingCount();
        onStatus({
          state: (result.conflicts || []).length ? "conflict" : "synced",
          pending: remaining,
          conflicts: (result.conflicts || []).length,
          at: result.serverTime,
        });
        onDataChange();
        return result;
      }).catch((error) => {
        onStatus({ state: "error", pending: pendingCount(), error: error.message });
        throw error;
      }).finally(() => {
        activeRequest = null;
      });
      return activeRequest;
    }

    function clearConflicts() {
      write(KEYS.conflicts, []);
    }

    return {
      deviceId,
      stableRecordId,
      makeRecordId: () => makeId("asset"),
      getConfig,
      saveConfig,
      isConfigured,
      getPending,
      getConflicts,
      pendingCount,
      applyOverlay,
      queueUpsert,
      queueDelete,
      clearConflicts,
      sync,
    };
  }

  root.IrrigationSync = { createSyncManager, stableRecordId };
})(typeof window !== "undefined" ? window : globalThis);
