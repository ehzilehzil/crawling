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