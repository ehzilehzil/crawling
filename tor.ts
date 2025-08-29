import { log } from "node:console";
import * as ez from "./utils.ts"

const ports = [
    9050, 9060, 9070, 9080, 9090, 9100, 9110, 9120, 9130, 9140
]
// tor.exe 환경설정 필수
const cmd = ports.map((x) => {
    return `start /b tor.exe --SocksPort ${x} --ControlPort ${x + 1} --MaxCircuitDirtiness 90 --DataDirectory tor-${x}`
}).join(" & ")
console.log(cmd)
const tor_command = new Deno.Command("cmd.exe", {
    args: ["/c", "start", "cmd", "/c", cmd],
})
const tor_proc = tor_command.spawn()

/** i: 포트번호 0~4, url: fetch 주소, obj: fetch 옵션객체  */
export async function tor_fetch(i: number, url: string, obj: object={}) {
    const client = Deno.createHttpClient({ proxy: { url: `socks5://127.0.0.1:${ports[i]}` } })
    return await fetch(url, { client, ...obj })
}


///////////////////////////////////////

async function test() {
    console.time("test")
    for (let i = 0; i < 100; i++) {
        let msg = []
        for (let j = 0; j < ports.length; j++) {
            const client = Deno.createHttpClient({ proxy: { url: `socks5://127.0.0.1:${ports[j]}` } })
            const res = await fetch("https://api.ipify.org", { client })
            const html = await res.text()
            msg.push(html)
        }
        ez.log.info(msg.join(", "))
    }
    console.timeEnd("test")
}

if (import.meta.main) {
    await test()
}
