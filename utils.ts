import { Logger } from "jsr:@deno-library/logger"
import { config } from "https://deno.land/x/dotenv/mod.ts"

/** 각종 환경변수 */
export const env = config({ path: "../_env/.env" });

/** log 표시 함수 */
export const log = new Logger()


/** ms 밀리초만큼 지연 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}


/** 텔레그램으로 메시지 송신 */
export async function sendMsgToTelegram(msg: string) {
    const token = env.TELEGRAM_TOKEN
    const chatId = env.TELEGRAM_CHAT_ID

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            chat_id: chatId,
            text: msg,
        }),
    });
    const result = await response.json();
    console.log(result);
}


/** min ~ max 까지 난수 생성 */
export function rand_between(min: number, max: number) {
    return Math.random() * (max - min) + min
}

if (import.meta.main) {
    sendMsgToTelegram("안녕")
}

/** 토르 인스턴스 생성, port 번호를 담은 배열을 인수로 전달, ports_status 리턴 */
export async function init_tor(ports: number[]): Promise<("busy" | "idle")[]> {
    try {
        const cmd = ports.map((x) => {
            return `start /b tor.exe --SocksPort ${x} --ControlPort ${x + 1} --MaxCircuitDirtiness 90 --DataDirectory ..\\_env\\tor-${x}`;
        }).join(" & ");
        const tor_command = new Deno.Command("cmd.exe", {
            args: ["/c", "start", "cmd", "/k", cmd],
        });
        const tor_proc = tor_command.spawn();
        await tor_proc.status;
    } catch(e) {
        log.info(`토르 초기화 오류`);
        Deno.exit(1);
    }
    return Array.from({ length: ports.length }, (_) => "idle");
}

/**
 * 토르 네트워크를 사용하는 fetch 함수, port 는 토르 인스턴스 번호로 0 ~ 9 숫자
 */
export async function tor_fetch(ports: number[], port: number, url: string, obj: object={}) {
    const client = Deno.createHttpClient({ proxy: { url: `socks5://127.0.0.1:${ports[port]}` } })
    return await fetch(url, { client, ...obj })
}