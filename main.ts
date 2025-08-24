import * as ez from "./utils.ts"
import { AsyncQueue } from "./async_queue.ts"
import { Logger } from "jsr:@deno-library/logger"

const log = new Logger()

const config = {
    producer: { limit: 10, count: 0, done: false },
    consumer: { limit: 40, count: 0, done: false },
}

async function producer(queue: AsyncQueue<any>) {
    const n = g(100)

    loop:
    while (true) {
        if (config.producer.count < config.producer.limit) {
            const {value, done} = n.next()
            if (done) break loop

            config.producer.count += 1
            ;(async (queue: AsyncQueue<any>, data: any) => {
                // 병렬 처리 코드
                await ez.sleep(randomIntBetween(500, 1_500))
                log.info(`⬇️ ${data} 인큐`)

                await queue.put(data)

            
            })(queue, value).then((_) => {config.producer.count -= 1})
        }

        await ez.sleep(100)
    }
    config.producer.done = true
}


async function consumer(queue: AsyncQueue<any>) {
    loop:
    while (true) {
        if (config.consumer.count < config.consumer.limit) {
            if (config.producer.done && queue.qsize() === 0) break loop

            const data = await queue.get()
            config.consumer.count += 1
            ;(async (queue: AsyncQueue<any>, data: any) => {
                // 병렬 처리 코드
                await ez.sleep(randomIntBetween(1_000, 2_000))
                log.info(`✅ ${data} 처리`)



            })(queue, data).then((_) => {config.consumer.count -= 1})
        }
        await ez.sleep(100)
    }
    config.consumer.done = true
}



function randomIntBetween(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}
function* g(n: number) {
    for (let i = 0; i < n; i++) yield i
}
const queue = new AsyncQueue()

console.time("start")
globalThis.addEventListener("unload", () => {
    console.timeEnd("start")
})


const p = producer(queue)
const c = consumer(queue)
await Promise.allSettled([p, c])
