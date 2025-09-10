/**
 * v월드 지오코드 사용
 */

import * as ez from "./utils.ts";
import { MongoClient } from "npm:mongodb";
import { config } from "https://deno.land/x/dotenv/mod.ts";

const env = config({ path: "../_env/.env" });

// 토르 네트워크 관련 초기화
const ports = [
    9050, 9060, 9070, 9080, 9090
];
const port_status: ("idle" | "busy")[] = Array.from({ length: ports.length }, (_) => "idle");
// const cmd = ports.map((x) => {
//     return `start /b tor.exe --SocksPort ${x} --ControlPort ${x + 1} --MaxCircuitDirtiness 90 --DataDirectory ..\\_env\\tor-${x}`;
// }).join(" & ");
// const tor_command = new Deno.Command("cmd.exe", {
//     args: ["/c", "start", "cmd", "/k", cmd],
// });
// const tor_proc = tor_command.spawn();
// await tor_proc.status;

/**
 * 토르 네트워크를 사용하는 fetch 함수, port 는 토르 인스턴스 번호로 0 ~ 9 숫자
 */
async function tor_fetch(port: number, url: string, obj: object={}) {
    const client = Deno.createHttpClient({ proxy: { url: `socks5://127.0.0.1:${ports[port]}` } })
    return await fetch(url, { client, ...obj })
}

const client = new MongoClient(`mongodb://${ez.env.MONGODB_ID}:${ez.env.MONGODB_PW}@${ez.env.MONGODB_SERVER}:27017/marketmap?authSource=admin`);
await client.connect();
const db = client.db("marketmap");
// const naver = db.collection("naver");
const nice = db.collection("nice_2507");
const nice2 = db.collection("nice_2507_2");

const global = {
    total_count: 0,
    count: 0,
};

global.total_count = await nice.countDocuments({
    "status.state": "notfound",
    "temp": { $exists: false },
});

console.time("작업");
await main();
while (port_status.some((x) => x === "busy")) await ez.sleep(100);
console.timeEnd("작업");
await client.close();
Deno.exit(0);

/////////////////////////////////////

async function main() {
    while (true) {
        const nice_docs = await nice.find({
            "status.state": "notfound",
            "temp": { $exists: false },
        }).limit(200).toArray();
        if (!nice_docs) break;

        for (const doc of nice_docs) {
            while (port_status.every((x) => x === "busy")) await ez.sleep(100);

            const port = port_status.indexOf("idle");
            port_status[port] = "busy";
            const data = {
                nice_id: doc.src.nice_id,
                store_nm: doc.src.store_nm,
                lon: doc.src.lon,
                lat: doc.src.lat,
                bisno: doc.src.bisno,
            };
            task(port, data).then(() => {
                port_status[port] = "idle";
            });

            ez.sleep(100);
        }



        // break;
    }
}

async function task(port: number, data: { nice_id: string, store_nm: string, lon: number, lat: number, bisno: number; }) {
    try {
        // const url = `https://api.vworld.kr/req/address?service=address&request=getAddress&version=2.0&crs=epsg:4326&point=${data.lon},${data.lat}&type=both&zipcode=true&simple=true&key=${ez.env.VWORLD_KEY}`;
        const url = `https://api.vworld.kr/req/address?service=address&request=getAddress&version=2.0&crs=epsg:4326&point=${data.lon},${data.lat}&type=PARCEL&zipcode=true&simple=true&format=json&key=${ez.env.VWORLD_KEY}`;
        // console.log(url);
        const response = await fetch(url);
        const result = await response.json();

        const addr = result?.response?.result?.[0]?.text ?? "";
        // console.log(addr);

        await nice2.insertOne({ src: {
            nice_id: data.nice_id,
            bisno: data.bisno,
            store_nm: data.store_nm,
            lon: data.lon,
            lat: data.lat,
            addr: addr,
        } });
        await nice.findOneAndUpdate({
            "src.nice_id": data.nice_id,
        }, {
            $set: {
                "temp": "250906",
            },
        });
        ez.log.info(`✅ ${global.count++}/${global.total_count} ==> 나이스지니 ${data.nice_id} 완료`);
        if (global.count % 10000 === 0) ez.sendMsgToTelegram(`${global.count}/${global.total_count} 통과`);
    } catch(e) {
        ez.log.info(`⚠️ 나이스지니 ${data.nice_id} 실패`, e);
    }
}