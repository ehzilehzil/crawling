import os
import asyncio
import time
import random
import utils

class Config:
    max = 30
    limit = 10
    current = 0

async def main():
    # print(os.getenv("TELEGRAM_CHAT_ID"))

    queue = asyncio.Queue(maxsize=Config.max)
    start = time.time()


    producers = [asyncio.create_task(producer(queue))]
    consumers = [asyncio.create_task(consumer(queue))]

    await asyncio.gather(*producers)
    await queue.join()

    for c in consumers:
        c.cancel()

    print(f"====== 전체 실행시간: {time.time() - start: .3f}")
    

async def producer(queue: asyncio.Queue):
    for i in range(100):
        data = f"data-{i}"
        await asyncio.sleep(random.uniform(0.1, 1.0))
        
        print(f"⬇️ {i}번째 데이터 인큐: {data}")
        await queue.put((i, data))
        

async def consumer(queue: asyncio.Queue):
    while True:
        if Config.current < Config.limit:
            Config.current += 1
            data = await queue.get()
            asyncio.create_task(task(queue, data))  # await 없이 호출
        await asyncio.sleep(0.1)


async def task(queue, data):

    (i, _) = data
    await asyncio.sleep(random.uniform(0.5, 1.0))

    print(f"✅ {i}번째 데이터 처리 완료: {data}")
    queue.task_done()
    Config.current -= 1


if __name__ == "__main__":
    asyncio.run(main())