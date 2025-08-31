/**
 * 10개 토르 인스턴스를 사용, 네이버 지도 비공식 API 사용하여, 주소 + "음식점" 키워드로 검색 시행
 * 검색 결과를 marketmap 데이터베이스, naver 컬렉션에, id 중복없이 기록
 */

import * as ez from "./utils.ts";
import { MongoClient } from "npm:mongodb";


// 토르 네트워크 관련 초기화
const ports = [
    9050, 9060, 9070, 9080, 9090, 9100, 9110, 9120, 9130, 9140, 9150, 9160, 9170, 9180, 9190
];
const port_status: ("idle" | "busy")[] = Array.from({ length: ports.length }, (_) => "idle");
const cmd = ports.map((x) => {
    return `start /b tor.exe --SocksPort ${x} --ControlPort ${x + 1} --MaxCircuitDirtiness 90 --DataDirectory z:\\_dev\\crawling_\\tor-${x}`;
}).join(" & ");
const tor_command = new Deno.Command("cmd.exe", {
    args: ["/c", "start", "cmd", "/k", cmd],
});
const tor_proc = tor_command.spawn();
await tor_proc.status;


// 몽고DB 관련 초기화
const client = new MongoClient("mongodb://127.0.0.1:27017");
await client.connect();
const db = client.db("marketmap");
const naver_2502 = db.collection("naver_2502");
const nice_2502 = db.collection("nice_2502");


// 함수실행
console.time("작업");
// globalThis.addEventListener("unload", async () => {
//     console.timeEnd("작업");
//     await client.close();
// });

await main();
while (port_status.some((x) => x === "busy")) await ez.sleep(300);
console.timeEnd("작업");
await client.close();


/**
 * 토르 네트워크를 사용하는 fetch 함수, port 는 토르 인스턴스 번호로 0 ~ 9 숫자
 */
async function tor_fetch(port: number, url: string, obj: object={}) {
    const client = Deno.createHttpClient({ proxy: { url: `socks5://127.0.0.1:${ports[port]}` } })
    return await fetch(url, { client, ...obj })
}

/**
 * port: 포트번호, data.i: task 번호, data.total: 전체작업 개수, data.addr: 주소
 * */
async function task(port: number, data: { id: string, total: number, addr: string, name: string }) {
    try {
        if (data.i !== undefined) {
            if (data.i % 10000 === 0) ez.sendMsgToTelegram(`${data.id} 번째 통과`);
        }

        const url = `https://svc-api.map.naver.com/v1/fusion-search/all?query=${data.addr + " " + data.name}&siteSort=relativity&petrolType=all&size=100&includes=address_polygon`;
        const response = await tor_fetch(port, url);
        const result = await response.json();

        const items = result?.items ?? [];
        
        for (const x of items) {
            const existing = await naver_2502.findOne({ id: x.id });
            if (!existing) await naver_2502.insertOne(x);
        }

        const doc = await nice_2502.findOne({ id: data.id });
        if (doc?.tried_count) {
            await nice_2502.updateOne({ id: data.id }, { $set: { success: true, locked: false }, $inc: { tried_count: 1 } });
        } else {
            await nice_2502.updateOne({ id: data.id }, { $set: { success: true, locked: false, tried_count: 1 } });
        }

        ez.log.info(`✅ ${data.id}/${data.total} 완료`)
    } catch(e) {
        const doc = await nice_2502.findOne({ id: data.id });
        if (doc?.tried_count) {
            await nice_2502.updateOne({ id: data.id }, { $set: { success: false, locked: false }, $inc: { tried_count: 1 } });
        } else {
            await nice_2502.updateOne({ id: data.id }, { $set: { success: false, locked: false, tried_count: 1 } });
        }

        ez.log.info(`⚠️ ${data.id}/${data.total} 실패`, e)
    }
}

/**
 * 비동기 main 함수
 */
async function main() {
    const total = await nice_2502.countDocuments({ success: { $exists: false } });

    while (true) {
        const nice_doc = await nice_2502.findOne({
            $and: [
                {
                    $or: [
                        { success: { $exists: false } },
                        { $and: [
                            { success: false },
                            { tried_count: { $lte: 5 } },
                        ] }
                    ],
                },
                {
                    $or: [
                        { locked: { $exists: false } },
                        { locked: false, }
                    ],
                }
            ]
            
        });
        if (!nice_doc) break;
        await nice_2502.updateOne({ id: nice_doc.id }, { $set: { locked: true }});
        
        while (port_status.every((x) => x === "busy")) await ez.sleep(300);

        const port = port_status.indexOf("idle");
        port_status[port] = "busy";
        task(port, { id: nice_doc.id, total: total, addr: nice_doc.addr, name: nice_doc.name }).then(() => {
            port_status[port] = "idle";
        });

        ez.sleep(1400);
        
        // break;
    }
}