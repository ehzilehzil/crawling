import * as ez from "./utils.ts"
import * as tor from "./tor.ts"
import Papa from "papaparse"

const csv = await Deno.readTextFile(`../crawling_/juso.csv`)
const juso = Papa.parse(csv, { header: true, skipEmptyLines: true }).data
const idx_total = juso.length

const output: string = `ez_get_rs.ndjson`
const port_status: ("idle" | "busy")[] = ["idle", "idle", "idle", "idle", "idle", "idle", "idle", "idle", "idle", "idle"]

/** idx: 순서, port: 포트번호, x: 경로(문자열), y: 위도(문자열) */
async function task(idx: number, port: number, data: any) {
    try {

        if (idx % 10000 === 0) ez.sendMsgToTelegram(`${idx} 번째 통과`)

        const url = `https://svc-api.map.naver.com/v1/fusion-search/all?query=${data.addr + " 음식점"}&siteSort=relativity&petrolType=all&size=100&includes=address_polygon`
        const response = await tor.tor_fetch(port, url)
        const result = await response.json()

        const items = result?.items ?? []
        
        for (const x of items) {
            let r = { idx: data.id }
            Object.assign(r, x)
            await Deno.writeTextFile(`ez_get_rs-${idx / 100000 | 0}.ndjson`, JSON.stringify(r) + "\n", { append: true })
        }

        ez.log.info(`✅ ${idx}/${idx_total} 완료`)
    } catch(e) {
        ez.log.info(`⚠️ ${idx}/${idx_total} 실패`, e)
    }
}

async function main() {
    for (let [idx, data] of juso.entries()) {
        
        if (idx < 376_698) continue

        while (port_status.every((x) => x !== "idle")) await ez.sleep(300)

        const port = port_status.indexOf("idle")
        port_status[port] = "busy"
        task(idx, port, data).then(() => { port_status[port] = "idle" })

        ez.sleep(1400)
        
        // break
        // if (idx >= 10) break
    }
}

console.time("작업")
await main()
globalThis.addEventListener("unload", () => {
    console.timeEnd("작업")
})