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
const port_status = await ez.init_tor(ports);


// 몽고DB 관련 초기화
const client = new MongoClient(`mongodb://${ez.env.MONGODB_ID}:${ez.env.MONGODB_PW}@${ez.env.MONGODB_SERVER}:27017/marketmap?authSource=admin`);
await client.connect();
const db = client.db("marketmap");
const naver = db.collection("naver");
const nice = db.collection("nice_2507_2");

const global = { total_count: 0, count: 0 };
global.total_count = await nice.countDocuments({
    "naver_250906_done": { $exists: false },
});


// 함수실행
ez.sendMsgToTelegram(`${global.count}/${global.total_count} 번째 통과`);
console.time("task");
await main();
while (port_status.some((x) => x === "busy")) await ez.sleep(300);
console.timeEnd("task");
await client.close();
Deno.exit(0);


//////////////////////////////////////////////////////////


/**
 * 비동기 main 함수
 */
async function main() {

    while (true) {
        const nice_docs = await nice.find({
            "naver_250906_done": { $exists: false },
        }).limit(100).toArray();
        if (nice_docs.length === 0) break;

        for (const nice_doc of nice_docs) {
            while (port_status.every((x) => x === "busy")) await ez.sleep(300);

            const port = port_status.indexOf("idle");
            port_status[port] = "busy";
            task(port, { nice_id: nice_doc.src.nice_id, total: global.total_count, addr: nice_doc.src.addr, name: nice_doc.src.name }).then(() => {
                port_status[port] = "idle";
            });

            await ez.sleep(300);
        }
        
        // break;
    }
    return;
}


/**
 * port: 포트번호, data.i: task 번호, data.total: 전체작업 개수, data.addr: 주소
 * */
async function task(port: number, data: { nice_id: number, total: number, addr: string, name: string }) {
    try {

        for (const x of [data.name, "음식점"]) {
            const url = `https://svc-api.map.naver.com/v1/fusion-search/all?query=${data.addr + " " + x}&siteSort=relativity&petrolType=all&size=100&includes=address_polygon`;
            const response = await ez.tor_fetch(ports, port, url);
            const result = await response.json();

            const items = result?.items ?? [];
            
            for (const x of items) {
                const existing = await naver.findOne({ id: x.id });
                if (!existing) await naver.insertOne(x);
            }
            await ez.sleep(300);
        }

        await nice.findOneAndUpdate({ "src.nice_id": data.nice_id },{ $set: { "naver_250906_done": true }});
        ez.log.info(`✅ ${++global.count}/${global.total_count} ==> 나이스지니 ${data.nice_id} 완료`);

        if (global.count % 10000 === 0) ez.sendMsgToTelegram(`${global.count}/${global.total_count} 번째 통과`);
    } catch(e) {
        // await nice.findOneAndUpdate({ "src.nice_id": data.id },{ $set: { "status_0906": "done" }});
        ez.log.info(`⚠️ ${++global.count}/${global.total_count} ==> 나이스지니 ${data.nice_id} 실패`, e);
    }
}
