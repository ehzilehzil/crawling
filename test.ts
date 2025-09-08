// 전처리 함수
function preprocess(str: string): string[] {
    // 특수문자 제거
    let cleaned = str.replace(/[^0-9a-zA-Z가-힣]/g, "");

    // 숫자 치환
    const numMap: Record<string, string> = {
        "0": "영", "1": "일", "2": "이", "3": "삼", "4": "사",
        "5": "오", "6": "육", "7": "칠", "8": "팔", "9": "구"
    };
    cleaned = cleaned.replace(/[0-9]/g, (d) => numMap[d] || d);

    // 알파벳 치환
    const alphaMap: Record<string, string> = {
        a: "에이", b: "비", c: "씨", d: "디", e: "이", f: "에프",
        g: "지", h: "에이치", i: "아이", j: "제이", k: "케이",
        l: "엘", m: "엠", n: "엔", o: "오", p: "피", q: "큐",
        r: "알", s: "에스", t: "티", u: "유", v: "브이",
        w: "더블유", x: "엑스", y: "와이", z: "제트"
    };
    cleaned = cleaned.replace(/[a-zA-Z]/g, (ch) => {
        const lower = ch.toLowerCase();
        return alphaMap[lower] || ch;
    });

    // 한 글자씩 배열로
    return [...cleaned];
}

// 자카드 유사도
function jaccardSimilarity(a: string, b: string): number {
    if (!a || !b) return 0;

    const arrA = preprocess(a);
    const arrB = preprocess(b);

    const setA = new Set(arrA);
    const setB = new Set(arrB);

    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);

    return union.size === 0 ? 0 : intersection.size / union.size;
}

// 코사인 유사도
function cosineSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;

  const arrA = preprocess(a);
  const arrB = preprocess(b);

  // 빈도 맵 생성
  const freqMap: Record<string, [number, number]> = {};

    arrA.forEach(ch => {
        if (!freqMap[ch]) freqMap[ch] = [0, 0];
        freqMap[ch][0] += 1;
    });

    arrB.forEach(ch => {
        if (!freqMap[ch]) freqMap[ch] = [0, 0];
        freqMap[ch][1] += 1;
    });

    // 내적, 벡터 크기 계산
    let dot = 0, magA = 0, magB = 0;
    for (const [f1, f2] of Object.values(freqMap)) {
        dot += f1 * f2;
        magA += f1 * f1;
        magB += f2 * f2;
    }

    return magA === 0 || magB === 0 ? 0 : dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// 테스트
const a = "김태진"
const b = "진김태"

console.log("자카드:", jaccardSimilarity(a, b));
console.log("코사인:", cosineSimilarity(a, b));
