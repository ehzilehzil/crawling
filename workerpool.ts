import * as ez from "./utils.ts";

type Status = "idle" | "busy" | "disabled";      // "disabled" 시스템 자원 상 혹은 사용자 설정 상 운영하지 않는 워커

const CONCURRENCY_LIMIT = 30;                    // 최대 동시 존재 가능한 워커 수
let current = 0;
const workers = Array.from({ length: CONCURRENCY_LIMIT }, (_, i) => ({ id: i, }));
