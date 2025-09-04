// app/(tabs)/[username]/review.tsx

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";
import { useRouter } from "expo-router";
import Papa from "papaparse";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Pressable,
    RefreshControl,
    SectionList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import csvAsset from "../../../assets/data/trad_alcohol.csv";
import ReviewModal from "../../components/ReviewModal";

type Review = {
    id: string;
    alcoholId: string;
    rating: number;
    content: string;
    images?: { uri: string }[];
    createdAt: number;
    updatedAt?: number;
    author?: string;
};
type AlcoholRow = {
    "제품명": string;
    "주종": string;
    "도수%": number;
    "사진URL"?: string;
    "docId"?: string | number;
};
type AlcoholMeta = {
    name: string;
    category: string;
    imageUrl?: string;
};


const REVIEW_KEY_PREFIX = "@reviews:";
const keyFor = (alcoholId: string) => `${REVIEW_KEY_PREFIX}${alcoholId}`;

const formatKDate = (ts: number) =>
    new Date(ts).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

const timeOf = (r: Review) => r.updatedAt ?? r.createdAt ?? 0;

const CATEGORY_ORDER = [
    "탁주",
    "약주/청주",
    "증류주",
    "과실주",
    "기타 주류",
];

//AsyncStorage에서 내가 쓴 리뷰를 가져오도록 
async function getAllMyReviews(nickname: string): Promise<Review[]> {
    const keys = await AsyncStorage.getAllKeys();
    const reviewKeys = keys.filter((k) => k.startsWith(REVIEW_KEY_PREFIX));
    if (!reviewKeys.length) return [];
    const pairs = await AsyncStorage.multiGet(reviewKeys);

    const me = (nickname || "익명").trim();
    const all: Review[] = [];
    for (const [, raw] of pairs) {
        if (!raw) continue;
        try {
            const arr = JSON.parse(raw) as Review[];
            if (Array.isArray(arr)) {
                for (const r of arr) {
                    const author = (r.author || "익명").trim();
                    if (author === me) all.push(r);
                }
            }
        } catch { /* skip bad rows */ }
    }
    return all.sort((a, b) => timeOf(b) - timeOf(a));
}

async function getReviewsForAlcohol(alcoholId: string): Promise<Review[]> {
    const raw = await AsyncStorage.getItem(keyFor(alcoholId));
    return raw ? (JSON.parse(raw) as Review[]) : [];
}
async function removeReview(alcoholId: string, reviewId: string): Promise<void> {
    const list = await getReviewsForAlcohol(alcoholId);
    const next = list.filter((r) => r.id !== reviewId);
    await AsyncStorage.setItem(keyFor(alcoholId), JSON.stringify(next));
}
type ReviewPatch = Partial<Pick<Review, "rating" | "content" | "images">>;
async function updateReview(alcoholId: string, reviewId: string, patch: ReviewPatch): Promise<void> {
    const list = await getReviewsForAlcohol(alcoholId);
    const next = list.map((r) => (r.id === reviewId ? { ...r, ...patch, updatedAt: Date.now() } : r));
    await AsyncStorage.setItem(keyFor(alcoholId), JSON.stringify(next));
}

// CSV에 있는 전통주 메타데이터(이름/주종/이미지)를 메모리 맵으로 로드
//: docId를 키로, { name, category, imageUrl }를 값으로 하는 Map<string, AlcoholMeta>를 만들어 반환함 
async function loadAlcoholMetaMap(): Promise<Map<string, AlcoholMeta>> {
    const map = new Map<string, AlcoholMeta>();
    const asset = Asset.fromModule(csvAsset);
    await asset.downloadAsync();
    const csv = await FileSystem.readAsStringAsync(asset.localUri!);
    const parsed = Papa.parse<AlcoholRow>(csv, { header: true, dynamicTyping: true, skipEmptyLines: true });
    for (const row of parsed.data) {
        const docId = row["docId"] != null ? String(row["docId"]) : undefined;
        const name = row["제품명"] ? String(row["제품명"]).trim() : "";
        const category = row["주종"] ? String(row["주종"]).trim() : "기타";
        const rawImg = (row["사진URL"] ?? "").toString().trim();
        const imageUrl = /^https?:\/\//i.test(rawImg) ? rawImg : undefined;
        if (docId && name) map.set(docId, { name, category, imageUrl });
    }
    return map;
}

export default function MyReviewsByCategory() {
    const router = useRouter();

    const [nickname, setNickname] = useState<string>("익명");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [editing, setEditing] = useState<Review | null>(null);

    const [metaMap, setMetaMap] = useState<Map<string, AlcoholMeta>>(new Map());

    useEffect(() => {
        (async () => {
            const nick = (await AsyncStorage.getItem("nickname")) ?? "";
            setNickname(nick);
        })();
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const m = await loadAlcoholMetaMap();
                setMetaMap(m);
            } catch { /* ignore */ }
        })();
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        const mine = await getAllMyReviews(nickname);
        setReviews(mine);
        setLoading(false);
    }, [nickname]);

    useEffect(() => {
        if (nickname === undefined) return;
        load();
    }, [nickname, load]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        const mine = await getAllMyReviews(nickname);
        setReviews(mine);
        setRefreshing(false);
    }, [nickname]);

    // 주종별로 리뷰 섹션을 나눔
    const sections = useMemo(() => {
        const buckets = new Map<string, Review[]>();
        for (const r of reviews) {
            const meta = metaMap.get(r.alcoholId);
            const cat = meta?.category || "기타";
            const list = buckets.get(cat) || [];
            list.push(r);
            buckets.set(cat, list);
        }
        // 정렬 순서는 주종별로 고정된 순서가 있고, 그 안에서는 최신순으로 정렬되도록 함
        const order = (cat: string) => {
            const idx = CATEGORY_ORDER.indexOf(cat);
            return idx >= 0 ? idx : CATEGORY_ORDER.length + 1;
        };
        return [...buckets.entries()]
            .sort((a, b) => order(a[0]) - order(b[0]))
            .map(([title, data]) => ({
                title,
                data: data.sort((x, y) => timeOf(y) - timeOf(x)),
            }));
    }, [reviews, metaMap]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator />
                <Text style={{ marginTop: 8 }}>불러오는 중…</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <Text style={styles.headerTitle}>
                    <Text style={styles.nick}>{nickname || "익명"}</Text>님의 리뷰
                </Text>
                <Text style={{ marginTop: 10, marginLeft: 15, color: "gray" }}>{reviews.length}건</Text>
            </View>

            <SectionList
                sections={sections}
                keyExtractor={(item) => item.id}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={{ flex:1, paddingHorizontal: 16, paddingBottom: 24 }}
                ListEmptyComponent={
                    <View style={styles.center}>
                        <Text style={{color: "#6B7280" }}>아직 작성한 리뷰가 없어요.</Text>
                    </View>
                }
                renderSectionHeader={({ section }) => (
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>• {section.title}</Text>
                    </View>
                )}
                renderItem={({ item }) => {
                    const meta = metaMap.get(item.alcoholId);
                    const name = meta?.name || item.alcoholId;
                    const thumb = meta?.imageUrl;

                    const canEdit = (item.author || "익명").trim() === (nickname || "익명").trim();

                    return (
                        <Pressable
                            onPress={() =>
                                router.push({
                                    pathname: "/(tabs)/(home)/reviewList",
                                    params: { alcoholId: String(item.alcoholId), alcoholName: name },
                                })
                            }
                            style={styles.card}
                        >
                            {/* 전통주 사진 */}
                            {thumb ? (
                                <Image source={{ uri: thumb }} style={styles.thumb} />
                            ) : (
                                <View style={[styles.thumb, { backgroundColor: "#F3F4F6" }]} />
                            )}

                            {/* 오른쪽 내용 */}
                            <View style={{ flex: 1 }}>
                                <View style={{ alignItems: "flex-start" }}>
                                    <Text style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail">
                                        {name}
                                    </Text>
                                    <Text style={styles.cardDate}>{formatKDate(timeOf(item))}</Text>
                                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
                                        <Text style={styles.stars}>{"⭐".repeat(Math.round(Number(item.rating) || 0))}</Text>
                                    </View>
                                </View>
                                <Text style={styles.snippet} numberOfLines={2} ellipsizeMode="tail">
                                    {item.content}
                                </Text>
                            </View>
                            
                            {/* 수정/삭제 아이콘 */}
                            {canEdit && (
                                <View style={styles.cardIcons}>
                                    <TouchableOpacity onPress={() => setEditing(item)} accessibilityLabel="리뷰 수정">
                                        <Ionicons name="create-outline" size={18} color="#374151" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => {
                                            Alert.alert("리뷰 삭제", "정말 이 리뷰를 삭제할까요?", [
                                                { text: "취소" },
                                                {
                                                    text: "삭제",
                                                    style: "destructive",
                                                    onPress: async () => {
                                                        await removeReview(item.alcoholId, item.id);
                                                        const mine = await getAllMyReviews(nickname);
                                                        setReviews(mine);
                                                    },
                                                },
                                            ]);
                                        }}
                                        style={{ marginLeft: 8 }}
                                        accessibilityLabel="리뷰 삭제"
                                    >
                                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </Pressable>
                    );
                }}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                SectionSeparatorComponent={() => <View style={{ height: 16 }} />}
            />

            {/* 리뷰 수정시에 모달 띄우기 */}
            <Modal visible={!!editing} animationType="slide" onRequestClose={() => setEditing(null)}>
                <ReviewModal
                    key={editing?.id ?? "edit"}
                    mode="edit"
                    alcoholName={metaMap.get(editing?.alcoholId || "")?.name || ""}
                    defaultRating={editing?.rating ?? 0}
                    defaultContent={editing?.content ?? ""}
                    defaultImages={editing?.images ?? []}
                    onRequestClose={() => setEditing(null)}
                    onSubmit={async (payload) => {
                        if (!editing) return;
                        const me = (nickname || "익명").trim();
                        if ((editing.author || "익명").trim() !== me) {
                            Alert.alert("권한 없음", "본인 리뷰만 수정할 수 있어요.");
                            return;
                        }
                        await updateReview(editing.alcoholId, editing.id, {
                            rating: payload.rating,
                            content: payload.content,
                            images: payload.images,
                        });
                        const mine = await getAllMyReviews(nickname);
                        setReviews(mine);
                        setEditing(null);
                    }}
                />
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },

    headerContainer: {
        margin: 20,
        flexDirection: "row",
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 4
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: "800",
        color: "#111827",
    },
    nick: {
        color: "#F59E0B",
        fontWeight: "800"
    },
    sectionHeader: {
        justifyContent: "center",
        marginTop: 12,
        paddingHorizontal: 20
    },
    sectionTitle: {
        textAlign: "left",
        fontSize: 18,
        fontWeight: "700",
        color: "#111827"
    },
    card: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: "white",
        borderWidth: 1, borderColor: "#808080",
        borderRadius: 10,
        padding: 10,
        position: "relative",
        marginHorizontal:15,
    },
    thumb: { width: 84, height: 84, borderRadius: 8, marginRight: 10 },
    cardTitle: { fontSize: 15, fontWeight: "800", color: "#111827", maxWidth: "70%" },
    cardDate: { fontSize: 12, color: "#6B7280" },
    stars: { color: "#111827", fontWeight: "700" },
    snippet: { marginTop: 4, color: "#374151", fontSize: 13, lineHeight: 18 },

    cardIcons: { position: "absolute", right: 8, top: 8, flexDirection: "row" },
});
