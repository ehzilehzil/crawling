/**
 * nice_test 컬렉션의 name 필드와 naver 컬렉션의 name 필드를 비교하여 각각의 id 를 매핑
 * 
 * nist_test 컬렉션의 도큐먼트 X 를 하나씩 로드
 * X 의 lat, lng 값에서 ±0.0005 (약 ±50M에 해당) 에 해당하는 naver 컬렉션의 도큐먼트 Y 를 모두 찾아냄
 * X 의 name 필드와, Y 들의 name 필드를 공백 및 특수문자 제거한 2-gram 자카드 유사도 분석으로 가장 높은 값 매핑
 * 만일 자카드 유사도가 0.6 미만이라면 Y 안에서는 X 와 매핑할 도큐먼트가 없는 것으로 간주
 */

import { MongoClient } from "npm:mongodb";
import * as ez from "./utils.ts";

const client = new MongoClient(`mongodb://${ez.env.MONGODB_ID}}:${ez.env.MONGODB_PW}@${ez.env.MONGODB_SERVER}:27017`);
await client.connect();
const db = client.db("marketmap");
const naver = db.collection("naver");
const nice = db.collection("nice_xxxx");

console.time("task");
await main();
globalThis.addEventListener("unload", async (_) => {
    console.timeEnd("task");
    await client.close();
});


/**
 * 메인 루프
 */
async function main() {
    const nice_total_index_count = await nice.countDocuments({});

    while (true) {
        const five_minute_ago = new Date(Date.now() - 5 * 60 * 1_000);
        const nice_doc = await nice.findOneAndUpdate({
            $or: [
                { status: { $exists: false } },
                { status: "error", tried_count: { $lt: 5 } },
                { status: "processing", start_at: { $lt: five_minute_ago } },
            ],
        }, {
            $set: {
                status: "processing",
                start_at: new Date(),
            },
            $inc: {
                tried_count: 1,
            }
        }, {
            returnDocument: "after",
        });
        if (!nice_doc) break;

        const { index: nice_index, name: nice_name, lon: nice_x, lat: nice_y } = nice_doc.src;

        const naver_doc = await naver.find({
            longitude: { $gte: nice_x - 0.0005, $lte: nice_x + 0.0005 },
            latitude: { $gte: nice_y - 0.0005, $lte: nice_y + 0.0005 },
        });

        const candidate = await naver_doc.toArray();
        for (const [i, { name: naver_name }] of candidate.entries()) {
            // console.log(naver_id, naver_name, naver_x, naver_y);
            candidate[i].jaccard = j(nice_name.toString(), naver_name.toString());
        }   

        const result = (() => {
            if (candidate.length === 0) return {};
            const { id: naver_id, name: naver_name, jaccard: jaccard } = candidate.sort((x, y) => -(x.jaccard - y.jaccard))[0];

            return (jaccard < 0.6) ? {} : { naver_id, naver_name };
        })();

        const _ = await nice.findOneAndUpdate({
            _id: nice_doc._id,
        }, {
            $set: {
                result: result,
                status: "done",
            },
        }, {
            returnDocument: "after",
        });

        ez.log.info(`${nice_index}/${nice_total_index_count} : ${JSON.stringify(result)}`);

        // break;
    }
}


/**
 * 공백/특수문자 제거 + 영문 소문자 변환한 뒤, x, y 의 2-gram 자카드 유사도 리턴
 * 만일 변환 후 x, y 둘중의 하나가 한글자인 경우 2-gram 적용 안하고 유사도 리턴
 * 만일 변환 후 x, y 둘중의 하나가 글자가 없는 경우 유사도 0 리턴
 */
function j(x: string, y: string): number {
    const x_a = x.replace(/[^a-zA-Z0-9가-힣]/g, "").toLowerCase();
    const y_a = y.replace(/[^a-zA-Z0-9가-힣]/g, "").toLowerCase();

    if (x_a.length === 0 || y_a.length === 0) return 0;

    function f(text: string): Set<string> {
        const grams = new Set<string>();
        for (let i = 0; i < text.length - 1; i++) grams.add(text.slice(i, i + 2));
        return grams;
    }

    let x_set: Set<string>;
    let y_set: Set<string>;
    if (x_a.length === 1 || y_a.length === 1) {
        x_set = new Set(x_a.split(""));
        y_set = new Set(y_a.split(""));
    } else {
        x_set = f(x_a);
        y_set = f(y_a);
    }

    const intersection = new Set([...x_set].filter((e) => y_set.has(e)));
    const union = new Set([...x_set, ...y_set]);

    return union.size === 0 ? 0 : intersection.size / union.size;
}

function test() {
    console.log(j("안녕", "녕안"));
    console.log(j("한0", "한~"));
}