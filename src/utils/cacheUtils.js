/**
 * Simple in-memory cache with TTL
 */
const cache = new Map();

export const cacheConfig = {
    USER_PROFILE_TTL: 1000 * 60 * 5, // 5 minutes
    DASHBOARD_DATA_TTL: 1000 * 60 * 2, // 2 minutes
    STATIC_TIERS_TTL: 1000 * 60 * 60, // 1 hour
};

export const getCachedData = (key) => {
    const item = cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
        cache.delete(key);
        return null;
    }

    return item.data;
};

export const setCachedData = (key, data, ttl = 60000) => {
    cache.set(key, {
        data,
        expiry: Date.now() + ttl
    });
};

export const clearCache = (pattern) => {
    if (!pattern) {
        cache.clear();
        return;
    }
    for (const key of cache.keys()) {
        if (key.includes(pattern)) {
            cache.delete(key);
        }
    }
};