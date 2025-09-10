/**
 * 10개 토르 인스턴스를 사용, 네이버 지도 비공식 API 사용하여, 주소 + "음식점" 및 주소 + "가게명" 키워드로 검색 시행
 * 검색 결과를 marketmap 데이터베이스, naver 컬렉션에, id 중복없이 기록
 */

import { error } from "node:console";
import * as ez from "./utils.ts";
import { AnyBulkWriteOperation, Document, Filter, MongoClient, UpdateFilter } from "npm:mongodb";


// 토르 네트워크 관련 초기화
const ports = [
    9050, 9060, 9070
];
// const ports_status = await ez.init_tor(ports);  // 수동실행
const ports_status: ("idle" | "busy")[] = [ "idle", "idle", "idle" ];


// 몽고DB 관련 초기화
const client = new MongoClient(`${ez.env.MONGODB_ATLAS_URI}`);
await client.connect();
const db = client.db("marketmap");
const naver = db.collection("naver");
const nice = db.collection("nice_remained");

const global = { total_count: 0, count: 0, all_task_done: false };
const filter: Filter<Document> = {
    $or: [
        { "naver_api.status": { $exists: false } },
        { "naver_api.status": "error", "naver_api.tried_count": { $lt: 5 }, "naver_api.expires_at": { $lt: new Date() } },
        { "naver_api.status": "processing", "naver_api.expires_at": { $lt: new Date() } },
    ],
};
global.total_count = await nice.countDocuments(filter);


// 함수실행
ez.sendMsgToTelegram(`${ import.meta.url.split("/").pop() } 시작`);
console.time("task");
await main();

while (ports_status.some((x) => x === "busy")) await ez.sleep(300);
console.timeEnd("task");
ez.sendMsgToTelegram(`${ import.meta.url.split("/").pop() } 종료`);
await client.close();
Deno.exit(0);


//////////////////////////////////////////////////////////


/**
 * 비동기 main 함수, 워커 관리
 */
async function main() {

    while (!global.all_task_done) {
        while (ports_status.every((x) => x === "busy")) await ez.sleep(300);

        const port = ports_status.indexOf("idle");
        ports_status[port] = "busy";
        task(port)
            .then((_) => {
                global.count += 1;
                const msg = `✅ ${global.count}/${global.total_count} 개 작업 완료`;
                ez.log.info(msg);
                if (global.count % 10_000 === 0) ez.sendMsgToTelegram(msg);
            })
            .catch(({ e }) => {
                ez.log.info(`⚠️ 작업 처리에 문제 발생 ====>`, e);
            }).
            finally(() => {
                ports_status[port] = "idle";
            });

        const check_docs = await nice.findOne(filter);
        if (!check_docs) global.all_task_done = true;
        await ez.sleep(300);

        // break;
    }
}

/**
 * 비동기 task 함수, port: api 호출 위한 포트 인덱스 번호, c: 현재까지 완료한 작업 개수
 * */
async function task(port: number): Promise<{ e: Error | undefined }> {
    let _id;

    let task_expires = false;
    const timer = setTimeout(() => {
        task_expires = true;
    }, 180_000);    // 180초(3분)

    try {
        const doc = await nice.findOneAndUpdate(filter, {
            $set: { "naver_api.status": "processing", "naver_api.expires_at": new Date(Date.now() + 300_000) },  // 300초(5분)
            $inc: { "naver_api.tried_count": 1 },
        }, {
            returnDocument: "after",
        });
        if(!doc) throw new Error(`더 이상 처리할 문서가 없음`);

        _id = doc._id;

        const a = new Set<Document>();
        const b: AnyBulkWriteOperation<Document>[] = [];
        for (const addr of [doc.src.old_addr, doc.src_new_addr]) {
            for (const target of ["음식점", doc.src.store_nm]) {
                if (task_expires) throw new Error(`시간 초과`);

                const url = `https://svc-api.map.naver.com/v1/fusion-search/all?query=${addr + " " + target}&siteSort=relativity&petrolType=all&size=100&includes=address_polygon`;
                const res = await ez.tor_fetch(ports, port, url);
                const data = await res.json();
                const items = data?.items ?? [];

                for (const x of items) {
                    if (!a.has(x.id)) {
                        a.add(x.id);
                        b.push({
                            insertOne: {
                                document: x
                            },
                        });
                    }
                }

                await ez.sleep(300);
            }
        }
        
        if (task_expires) throw new Error(`시간 초과`);
        await naver.bulkWrite(b, { ordered: false }).catch(() => {});   // 중복 에러 발생하면 무시... (즉, 네이버 id 중복인 경우 삽입 안됨)

        await nice.findOneAndUpdate({
            "_id": doc._id, 
        }, {
            $set: { "naver_api.status": "done" },
        }, {
            projection: {},
        });

        return { e: undefined };

    } catch(e) {
        await nice.findOneAndUpdate({
            "_id": _id, 
        }, {
            $set: { "naver_api.status": "error" },
        }, {
            projection: {},
        });

        throw { e: (e as Error) };
    } finally {
        clearTimeout(timer);
    }
}
