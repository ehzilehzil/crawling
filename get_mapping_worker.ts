/**
 * nice_test 컬렉션의 name 필드와 naver 컬렉션의 name 필드를 비교하여 각각의 id 를 매핑
 * 
 * nist_test 컬렉션의 도큐먼트 X 를 하나씩 로드
 * X 의 lat, lng 값에서 ±0.003 (약 ±300M에 해당) 에 해당하는 naver 컬렉션의 도큐먼트 Y 를 모두 찾아냄
 * X 의 name 필드와, Y 들의 name 필드를 영문/숫자를 한글로 치환, 공백 및 특수문자 제거하여 유사도 분석으로 매핑 시행
 * 만일 유사도가 0.6 미만이라면 Y 안에서는 X 와 매핑할 도큐먼트가 없는 것으로 간주
 */

import { MongoClient } from "npm:mongodb";
import * as ez from "./utils.ts";


// 몽고db 연결
const client = new MongoClient(`mongodb://${ez.env.MONGODB_ID}:${ez.env.MONGODB_PW}@${ez.env.MONGODB_SERVER}:27017/marketmap?authSource=admin`);
await client.connect();
const db = client.db("marketmap");
const naver = db.collection("naver");
const nice = db.collection("nice_2507");


// 워커 및 글로벌 변수 초기화
const workers: ("busy" | "idle")[] = [
    "idle", "idle", "idle", "idle", "idle", "idle"
];
const global = {
    total_count: 0,
    count: 1,
    task_done: false,
};
const filter = {
    $or: [
        { "status": { $exists: false } },
        { "status.state": "xxxxxxxxxxxxx" },
    ],
};


// 실행
console.time("task");
ez.sendMsgToTelegram(`${ import.meta.url.split("/").pop() } 시작`);
await main();

while (workers.some((w) => w === "busy")) await ez.sleep(300);
await client.close();
console.timeEnd("task");
Deno.exit(0);


/////////////////////////////////////////////////////////////


/**
 * 메인 루프
 */
async function main() {
    let i = 0;

    global.total_count = await nice.countDocuments(filter);


    while (!global.task_done) {
        while (workers.every((w) => w === "busy")) await ez.sleep(300);

        const worker = workers.indexOf("idle");
        workers[worker] = "busy";
        // await 없이 호출
        (async (worker: number) => {
            let from_catch = false;

            try {
                const nice_doc = await nice.findOneAndUpdate(filter, {
                    $set: {
                        "status.state": `worker_${worker}`,
                    }
                },{
                    returnDocument: "after",
                });
                if (!nice_doc) {
                    global.task_done = true;
                    return;
                }

                const naver_docs = await naver.find({
                    longitude: { $gte: nice_doc.src.lon - 0.003, $lte: nice_doc.src.lon + 0.003 },
                    latitude: { $gte: nice_doc.src.lat - 0.003, $lte: nice_doc.src.lat + 0.003 }
                }).toArray();
                const candidate = [];
                for (const naver_doc of naver_docs) {
                    const jaccard_index = jaccardSimilarity(nice_doc.src.store_nm.toString(), naver_doc.name.toString());
                    const cosine_index = cosineSimilarity(nice_doc.src.store_nm.toString(), naver_doc.name.toString());
                    candidate.push({
                        id: naver_doc.id,
                        name: naver_doc.name,
                        address: naver_doc.address,
                        roadAddress: naver_doc.roadAddress,
                        tel: naver_doc.tel,
                        latitude: naver_doc.latitude,
                        longitute: naver_doc.longitude,
                        jaccard_index,
                        cosine_index,
                    });

                    if (jaccard_index === 1 || cosine_index === 1) {
                        await nice.findOneAndUpdate({
                            "src.nice_id": nice_doc.src.nice_id,
                        }, {
                            $set: {
                                "status.state": "state_0",
                                naver: candidate[candidate.length - 1],
                            },
                        });

                        return;
                    }
                }

                candidate.sort((x, y) => x.cosine_index - y.cosine_index);
                if (candidate[candidate.length - 1].cosine_index >= 0.6) {
                    await nice.findOneAndUpdate({
                            "src.nice_id": nice_doc.src.nice_id,
                        }, {
                            $set: {
                                "status.state": "state_1",
                                naver: candidate[candidate.length - 1],
                            },
                        });
                    return;
                }

                candidate.sort((x, y) => x.jaccard_index - y.jaccard_index);
                if (candidate[candidate.length - 1].jaccard_index >= 0.6) {
                    await nice.findOneAndUpdate({
                            "src.nice_id": nice_doc.src.nice_id,
                        }, {
                            $set: {
                                "status.state": "state_1",
                                naver: candidate[candidate.length - 1],
                            },
                        });
                    return;
                }

                await nice.findOneAndUpdate({
                    "src.nice_id": nice_doc.src.nice_id,
                }, {
                    $set: {
                        "status.state": "notfound",
                    },
                });                

            } catch(e) {
                from_catch = true;
                ez.log.info(`⚠️==> ${global.count}/${global.total_count} 워커 에러 발생`, e);
            } finally {
                if (!from_catch) {
                    if (global.count % 10000 === 0) ez.sendMsgToTelegram(`${global.count}/${global.total_count} 완료`);
                    ez.log.info(`✅==> ${global.count++}/${global.total_count} 완료`);
                } 
                workers[worker] = "idle";
            }
        })(worker);

        // if (i++ >= 10) break;
    }
}


/**
 * 아래는 copilot 구현 함수를 적당히 수정하였음
 */

// 전처리 함수
function preprocess(str: string): string[] {
    // 특수문자 제거
    let cleaned = str.replace(/[^0-9a-zA-Z가-힣]/g, "");

    // 숫자 치환
    const numMap: Record<string, string> = {
        "0": "영", "1": "일", "2": "이", "3": "삼", "4": "사",
        "5": "오", "6": "육", "7": "칠", "8": "팔", "9": "구"
    };
    cleaned = cleaned.replace(/[0-9]/g, (d) => numMap[d] || d);

    // 알파벳 치환
    const alphaMap: Record<string, string> = {
        a: "에이", b: "비", c: "씨", d: "디", e: "이", f: "에프",
        g: "지", h: "에이치", i: "아이", j: "제이", k: "케이",
        l: "엘", m: "엠", n: "엔", o: "오", p: "피", q: "큐",
        r: "알", s: "에스", t: "티", u: "유", v: "브이",
        w: "더블유", x: "엑스", y: "와이", z: "제트"
    };
    cleaned = cleaned.replace(/[a-zA-Z]/g, (ch) => {
        const lower = ch.toLowerCase();
        return alphaMap[lower] || ch;
    });

    // 한 글자씩 배열로
    return [...cleaned];
}

// 자카드 유사도
function jaccardSimilarity(a: string, b: string): number {
    if (!a || !b) return 0;

    const arrA = preprocess(a);
    const arrB = preprocess(b);

    const setA = new Set(arrA);
    const setB = new Set(arrB);

    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);

    return Number((union.size === 0 ? 0 : intersection.size / union.size).toFixed(2));
}

// 코사인 유사도
function cosineSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;

  const arrA = preprocess(a);
  const arrB = preprocess(b);

  // 빈도 맵 생성
  const freqMap: Record<string, [number, number]> = {};

    arrA.forEach(ch => {
        if (!freqMap[ch]) freqMap[ch] = [0, 0];
        freqMap[ch][0] += 1;
    });

    arrB.forEach(ch => {
        if (!freqMap[ch]) freqMap[ch] = [0, 0];
        freqMap[ch][1] += 1;
    });

    // 내적, 벡터 크기 계산
    let dot = 0, magA = 0, magB = 0;
    for (const [f1, f2] of Object.values(freqMap)) {
        dot += f1 * f2;
        magA += f1 * f1;
        magB += f2 * f2;
    }

    return Number((magA === 0 || magB === 0 ? 0 : dot / (Math.sqrt(magA) * Math.sqrt(magB))).toFixed(2));
}

// 테스트
console.log("자카드:", jaccardSimilarity("abc123", "a1c"));
console.log("코사인:", cosineSimilarity("abc123", "a1c"));
