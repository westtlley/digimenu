function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeChannelCode(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

export function deepMergeEntityData(baseValue, patchValue) {
  if (!isPlainObject(baseValue) || !isPlainObject(patchValue)) {
    if (patchValue === undefined) {
      return baseValue;
    }
    return patchValue;
  }

  const merged = { ...baseValue };

  Object.entries(patchValue).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    const currentValue = merged[key];

    if (isPlainObject(currentValue) && isPlainObject(value)) {
      merged[key] = deepMergeEntityData(currentValue, value);
      return;
    }

    merged[key] = value;
  });

  return merged;
}

export function normalizeDishChannels(entity) {
  if (!entity || typeof entity !== 'object') {
    return entity;
  }

  const channels = isPlainObject(entity.channels) ? entity.channels : {};
  const pdv = isPlainObject(channels.pdv) ? channels.pdv : {};

  return {
    ...entity,
    channels: {
      ...channels,
      pdv: {
        ...pdv,
        enabled: typeof pdv.enabled === 'boolean' ? pdv.enabled : true,
        code: normalizeChannelCode(pdv.code),
      },
    },
  };
}

export function normalizeEntityChannelDefaults(entityType, entity) {
  const entityNorm = String(entityType || '').trim().toLowerCase();
  if (entityNorm === 'dish') {
    return normalizeDishChannels(entity);
  }
  return entity;
}
