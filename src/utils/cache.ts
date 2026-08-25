interface CacheItem {
    result: string;
    timestamp: number;
}

export class EscapeCache {
    private cache = new Map<string, CacheItem>();
    private maxSize = 1000;
    private ttl = 60000; // 1分钟

    get(key: string): string | null {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }
        
        return item.result;
    }

    set(key: string, value: string): void {
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) {
                this.cache.delete(firstKey);
            }
        }
        this.cache.set(key, { result: value, timestamp: Date.now() });
    }

    clear(): void {
        this.cache.clear();
    }

    getSize(): number {
        return this.cache.size;
    }
}