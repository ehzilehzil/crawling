import * as ez from "./utils.ts"
import * as tor from "./tor.ts"
// import proj4 from "https://cdn.skypack.dev/proj4"
import { coordconv, COORD_CODE } from "./coordconv.js"

// // WGS84 → WCONGNAMUL (EPSG:2097)
// const wgs84 = 'EPSG:4326';
// const wcongnamul = '+proj=tmerc +lat_0=38 +lon_0=127.5 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs';

// // 변환 함수
// function convertToWCONGNAMUL(lon: number, lat: number) {
//     const [x, y] = proj4(wgs84, wcongnamul, [lon, lat]);
//     return { x, y };
// }


async function test() {
    // 37.501251, 126.913545    // 우리집
    // 35.794521, 126.899251    // 교회
    // 35.575962, 126.523146    // 바다
    // 36.085551, 129.555557    // 포항 곶
    // 36.084174, 129.560302    // 포항 쬐그만 섬
    // 34.205005, 129.289997    // 대마도 쓰시마시
    // 33.113841, 126.268037    // 마라도
    // 33.115891, 126.267408    // 마라도
    // 37.964895, 126.556829    // 북한 개성군
    const wgs84 = { x: 126.556829, y: 37.964895 }
    ez.log.info("WGS84:", wgs84)

    // const wcongnamul = convertToWCONGNAMUL(wgs84.x, wgs84.y)
    const wcongnamul = coordconv(wgs84.x, wgs84.y, COORD_CODE.WGS84, COORD_CODE.WCONGNAMUL)
    ez.log.info("WCONGNABUL:", wcongnamul)

    const url = `https://map.kakao.com/etc/areaAddressInfo.json?output=JSON&inputCoordSystem=WCONGNAMUL&outputCoordSystem=WCONGNAMUL&x=${wcongnamul[0]}&y=${wcongnamul[1]}`
    const response = await tor.tor_fetch(0, url)
    const result = await response.json()
    ez.log.info("kakao:", result)
}

async function test2() {
    const wcongnamul = [481449.0, 1111642.0]
    ez.log.info(wcongnamul)

    const wgs84 = coordconv(wcongnamul[0], wcongnamul[1], COORD_CODE.WCONGNAMUL, COORD_CODE.WGS84)
    ez.log.info(wgs84)
}

if (import.meta.main) {
    await test()
}

