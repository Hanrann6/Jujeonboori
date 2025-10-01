import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";
import { router, useLocalSearchParams } from "expo-router";
import Papa from "papaparse";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import csvAsset from "../../../assets/data/trad_alcohol.csv";

type Row = {
    "alcoholName": string;
    "alcoholType"?: string;
    "degree": number;
    "imageURL"?: string;
    "price"?: string | number;
    "alcohol_id"?: string;
};
type Item = {
    id: string;
    name: string;
    nameL: string;
    imageUrl?: string;
    abv?: number;
    category?: string
    priceN?: number;
};

// 전통주 찜 저장키 
const FAV_KEY = "@fav:alcohol";

// 현재 찜 id[] 읽기
async function getFavIds(): Promise<string[]> {
    const raw = await AsyncStorage.getItem(FAV_KEY);
    if (!raw) return [];
    try { return JSON.parse(raw) as string[]; } catch { return []; }
}

// 찜 토글
async function toggleFav(id: string): Promise<boolean> {
    const raw = await AsyncStorage.getItem(FAV_KEY);
    let list: string[] = [];
    try { list = raw ? JSON.parse(raw) : []; } catch { }
    const has = list.includes(id);
    const next = has ? list.filter(x => x !== id) : [...list, id];
    await AsyncStorage.setItem(FAV_KEY, JSON.stringify(next));
    return !has;
}
// 초기 찜 확인
async function isFav(id: string): Promise<boolean> {
    return (await getFavIds()).includes(id);
}

function validHttp(u?: string) { return !!u && /^https?:\/\//i.test(u); }

const toPrice = (v: any): number | undefined => {
    if (v == null) return undefined;
    const n = Number(String(v).replace(/[^\d]/g, ""));
    return Number.isFinite(n) ? n : undefined;
};

export default function SearchScreen() {
    //URL 파라미터에서 초기 필터 읽기
    const { q, min, max, cats } = useLocalSearchParams<{ q?: string; min?: string; max?: string; cats?: string }>();
    const initCats: string[] = (() => { try { return cats ? JSON.parse(String(cats)) : []; } catch { return []; } })();
    const [query, setQuery] = useState(q ? String(q) : "");
    const [minPrice, setMinPrice] = useState<number | undefined>(min ? Number(min) : undefined);
    const [maxPrice, setMaxPrice] = useState<number | undefined>(max ? Number(max) : undefined);
    const [selCats, setSelCats] = useState<string[]>(initCats);
    const [loading, setLoading] = useState(true);
    const [list, setList] = useState<Item[]>([]);

    // CSV 로딩
    useEffect(() => {
        (async () => {
            setLoading(true);
            const asset = Asset.fromModule(csvAsset);
            await asset.downloadAsync();
            const csv = await FileSystem.readAsStringAsync(asset.localUri!);
            const parsed = Papa.parse<Row>(csv, { header: true, dynamicTyping: true, skipEmptyLines: true });

            const items: Item[] = [];
            for (const r of parsed.data) {
                const raw = r?.["alcoholName"];
                if (!raw) continue;
                const name = String(raw).trim();
                const id = r?.["alcohol_id"] != null ? String(r["alcohol_id"]) : encodeURIComponent(name);
                const img = (r["imageURL"] ?? "").toString().trim();
                items.push({
                    id,
                    name,
                    nameL: name.toLowerCase(),
                    imageUrl: validHttp(img) ? img : undefined,
                    abv: Number(r["degree"]) || undefined,
                    category: r["alcoholType"] || undefined,
                    priceN: toPrice(r["price"]),
                });
            }
            setList(items);
            setLoading(false);
        })();
    }, []);

    // 필터링 검색 
    const results = useMemo(() => {
        const ql = (query || "").trim().toLowerCase();

        return list.filter(it => {
            //1) 이름으로 검색
            if (ql && !it.nameL.includes(ql)) return false;
            // 2) 주종으로 검색: 선택된 주종이 있을 때만
            if (selCats.length > 0) {
                if (!it.category || !selCats.includes(it.category)) return false;
            }
            // 3) 가격 필터: min/max 중 하나라도 설정됐을 때만 체크
            if (minPrice != null || maxPrice != null) {
                const p = it.priceN ?? null;          // CSV에서 숫자 가격을 파싱해 둔 필드 (없으면 null)
                if (p == null) return false;          // 가격 없는 항목은 제외하고 싶다면
                if (minPrice != null && p < minPrice) return false;
                if (maxPrice != null && p > maxPrice) return false;
            }
            return true;
        });
    }, [list, query, selCats, minPrice, maxPrice]);

    const submit = () => {
        const qTrim = query.trim();
        // 파라미터 동기화(뒤로 가기 시 상태 보존)
        router.setParams({
            q: qTrim,
            min: minPrice != null ? String(minPrice) : "",
            max: maxPrice != null ? String(maxPrice) : "",
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

    return (
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
            {/* 상단 검색/필터 입력줄: 간단 버전 */}
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
                    <Ionicons name="close-circle-outline"
                        size={20}
                        color="#6B7280"
                        onPress={() => setQuery("")} />
                </View>
            </View>

            <View style={styles.headerContainer}>
                <Text style={styles.headerTitle}>
                    <Text style={styles.item}>{`'`}{query.trim() || " "}{`'`}</Text> 검색결과
                </Text>
            </View>

            {/* 결과 목록 */}
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

// --- 파일 하단에 추가 ---
function ResultCard({ item }: { item: Item }) {
    const [liked, setLiked] = React.useState(false);

    // 마운트 시 초기 찜 여부 로드
    React.useEffect(() => {
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
            onPress={() => router.push({ pathname: "/(tabs)/(home)/[id]", params: { id: item.id, alcoholName: item.name } })}
            android_ripple={{ color: "#F3F4F6" }}
        >
            <Image
                source={item.imageUrl ? { uri: item.imageUrl } : require("../../../assets/images/bottle_placeholder.png")}
                style={styles.thumb}
                resizeMode="contain"
            />

            {/* 우상단 하트 */}
            <Pressable
                onPress={async () => {
                    const next = await toggleFav(item.id);
                    setLiked(next);
                }}
                hitSlop={12}
                style={styles.heart}
                accessibilityLabel={liked ? "찜 취소" : "찜하기"}
            >
                <Ionicons
                    name={liked ? "heart" : "heart-outline"}
                    size={20}
                    color={liked ? "#F59E0B" : "#9CA3AF"}
                />
            </Pressable>

            <Text numberOfLines={2} style={styles.name}>{item.name}</Text>
            {(item.category || item.abv) && (
                <Text style={styles.meta}>
                    {item.category ?? ""}{item.category && item.abv ? " · " : ""}{item.abv ? `${item.abv}%` : ""}
                </Text>
            )}
        </Pressable>
    );
}


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