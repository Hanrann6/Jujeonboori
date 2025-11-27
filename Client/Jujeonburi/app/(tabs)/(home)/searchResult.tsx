// app/(tabs)/(home)/search.tsx
import { authedFetch } from "@/app/lib/auth";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
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
    degree?: number;
    image_url?: string;
    price_value?: number;
};
type ApiAlcoholListResp = { alcohols: ApiAlcohol[] };

/** ===== 화면 아이템 ===== */
type Item = {
    id: string;        // alcohol_id 
    name: string;
    nameL: string;
    imageUrl?: string;
    price_value?: number;
    category?: string;
    degree?: number;
    liked: boolean;
    alcoholIndex?: number;
};

/** ===== 서버 북마크 API ===== */
async function fetchBookmarks(): Promise<Set<number>> {
    const res = await authedFetch(`${API_BASE}/bookmark`, { method: "GET" });
    const raw = await res.text();
    if (!res.ok) throw new Error(`GET /bookmark 실패(${res.status}) ${raw}`);
    const arr = JSON.parse(raw) as { alcoholIndex: number }[];
    return new Set((arr || []).map(x => Number(x.alcoholIndex)));
}

async function addBookmark(alcoholIndex: number) {
    const res = await authedFetch(`${API_BASE}/bookmark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alcoholIndex }),
    });
    const raw = await res.text();
    console.log("[POST /bookmark]", { alcoholIndex }, raw);
    if (!res.ok) throw new Error(`POST /bookmark 실패(${res.status}) ${raw}`);
}

async function removeBookmark(alcoholIndex: number) {
    const res = await authedFetch(`${API_BASE}/bookmark`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alcoholIndex }),
    });
    const raw = await res.text();
    console.log("[DELETE /bookmark]", { alcoholIndex }, raw);
    if (!res.ok) throw new Error(`DELETE /bookmark 실패(${res.status}) ${raw}`);
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
    const { q, min, max, cats, kws } = useLocalSearchParams<{ q?: string; min?: string; max?: string; cats?: string, kws?: string }>();

    const [minPrice, setMinPrice] = useState<number | undefined>(min ? Number(min) : undefined);
    const [maxPrice, setMaxPrice] = useState<number | undefined>(max ? Number(max) : undefined);
    const [selCats, setSelCats] = useState<string[]>(parseCatsParam(cats));
    const [selKws, setSelKws] = useState<string[]>(parseCatsParam(kws));
    const [query, setQuery] = useState(q ? String(q) : "");
    const [loading, setLoading] = useState(true);
    const [list, setList] = useState<Item[]>([]);
    const [error, setError] = useState<string | null>(null);

    async function fetchListFromServer(
        { q, selCats, selKws, minPrice, maxPrice }:
            { q?: string; selCats: string[]; selKws: string[]; minPrice?: number; maxPrice?: number }
    ) {
        const hasQ = !!(q && q.trim());
        const hasCat = selCats && selCats.length > 0;
        const hasKws = selKws && selKws.length > 0;
        const hasMin = typeof minPrice === "number" && Number.isFinite(minPrice) && minPrice > 0;
        const hasMax = typeof maxPrice === "number" && Number.isFinite(maxPrice) && maxPrice > 0;

        if (!hasQ && !hasCat && !hasKws && !hasMin && !hasMax) {
            throw new Error("적어도 하나의 검색 조건이 필요합니다. (검색어/카테고리/가격)");
        }

        const params = new URLSearchParams();

        if (hasQ) params.append("search", q!.trim());
        if (hasCat) selCats.forEach(c => params.append("category", c));
        if (hasKws) selKws.forEach(k => params.append("keywords", k));
        if (hasMin) params.append("price_min", String(minPrice));
        if (hasMax) params.append("price_max", String(maxPrice));

        const url = `${API_BASE}/alcohols?${params.toString()}`;
        console.log("[GET]", url);

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
            degree: a.degree,
            price_value: a.price_value,
        })) as Item[];
    }

    // 검색어 초기화
    useEffect(() => {
        setQuery(q ? String(q) : "");
        setMinPrice(min !== undefined && min !== "" ? Number(min) : undefined);
        setMaxPrice(max !== undefined && max !== "" ? Number(max) : undefined);
        setSelCats(parseCatsParam(cats));
        setSelKws(parseCatsParam(kws));
    }, [q, min, max, cats, kws]);

    // 목록 로딩 (API)
    useFocusEffect(
        React.useCallback(() => {
          let alive = true;
      
          (async () => {
            try {
              setLoading(true);
              setError(null);
      
              // 1) 검색 결과 호출
              const items = await fetchListFromServer({
                q: q ? String(q) : "",
                selCats: parseCatsParam(cats),
                selKws: parseCatsParam(kws),
                minPrice: min !== undefined && min !== "" ? Number(min) : undefined,
                maxPrice: max !== undefined && max !== "" ? Number(max) : undefined,
              });
      
              // 2) 북마크 set 가져오기
              const bookmarked = await fetchBookmarks();
      
              // 3) 매핑
              const joined: Item[] = items.map((a) => {
                const idx = Number(a.id);
                const alcoholIndex = Number.isFinite(idx) ? idx : undefined;
                const liked = alcoholIndex != null ? bookmarked.has(alcoholIndex) : false;
                return { ...a, liked, alcoholIndex };
              });
      
              if (alive) setList(joined);
            } catch (e: any) {
              if (alive) setError(e?.message ?? "전통주 목록을 불러오지 못했어요.");
            } finally {
              if (alive) setLoading(false);
            }
          })();
      
          return () => {
            alive = false;
          };
        }, [q, min, max, cats, kws])
      );
      


    // 클라이언트 필터링 (이름, 카테고리)
    const results = list;

    const submit = () => {
        router.setParams({
            q: (query || "").trim(),
            min: typeof minPrice === "number" && minPrice > 0 ? String(minPrice) : "",
            max: typeof maxPrice === "number" && maxPrice > 0 ? String(maxPrice) : "",
            cats: JSON.stringify(selCats),
            kws: JSON.stringify(selKws),
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
                    columnWrapperStyle={{ paddingHorizontal: 40, justifyContent: "space-between", marginBottom: 12 }}
                    contentContainerStyle={{ paddingBottom: 24, gap: 8 }}
                    renderItem={({ item, index }) => {
                        const onToggle = async () => {
                            if (item.alcoholIndex == null) return; // index 없는 항목은 토글 불가(명세 기준)

                            const willLike = !item.liked;
                            try {
                                if (willLike) {
                                    await addBookmark(item.alcoholIndex);
                                } else {
                                    await removeBookmark(item.alcoholIndex);
                                }
                                // 화면 반영
                                setList(prev =>
                                    prev.map((x, i) => (i === index ? { ...x, liked: willLike } : x))
                                );
                            } catch (e) {
                                console.log("bookmark toggle failed:", e);
                            }
                        };

                        return <ResultCard item={item} onToggle={onToggle} />;
                    }}
                />
            )}
        </View>
    );
}

/** ===== 카드 ===== */
function ResultCard({ item, onToggle }: { item: Item; onToggle: () => void }) {
    return (
        <View style={styles.card}>
        <Pressable
            onPress={() => router.push({ pathname: "/(tabs)/(home)/[id]", params: { id: item.id } })}
            android_ripple={{ color: "#F3F4F6" }}
        >
            <Image
                source={item.imageUrl ? { uri: item.imageUrl } : require("../../../assets/images/bottle_placeholder.png")}
                style={styles.thumb}
                resizeMode="cover"
            />

            <Pressable
                onPress={onToggle}
                hitSlop={12}
                style={styles.heart}
                accessibilityLabel={item.liked ? "찜 취소" : "찜하기"}
            >
                <Ionicons name={item.liked ? "heart" : "heart-outline"} size={20} color={item.liked ? "#F59E0B" : "#9CA3AF"} />
            </Pressable>

            <Text numberOfLines={2} style={styles.name}>{item.name}</Text>
            {!!item.category && <Text style={styles.meta}>{item.category} • {typeof item.degree === "number" && !isNaN(item.degree) && (
                <Text style={styles.meta}>{item.degree}%</Text>)}</Text>}
            {!!item.price_value && <Text style={styles.meta}>₩ {item.price_value.toLocaleString()}</Text>}
           

        </Pressable>
        </View>
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
        top: 3, right: 3,
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: "white",
        alignItems: "center", justifyContent: "center",
        elevation: 2,
    },
    thumb: { width: 140, height: 150, borderRadius: 8, backgroundColor: "#F3F4F6" },
    name: { textAlign: "left", marginTop: 8, color: "#111827", fontWeight: "700" },
    meta: { textAlign: "left", color: "#6B7280", fontSize: 12, marginTop: 2 },
});