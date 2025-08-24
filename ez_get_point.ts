/**
 * 구글맵에서 아래 사항 확인
 * 최북단 위도: 38.62 (강원도 고성군 최북단 보다 위)
 * 최동단 경도: 131.88 (독도 보다 오른쪽)
 * 최남단 위도: 33.11 (제주도 마라도 보다 아래)
 * 최서단 경도: 124.60 (백령도 보다 왼쪽)
 */

/**
 * 위도, 경도를 0.01 씩 움직이며, 해당 위치에 주소가 검색되는지 확인
 * 카카오 맵 비공인 API 사용, 해당 위치 주소 또는 null 을 기록, (null 이라면 주소가 확인 안되는 지역)
 * 나중에 주소 위치가 확인된 좌표로 식당 검색 예정
 */

import * as ez from "./utils.ts"
import { coordconv, COORD_CODE } from "./coordconv.js"
import * as tor from "./tor.ts"
import { log } from "node:console";

const output: string = `ez_get_point.ndjson`
const port_status: ("idle" | "busy")[] = ["idle", "idle", "idle", "idle", "idle"]

let src: [string, string][] = []
for (let y = 3311; y <= 3862; y++) {
    for (let x = 12460; x <= 13188; x++) {
        src.push([(x / 100).toFixed(2) , (y / 100).toFixed(2)])
    }
}
const idx_total = src.length
// ez.log.info(src)
// ez.log.info(src.length)

/** idx: 순서, port: 포트번호, x: 경로(문자열), y: 위도(문자열) */
async function task(idx: number, port: number, x: string, y: string) {
    try {
        const wcongnamul = coordconv(+x, +y, COORD_CODE.WGS84, COORD_CODE.WCONGNAMUL)
        const url = `https://map.kakao.com/etc/areaAddressInfo.json?output=JSON&inputCoordSystem=WCONGNAMUL&outputCoordSystem=WCONGNAMUL&x=${wcongnamul[0]}&y=${wcongnamul[1]}`
        const response = await tor.tor_fetch(port, url)
        const result = await response.json()

        let r = { idx: idx, wgsx: x, wgsy: y, wcongnamul: (result.x).toString(), wcongnamuly: (result.y).toString(), region: result.region }

        await Deno.writeTextFile(output, JSON.stringify(r) + "\n", { append: true })

        ez.log.info(`✅ ${idx}/${idx_total} 완료`)
    } catch(e) {
        ez.log.info(`⚠️ ${idx}/${idx_total} 실패`)
    }
}

async function main() {
    for (let [idx, [x, y]] of src.entries()) {
        while (port_status.every((x) => x !== "idle")) await ez.sleep(300)

        const port = port_status.indexOf("idle")
        
        port_status[port] = "busy"
        task(idx, port, x, y).then(() => { port_status[port] = "idle" })

        ez.sleep(100)
        

        // if (idx >= 10) break
    }
}

console.time("작업")
await main()
globalThis.addEventListener("unload", () => {
    console.timeEnd("작업")
})