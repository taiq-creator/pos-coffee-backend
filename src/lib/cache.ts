type CacheItem<T> = {
  value: T;
  expiry: number;
};

class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();
  private defaultTTL: number = 60 * 60 * 1000; // 1 hour in milliseconds

  /**
   * Set a value in the cache with an optional TTL in milliseconds.
   */
  set<T>(key: string, value: T, ttlMs: number = this.defaultTTL): void {
    const expiry = Date.now() + ttlMs;
    this.cache.set(key, { value, expiry });
  }

  /**
   * Get a value from the cache. Returns null if expired or not found.
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value as T;
  }

  /**
   * Delete a specific key from the cache.
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache keys that start with or contain a specific pattern.
   * E.g., clearPattern('products:') will delete all product lists.
   */
  clearPattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern) || key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear the entire cache.
   */
  clearAll(): void {
    this.cache.clear();
  }
}

export const cacheManager = new MemoryCache();
