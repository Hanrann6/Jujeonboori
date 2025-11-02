// app/(tabs)/(home)/search.tsx  ← 네 파일 경로에 맞춰 저장
import { authedFetch } from "@/app/lib/auth";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

/** ===== API ===== */
const API_BASE = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/+$/, "");

type ApiAlcohol = {
    alcohol_id: number | string;
    name: string;
    category?: string;
    image_url?: string;
};
type ApiAlcoholListResp = { alcohols: ApiAlcohol[] };

/** ===== 화면 아이템 ===== */
type Item = {
    id: string;        // alcohol_id (string화)
    name: string;
    nameL: string;
    imageUrl?: string;
    category?: string;
};

/** ===== 찜 ===== */
const FAV_KEY = "@fav:alcohol";
async function getFavIds(): Promise<string[]> {
    const raw = await AsyncStorage.getItem(FAV_KEY);
    if (!raw) return [];
    try { return JSON.parse(raw) as string[]; } catch { return []; }
}
async function toggleFav(id: string): Promise<boolean> {
    const list = await getFavIds();
    const has = list.includes(id);
    const next = has ? list.filter(x => x !== id) : [...list, id];
    await AsyncStorage.setItem(FAV_KEY, JSON.stringify(next));
    return !has;
}
async function isFav(id: string) { return (await getFavIds()).includes(id); }

// helpers
function encodeKeepSlashComma(v: string) {
    // 기본은 안전하게 인코딩하되, '/'와 ','만 원래 문자로 복원
    return encodeURIComponent(v).replace(/%2F/gi, "/").replace(/%2C/gi, ",");
}

function parseCatsParam(v?: string | string[]): string[] {
    if (!v) return [];
    const raw = Array.isArray(v) ? v.join(",") : String(v).trim();
    if (!raw) return [];
    // JSON 배열 형태면 그대로 파싱
    if (raw.startsWith("[") && raw.endsWith("]")) {
        try {
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr.map(String) : [];
        } catch { return []; }
    }
    // 콤마/공백 분리도 허용
    return raw.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
}

/** ===== 컴포넌트 ===== */
export default function SearchScreen() {
    // URL 파라미터
    const { q, min, max, cats } = useLocalSearchParams<{ q?: string; min?: string; max?: string; cats?: string }>();

    const [minPrice, setMinPrice] = useState<number | undefined>(min ? Number(min) : undefined);
    const [maxPrice, setMaxPrice] = useState<number | undefined>(max ? Number(max) : undefined);
    const [selCats, setSelCats] = useState<string[]>(parseCatsParam(cats));
    const [query, setQuery] = useState(q ? String(q) : "");
    const [loading, setLoading] = useState(true);
    const [list, setList] = useState<Item[]>([]);
    const [error, setError] = useState<string | null>(null);

    async function fetchListFromServer(
        { q, selCats, minPrice, maxPrice }:
            { q?: string; selCats: string[]; minPrice?: number; maxPrice?: number }
    ) {
        const hasQ = !!(q && q.trim());
        const hasCat = selCats && selCats.length > 0;
        const hasMin = typeof minPrice === "number" && Number.isFinite(minPrice) && minPrice > 0;
        const hasMax = typeof maxPrice === "number" && Number.isFinite(maxPrice) && maxPrice > 0;

        // 최소 한 가지 조건 필수 (명세)
        if (!hasQ && !hasCat && !hasMin && !hasMax) {
            throw new Error("적어도 하나의 검색 조건이 필요합니다. (검색어/카테고리/가격)");
        }

        const parts: string[] = [];
        if (hasQ) parts.push(`search=${encodeURIComponent(q!.trim())}`);
        if (hasCat) {
            // 다중 선택시 콤마로 합침. 서버가 콤마 분리를 지원하지 않으면 selCats[0] 사용
            const joined = selCats.join(",");
            parts.push(`category=${encodeKeepSlashComma(joined)}`); // <-- '/'와 ',' 보존
        }
        if (hasMin) parts.push(`price_min=${String(minPrice)}`);
        if (hasMax) parts.push(`price_max=${String(maxPrice)}`);

        const qs = parts.join("&");
        const url = `${API_BASE}/alcohols?${qs}`;
        console.log(url); // 디버그: /alcohols?search=...&category=약주/청주

        const res = await authedFetch(url, { method: "GET" });
        const raw = await res.text();
        if (!res.ok) throw new Error(`GET /alcohols 실패(${res.status}) ${raw}`);

        const data = JSON.parse(raw) as ApiAlcoholListResp;
        return (data.alcohols || []).map(a => ({
            id: String(a.alcohol_id),
            name: a.name,
            nameL: a.name.toLowerCase(),
            imageUrl: a.image_url,
            category: a.category,
        })) as Item[];
    }


    // 검색어 초기화
    useEffect(() => {
        setQuery(q ? String(q) : "");
        setMinPrice(min !== undefined && min !== "" ? Number(min) : undefined);
        setMaxPrice(max !== undefined && max !== "" ? Number(max) : undefined);
        setSelCats(parseCatsParam(cats));
    }, [q, min, max, cats]);

    // 목록 로딩 (API)
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                setLoading(true);
                setError(null);

                const items = await fetchListFromServer({
                    q: q ? String(q) : "",
                    selCats: parseCatsParam(cats),
                    minPrice: min !== undefined && min !== "" ? Number(min) : undefined,
                    maxPrice: max !== undefined && max !== "" ? Number(max) : undefined,
                });

                if (alive) setList(items);
            } catch (e: any) {
                if (alive) setError(e?.message ?? "전통주 목록을 불러오지 못했어요.");
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [q, min, max, cats]);

    // 클라이언트 필터링 (이름, 카테고리)
    const results = list;

    const submit = () => {
        router.setParams({
            q: (query || "").trim(),
            min: typeof minPrice === "number" && minPrice > 0 ? String(minPrice) : "",
    max: typeof maxPrice === "number" && maxPrice > 0 ? String(maxPrice) : "",
    cats: JSON.stringify(selCats),
        });
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator />
                <Text style={{ marginTop: 8 }}>불러오는 중…</Text>
            </View>
        );
    }
    if (error) {
        return (
            <View style={styles.center}>
                <Text style={{ color: "red", paddingHorizontal: 16, textAlign: "center" }}>{error}</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
            {/* 검색 입력 */}
            <View style={styles.searchRow}>
                <View style={styles.searchBox}>
                    <Ionicons name="search" size={20} color="#6B7280" />
                    <TextInput
                        value={query}
                        onChangeText={setQuery}
                        placeholder="전통주 이름으로 검색"
                        placeholderTextColor="#9CA3AF"
                        style={styles.searchInput}
                        returnKeyType="search"
                        onSubmitEditing={submit}
                    />
                    {!!query && (
                        <Ionicons name="close-circle-outline" size={20} color="#6B7280" onPress={() => setQuery("")} />
                    )}
                </View>
            </View>

            <View style={styles.headerContainer}>
                <Text style={styles.headerTitle}>
                    <Text style={styles.item}>{`'`}{query.trim() || " "}{`'`}</Text> 검색결과
                </Text>
            </View>

            {results.length === 0 ? (
                <View style={styles.center}><Text style={{ color: "#6B7280" }}>검색 결과가 없어요.</Text></View>
            ) : (
                <FlatList
                    data={results}
                    keyExtractor={(it) => it.id}
                    numColumns={2}
                    columnWrapperStyle={{ paddingHorizontal: 45, justifyContent: "space-between", marginBottom: 12 }}
                    contentContainerStyle={{ paddingBottom: 24, gap: 8 }}
                    renderItem={({ item }) => <ResultCard item={item} />}
                />
            )}
        </View>
    );
}

/** ===== 카드 ===== */
function ResultCard({ item }: { item: Item }) {
    const [liked, setLiked] = React.useState(false);

    useEffect(() => {
        let alive = true;
        (async () => {
            const v = await isFav(item.id);
            if (alive) setLiked(v);
        })();
        return () => { alive = false; };
    }, [item.id]);

    return (
        <Pressable
            style={styles.card}
            onPress={() => router.push({ pathname: "/(tabs)/(home)/[id]", params: { id: item.id } })}
            android_ripple={{ color: "#F3F4F6" }}
        >
            <Image
                source={item.imageUrl ? { uri: item.imageUrl } : require("../../../assets/images/bottle_placeholder.png")}
                style={styles.thumb}
                resizeMode="contain"
            />

            <Pressable
                onPress={async () => {
                    const next = await toggleFav(item.id);
                    setLiked(next);
                }}
                hitSlop={12}
                style={styles.heart}
                accessibilityLabel={liked ? "찜 취소" : "찜하기"}
            >
                <Ionicons name={liked ? "heart" : "heart-outline"} size={20} color={liked ? "#F59E0B" : "#9CA3AF"} />
            </Pressable>

            <Text numberOfLines={2} style={styles.name}>{item.name}</Text>
            {!!item.category && <Text style={styles.meta}>{item.category}</Text>}
        </Pressable>
    );
}

/** ===== 스타일 ===== */
const styles = StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    searchRow: { flexDirection: "row", alignItems: "center", marginHorizontal: 8, padding: 20, paddingBottom: 8 },
    searchBox: {
        flex: 1, height: 40, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8,
        paddingHorizontal: 10, backgroundColor: "#EEE", gap: 8, flexDirection: "row", alignItems: "center",
    },
    searchInput: { flex: 1, height: "100%", fontSize: 14, color: "#111827" },
    headerContainer: { margin: 20, flexDirection: "row", paddingHorizontal: 16, paddingBottom: 4 },
    headerTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
    item: { color: "#F59E0B", fontWeight: "800" },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        flexBasis: '48%',
        maxWidth: '48%',
        flexGrow: 0,
        padding: 10,
        alignItems: 'center',
        minHeight: 200,
        position: 'relative',
    },
    heart: {
        position: "absolute",
        top: 6, right: 6,
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: "white",
        alignItems: "center", justifyContent: "center",
        elevation: 2,
    },
    thumb: { width: 90, height: 130, marginTop: 4 },
    name: { textAlign: "center", marginTop: 8, color: "#111827", fontWeight: "700" },
    meta: { color: "#6B7280", fontSize: 12, marginTop: 2 },
});
