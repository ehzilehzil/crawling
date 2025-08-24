import { Logger } from "jsr:@deno-library/logger"

/** log 표시 함수 */
export const log = new Logger()


/** ms 밀리초만큼 지연 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}


/** 텔레그램으로 메시지 송신 */
export async function sendMsgToTelegram(msg: string, token: string, chatId: string) {
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
