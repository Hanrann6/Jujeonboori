//app\components\Weathercard.tsx

import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

/** ====== 스타일 공통 ====== */
const CARD_BG = "#FFF7EB";
const BORDER = "#FDE68A";
const BLACK = "#111827";
const MUTED = "#6B7280";

/** ====== 환경변수 ====== */
const KMA_BASE_URL =
    process.env.EXPO_PUBLIC_KMA_BASE_URL ??
    "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst";

const RAW_KEY = process.env.EXPO_PUBLIC_KMA_SERVICE_KEY ?? "";
function normalizeAndEncodeKey(k: string) {
    let decoded = k;
    if (/%[0-9A-Fa-f]{2}/.test(k)) {
        try {
            decoded = decodeURIComponent(k); // 이미 인코딩되어 있으면 한 번만 디코딩
        } catch {
            // 디코딩 실패해도 원본 사용
            decoded = k;
        }
    }
    return encodeURIComponent(decoded); // 최종적으로 정확히 1회 인코딩
}
/** ====== 위/경도 → 격자 변환 (기상청 LCC) ====== */
function isInKorea(lat: number, lon: number) {
    return lat >= 33 && lat <= 39 && lon >= 124 && lon <= 132;
}

// 서울시청 좌표(폴백용)
const SEOUL = { lat: 37.5665, lon: 126.9780 };

type Grid = { nx: number; ny: number };

function convertLatLngToGrid(lat: number, lon: number): Grid {
    const RE = 6371.00877; // 지구반경(km)
    const GRID = 5.0;      // 격자간격(km)
    const SLAT1 = 30.0;    // 투영 위도1
    const SLAT2 = 60.0;    // 투영 위도2
    const OLON = 126.0;    // 기준경도
    const OLAT = 38.0;     // 기준위도
    const XO = 43;         // 기준점 X좌표
    const YO = 136;        // 기준점 Y좌표

    const DEGRAD = Math.PI / 180.0;

    let re = RE / GRID;
    let slat1 = SLAT1 * DEGRAD;
    let slat2 = SLAT2 * DEGRAD;
    let olon = OLON * DEGRAD;
    let olat = OLAT * DEGRAD;

    let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);

    let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;

    let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
    ro = re * sf / Math.pow(ro, sn);

    let ra = Math.tan(Math.PI * 0.25 + (lat) * DEGRAD * 0.5);
    ra = re * sf / Math.pow(ra, sn);

    let theta = (lon) * DEGRAD - olon;
    if (theta > Math.PI) theta -= 2.0 * Math.PI;
    if (theta < -Math.PI) theta += 2.0 * Math.PI;
    theta *= sn;

    const nx = Math.floor(ra * Math.sin(theta) + XO + 0.5);
    const ny = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);
    return { nx, ny };
}

/** ====== 초단기예보 base_date / base_time 계산 ======
 * - 매시 30분 발표, 보통 45분 이후 조회 안정적
 * 분이 45분 미만이면 이전 시각의 30분(예: 13:12 → 12:30)
 * 분이 45분 이상이면 현재 시각의 30분(예: 13:50 → 13:30)
 * 자정 직후(00:xx, 45분 미만)면 날짜를 전날로 돌려서 23:30.
 */

function getBaseDateTime() {
    const now = new Date();
    let target = new Date(now);

    const minute = now.getMinutes();
    let hour = now.getHours();

    if (minute < 45) {
        hour -= 1;
        if (hour < 0) {
            hour = 23;
            target.setDate(target.getDate() - 1);
        }
    }

    const y = target.getFullYear();
    const m = String(target.getMonth() + 1).padStart(2, "0");
    const d = String(target.getDate()).padStart(2, "0");
    const base_date = `${y}${m}${d}`;
    const base_time = `${String(hour).padStart(2, "0")}30`;

    return { base_date, base_time };
}

/** ====== 가장 가까운 예보시각 선택 (안전) ======
 * 응답 아이템 중 같은 fcstDate에 대해 현재시각과 가장 가까운 fcstTime을 고름
 */
function pickNearestFcstTime(items: any[], fallbackDate: string) {
    if (!items?.length) return { date: fallbackDate, time: "0000" };

    const now = new Date();
    const cur = Number(`${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`);

    const sameDate = items.filter((it: any) => it.fcstDate === fallbackDate);
    if (!sameDate.length) return { date: fallbackDate, time: "0000" };

    let best = sameDate[0].fcstTime;
    let bestDiff = Infinity;
    for (const it of sameDate) {
        const t = Number(it.fcstTime);
        const diff = Math.abs(t - cur);
        if (diff < bestDiff) {
            bestDiff = diff;
            best = it.fcstTime;
        }
    }
    return { date: fallbackDate, time: best };
}

/** ====== KMA 호출 ====== */
async function fetchUltraShortTemperature(lat: number, lon: number) {
    const useLat = isInKorea(lat, lon) ? lat : SEOUL.lat;
    const useLon = isInKorea(lat, lon) ? lon : SEOUL.lon;
    let { nx, ny } = convertLatLngToGrid(useLat, useLon);
    const { base_date, base_time } = getBaseDateTime();

    const encodedKey = normalizeAndEncodeKey(RAW_KEY);

    const qs = new URLSearchParams({
        pageNo: "1",
        numOfRows: "1000",
        dataType: "JSON",
        base_date,
        base_time,
        nx: String(nx),
        ny: String(ny),
    }).toString();

    const url = `${KMA_BASE_URL}?serviceKey=${encodedKey}&${qs}`;

    const res = await fetch(url);
    const ctype = (res.headers.get("content-type") || "").toLowerCase();
    const raw = await res.text();
    const maskedUrl = url.replace(encodedKey, "[KEY]");
    console.log("[KMA] status:", res.status, "ctype:", ctype);
    console.log("[KMA] url:", maskedUrl);
    if (!(nx > 0 && ny > 0 && nx < 200 && ny < 300)) {
        nx = 60; ny = 127; // 서울(5km 격자 기준)
    }
    if (!res.ok) {
        console.log("[KMA] body:", raw.slice(0, 200));
        throw new Error(`HTTP ${res.status} from KMA`);
    }
    if (!ctype.includes("application/json")) {
        console.log("[KMA] non-JSON body:", raw.slice(0, 200));
        throw new Error("KMA returned non-JSON (check serviceKey & dataType)");
    }

    const json = JSON.parse(raw);
    const code = json?.response?.header?.resultCode;
    if (code !== "00") {
        console.log("[KMA] header:", json?.response?.header);
        throw new Error(json?.response?.header?.resultMsg || "KMA error");
    }

    const items = json?.response?.body?.items?.item ?? [];
    const { date: fcstDate, time: fcstTime } = pickNearestFcstTime(items, base_date);

    const t1h = items.find((it: any) => it.category === "T1H" && it.fcstDate === fcstDate && it.fcstTime === fcstTime);
    const temperature = t1h ? Number(t1h.fcstValue) : null;

    const sky = items.find((it: any) => it.category === "SKY" && it.fcstDate === fcstDate && it.fcstTime === fcstTime)?.fcstValue;
    const pty = items.find((it: any) => it.category === "PTY" && it.fcstDate === fcstDate && it.fcstTime === fcstTime)?.fcstValue;

    const skyDesc = sky === "1" ? "맑음" : sky === "3" ? "구름많음" : sky === "4" ? "흐림" : "";
    const ptyDesc = pty === "0" ? "맑음" : pty === "1" ? "비" : pty === "2" ? "비/눈" : pty === "3" ? "눈"
        : pty === "5" ? "빗방울" : pty === "6" ? "빗방울/눈날림" : pty === "7" ? "눈날림" : "";
    
    return { temperature, skyDesc, ptyDesc };
}

/** ====== 컴포넌트 ====== */
export default function Weathercard() {
    const [loading, setLoading] = useState(true);
    const [place, setPlace] = useState("날씨 정보를 불러오는 중…");
    const [temp, setTemp] = useState<number | null>(null);

    const resolveAreaName = useCallback(async (lat: number, lon: number) => {
        const useLat = isInKorea(lat, lon) ? lat : SEOUL.lat;
        const useLon = isInKorea(lat, lon) ? lon : SEOUL.lon;
        try {
            const list = await Location.reverseGeocodeAsync({ latitude: useLat, longitude: useLon });
            const f = list?.[0];
            const si = f?.city || f?.region || f?.subregion || "";
            const gu = f?.district || "";
            return [si, gu].filter(Boolean).join(" ") || "현재 위치";
        } catch {
            return "현재 위치";
        }
    }, []);

    // 날씨 호출과 표시용 위치에 같은(폴백된) 좌표를 사용
    const run = useCallback(async () => {
        setLoading(true);
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== "granted") {
            // 권한 거부 시에도 서울 폴백
            setPlace(await resolveAreaName(SEOUL.lat, SEOUL.lon));
            const { temperature } = await fetchUltraShortTemperature(SEOUL.lat, SEOUL.lon);
            setTemp(temperature);
            return;
          }
      
          // 좌표 시도
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const { latitude, longitude } = loc.coords;
          const target = isInKorea(latitude, longitude) ? { lat: latitude, lon: longitude } : SEOUL;
      
          setPlace(await resolveAreaName(target.lat, target.lon));
          const { temperature } = await fetchUltraShortTemperature(target.lat, target.lon);
          setTemp(temperature);
      
        } catch (e) {
          // 모든 예외에서 서울 폴백
          setPlace(await resolveAreaName(SEOUL.lat, SEOUL.lon));
          try {
            const { temperature } = await fetchUltraShortTemperature(SEOUL.lat, SEOUL.lon);
            setTemp(temperature);
          } catch {
            setTemp(null);
          }
        } finally {
          setLoading(false);
        }
      }, [resolveAreaName]);
      

    useEffect(() => { run(); }, [run]);

    const suggestion = useMemo(() => {
        if (temp == null) return "날씨 정보를 불러오지 못했어요.";
        if (temp >= 28) return "후텁지근한 오늘은 \n청량한 스파클링 청주 어때요?";
        if (temp >= 18) return "산뜻한 날씨엔 \n과실주나 가벼운 약주를 추천해요.";
        if (temp >= 5) return "차분한 날엔 묵직한 탁주나\n숙성 약주가 잘 맞아요.";
        return "오늘 같이 쌀쌀한 날엔\n따뜻하게 데운 약주도 좋아요.";
    }, [temp]);

    return (
        <View style={styles.cardContainer}>
            <View style={styles.card}>
                <View style={styles.header}>
                    <Text style={styles.place} numberOfLines={1}>{place}</Text>
                </View>
                <Text style={styles.temp}>
                    {loading ? "…" : temp != null ? `${temp}℃` : "--"}
                </Text>
                <Text style={styles.desc} numberOfLines={2}>
                    {loading ? "날씨 정보를 불러오는 중…" : suggestion}
                </Text>
            </View>
            <View style={styles.refreshContainer}>
                <Pressable onPress={run} style={styles.refresh} hitSlop={10}>
                    <Ionicons name="locate" size={30} color={BLACK} />
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        marginTop: 8,
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: CARD_BG,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    card: {
        marginHorizontal: 20,
        padding: 5,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between"
    },
    place: {
        color: MUTED,
        fontSize: 16,
        fontWeight: "600",
        maxWidth: "85%"
    },
    refreshContainer: {
        marginBottom: 70,
    },
    refresh: {
        width: 45, height: 45, borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFFFFFAA",
    },
    temp: { fontSize: 36, fontWeight: "900", color: BLACK },
    desc: { marginTop: 6, fontSize: 16, fontWeight: "500", color: BLACK },
});
