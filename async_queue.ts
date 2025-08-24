// copilot 이 구현

export class AsyncQueue<T> {
    private queue: T[] = []
    private resolvers: ((value: T) => void)[] = []

    async put(item: T) {
        if (this.resolvers.length > 0) {
            const resolve = this.resolvers.shift()
            resolve?.(item)
        } else {
            this.queue.push(item)
        }
    }

    async get(): Promise<T> {
        if (this.queue.length > 0) {
            return this.queue.shift()!
        }

        return new Promise<T>(resolve => {
            this.resolvers.push(resolve)
        })
    }

    qsize(): number {
        return this.queue.length
    }
}
