/**
 * 다른 컬렉션으로 생성한 naver 음식점 점포 데이터를 원래의 컬렉션으로 병합하고자 함
 * 병합은 복사 방식이되, 이미 "id" 가 있는 경우는 복사를 하지 않음 (중복 회피)
 */

import { MongoClient } from "npm:mongodb";
import * as ez from "./utils.ts";

const client = new MongoClient(`mongodb://${ez.env.MONGODB_ID}:${ez.env.MONGODB_PW}@${ez.env.MONGODB_SERVER}:27017/mydb?authSource=admin`);
await client.connect();
const db = client.db("marketmap");
const tar = db.collection("naver");
const src = db.collection("naver_2502");

const current_file_name = import.meta.url.split("/").pop();

console.time("task");
const total_count = await src.countDocuments({ 
    $or: [
        { moved: { $exists: false } },
        { moved: "error" },
    ],
});
let i = 1;

while (true) {
    let doc;
    try {
        doc = await src.findOneAndUpdate({
            $or: [
                { moved: { $exists: false } },
                { moved: "error" },
            ],
        }, {
            $set: { moved: "processing" },
        }, {
            returnDocument: "after",
        });
        if (!doc) break;

        const exist = await tar.findOne({ id: doc.id });
        if (!exist) {
            const { moved, ...rest } = doc;
            tar.insertOne(rest);
            ez.log.info(`${i}/${total_count} : ${doc.id} 이동 완료`);
        } else {
            ez.log.info(`${i}/${total_count} : ${doc.id} 중복으로 제외`);
        }
        await src.findOneAndUpdate({
            id: doc.id,
        }, {
            $set: { moved: "done" },
        }, {
            returnDocument: "after",
        });

        
    } catch(e) {
        const msg = `${i}/${total_count} : ${doc?.id} 뭔가 에러 발생`;
        if (doc?.id) {
            await src.findOneAndUpdate({
                id: doc?.id,
            }, {
                $set: { moved: "error" },
            }, {
                returnDocument: "after",
            });
        }
        ez.log.info(msg);
        await Deno.writeTextFile(`${current_file_name}.errlog.txt`, msg + "\n", { append: true });
    }
    i++;

    // break;
}

console.timeEnd("task");
await client.close();