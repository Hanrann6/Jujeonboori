// app/(tabs)/(home)/[id].tsx
// 전통주 상세페이지 + 해당 전통주 리뷰 목록 + 리뷰 작성 모달 띄우기

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";
import { useLocalSearchParams, useRouter } from "expo-router";
import Papa from "papaparse";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import csvAsset from "../../../assets/data/trad_alcohol.csv";
import ReviewModal from "../../components/ReviewModal"; // 방금 만든 컴포넌트

// CSV 컬럼 타입
type AlcoholRow = {
    "index": string | number;
    "alcoholName": string;
    "normalizedName"?: string;
    "foodPairing"?: string;
    "sweetness": number;
    "sourness": number;
    "freshness": number;
    "body": number;
    "degree": number;
    "alcoholType": string;
    "keywords"?: string;
    "volume"?: string | number;
    "price"?: string;
    "priceValue?": number;
    "manufacturer"?: string;
    "ingredients"?: string;
    "brewery"?: string;
    "description"?: string;
    "representative"?: string;
    "address"?: string;
    "contact"?: string;
    "website"?: string;
    "imageURL"?: string;
    "detailPageUrl"?: string;
    "docId"?: string | number;
};

type AlcoholItem = {
    alcohol_id: string;
    name: string;
    sweetness: number;
    sourness: number;
    freshness: number;
    body: number;
    abv: number;
    category: string;
    keywords?: string;
    imageUrl?: string;
    volume?: string;
    price?: string;
    manufacturer?: string;
    ingredients?: string;
    pairings?: string;
    detailUrl?: string;
    brewery?: string;
    description?: string;
    representative?: string;
    address?: string;
    contact?: string;
    website?: string;
};

// 유효한 http(s) URL인지 체크
function validHttpUrl(u?: string) {
    return !!u && /^https?:\/\//i.test(u.trim());
}

// CSV → 아이템
function rowToItem(r: AlcoholRow): AlcoholItem {
    const id = String(r["index"]);
    const img = (r["imageURL"] ?? "").toString().trim();
    return {
        alcohol_id: id,
        name: String(r["alcoholName"]).trim(),
        sweetness: Number(r["sweetness"]) || 0,
        sourness: Number(r["sourness"]) || 0,
        freshness: Number(r["freshness"]) || 0,
        body: Number(r["body"]) || 0,
        abv: Number(r["degree"]) || 0,
        category: String(r["alcoholType"] ?? "").trim(),
        keywords: r["keywords"] ? String(r["keywords"]) : undefined,
        imageUrl: validHttpUrl(img) ? img : undefined,
        volume: r["volume"] != null ? String(r["volume"]) : undefined,
        price: r["price"] != null ? String(r["price"]) : undefined,
        manufacturer: r["manufacturer"] || undefined,
        ingredients: r["ingredients"] || undefined,
        pairings: r["foodPairing"] || undefined,
        detailUrl: r["detailPageUrl"] || undefined,
        brewery: r["brewery"] || undefined,
        description: r["description"] || undefined,
        representative: r["representative"] || undefined,
        address: r["address"] || undefined,
        contact: r["contact"] || undefined,
        website: r["website"] || undefined,
    };
}
async function loadAll(): Promise<AlcoholItem[]> {
    const asset = Asset.fromModule(csvAsset);
    await asset.downloadAsync();
    const csv = await FileSystem.readAsStringAsync(asset.localUri!);
    const parsed = Papa.parse<AlcoholRow>(csv, { header: true, dynamicTyping: true, skipEmptyLines: true });
    const rows = parsed.data.filter((r: any) => r["alcoholName"]);
    return rows.map(rowToItem);
}

//---------- 리뷰 관련 AsyncStorage----------//
export type Review = {
    id: string;              // uuid
    alcoholId: string;       // 상세 페이지 id와 동일
    rating: number;          // 별점 1~5
    content: string;         // 리뷰 본문
    images?: { uri: string }[];
    createdAt: number;       // Date.now()
    author?: string;         // 선택
};

//저장키, 조회 유틸
const keyFor = (alcoholId: string) => `@reviews:${alcoholId}`;

async function getReviews(alcoholId: string) {
    const raw = await AsyncStorage.getItem(keyFor(alcoholId));
    return raw ? JSON.parse(raw) : [];
}
// 리뷰 추가 
async function addReview(review: Review) {
    const list = await getReviews(review.alcoholId);
    const next = [review, ...list];
    await AsyncStorage.setItem(keyFor(review.alcoholId), JSON.stringify(next));
    return next;
}

// id순으로 상위 하나만 렌더링되도록 
function pickTopReview(list: Review[]) {
    if (!list?.length) return null;
    // 숫자 id로 우선 비교하고, 숫자가 아니라면 생성순
    const toNum = (v: any) => {
        const n = Number(v);
        return Number.isNaN(n) ? null : n;
    };

    return list.reduce((best, cur) => {
        const a = toNum(best.id);
        const b = toNum(cur.id);
        if (a != null && b != null) return b > a ? cur : best;
        return (cur.createdAt ?? 0) > (best.createdAt ?? 0) ? cur : best;
    }, list[0]);
}

export default function AlcoholDetailRoute() {
    const router = useRouter();
    const { id, alcoholName } = useLocalSearchParams<{ id: string; alcoholName?: string }>();

    const [items, setItems] = useState<AlcoholItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [reviews, setReviews] = useState<Review[]>([]);
    const [topReview, setTopReview] = useState<Review | null>(null);
    const [openReview, setOpenReview] = useState(false);

    const [nickname, setNickname] = useState<string>("익명");

    // 데이터 로딩 useEffect
    useEffect(() => {
        (async () => {
            setLoading(true);
            const all = await loadAll();
            setItems(all);
            setLoading(false);
        })();
    }, []);

    const item = useMemo(() => {
        if (!id) return null;
        const key = Array.isArray(id) ? id[0] : id;
        const nameKey = decodeURIComponent(key);
        return items.find(x => x.alcohol_id === key) || items.find(x => x.name === nameKey) || null;
    }, [items, id]);

    // 닉네임 로드
    useEffect(() => {
        (async () => {
            const nick = (await AsyncStorage.getItem("nickname")) ?? "";
            setNickname(nick);
        })();
    }, []);

    // 리뷰 목록 로드
    const loadReviews = useCallback(async () => {
        if (!id) return;
        const list = await getReviews(String(id));
        setReviews(list);
    }, [id]);
    useFocusEffect(
        React.useCallback(() => {
            loadReviews();
            return () => { };
        }, [loadReviews])
    );
    useEffect(() => {
        loadReviews();
    }, [loadReviews]);

    useEffect(() => {
        setTopReview(pickTopReview(reviews));
    }, [reviews]);

    //전통주 상세페이지에서 보이는 평점은 리뷰의 평균이 되도록
    const avgRating = useMemo(() => {
        if (!reviews?.length) return 0;
        const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
        return sum / reviews.length;
    }, [reviews]);

    //리뷰 작성 모달에서 등록하기 버튼을 누른 뒤 상태 업데이트
    const handleSubmitFromModal = async (payload: { rating: number; content: string; images?: { uri: string }[] }) => {
        const review: Review = {
            id: String(Date.now()),
            alcoholId: String(id),
            rating: payload.rating,
            content: payload.content,
            images: payload.images,
            createdAt: Date.now(),
            author: (await AsyncStorage.getItem("nickname")) || "익명"
        };
        await addReview(review);
        setReviews(prev => [review, ...prev]);   //리뷰 목록에 새 리뷰 추가
        setOpenReview(false);
    };

    if (loading) return <Center><ActivityIndicator /><Text style={{ marginTop: 8 }}>불러오는 중…</Text></Center>;
    if (!item) return <Center><Text>해당 전통주를 찾지 못했어요.</Text></Center>;

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, gap: 20 }}>
            <Image
                source={item.imageUrl ? { uri: item.imageUrl } : require("../../../assets/images/bottle_placeholder.png")}
                style={{ width: 180, height: 220, alignSelf: "center" }}
                resizeMode="contain"
            />

            <Text style={styles.itemName}>{item.name}</Text>
            <View style={styles.divider} />

            <Card >
                {item.category ? <Row label="종류" value={item.category} /> : <Row label="종류" value="" />}
                {item.ingredients ? <Row label="원재료" value={item.ingredients} /> : <Row label="원재료" value="" />}
                {item.abv ? <Row label="도수" value={`${item.abv}%`} /> : <Row label="도수" value="" />}
                {item.volume ? <Row label="용량" value={item.volume} /> : <Row label="용량" value="" />}
                {item.price ? <Row label="가격" value={`${item.price}`} /> : <Row label="가격" value="" />}
            </Card>

            <Text style={styles.cardTitle}>제품 설명</Text>
            <View >
                <ProfileCard>
                    {item.sweetness ? <Dots label="단맛" value={item.sweetness} /> : null}
                    {item.sourness ? <Dots label="신맛" value={item.sourness} /> : null}
                    {item.freshness ? <Dots label="청량감" value={item.freshness} /> : null}
                    {item.body ? <Dots label="바디감" value={item.body} /> : null}
                </ProfileCard>
            </View>
            {item.pairings && <Text style={{ fontSize: 14,  marginHorizontal: 20, color: "black" }}>{item.pairings}</Text>}
            {item.keywords && (<View style={styles.chipsWrap}>{parseKeywords(item.keywords).map((k, i) => (<Chip key={`${k}-${i}`} label={k} />))}</View>)}

            <Text style={styles.cardTitle}>양조장</Text>
            <Card>
                {item.brewery ? <Row label="양조장" value={item.brewery} /> : null}
                {item.representative ? <Row label="대표자" value={item.representative} /> : null}
                {item.address ? <Row label="주소" value={item.address} /> : null}
                {item.contact ? <Row label="연락처" value={item.contact} /> : null}
                {item.manufacturer ? <Row label="제조사" value={item.manufacturer} /> : null}
                {item.detailUrl && (<Row label="상세" value={item.detailUrl} isLink />)}
            </Card>

            <View>
                <View style={{ padding: 20, flexDirection: "row", alignItems: "center" }}>
                    <Text style={[styles.cardTitle, { flex: 1 }]}>리뷰/평점</Text>
                    <TouchableOpacity
                        onPress={() => setOpenReview(true)}
                        style={{ position: "absolute", right: 0, padding: 10, top: 32 }}
                        accessibilityLabel="리뷰 작성"
                    >
                        <Ionicons name="add-circle-outline" size={24} color="#111827" />
                    </TouchableOpacity>
                </View>

                {/*리뷰*/}
                <Card>
                    {topReview ? (
                        <View style={[styles.card, { padding: 0 }]}>
                            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                                <Text style={styles.reviewScore}>{avgRating.toFixed(1)}</Text>
                                <View style={{ flex: 1, marginLeft: 30 }}>
                                    <Text style={styles.author}>{nickname}</Text>
                                    <Text style={styles.reviewDate}>{new Date(topReview.createdAt).toLocaleDateString("ko-KR", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                    })}</Text>
                                </View>
                            </View>
                            <View style={{ flexDirection: "row", marginTop: 10 }}>
                                <View style={{ width: 70, justifyContent: "center", alignItems: "center" }}>
                                    <Text style={styles.reviewCount}>리뷰({reviews.length}건)</Text>
                                    <TouchableOpacity
                                        onPress={() =>
                                            router.push({
                                                pathname: "/(tabs)/(home)/reviewList",
                                                params: {
                                                    alcoholId: String(id),
                                                    alcoholName: item.name,         // 실제 이름을 직접 넘김
                                                },
                                            })
                                        }
                                        style={{ marginTop: 6 }}
                                        accessibilityLabel="리뷰 더보기"
                                    >
                                        <Text style={styles.moreLink}>더보기</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.reviewBubble}>
                                    <Text style={styles.reviewText} numberOfLines={2} ellipsizeMode="tail">
                                        {topReview.content}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ) : (
                        <Text style={{ textAlign: "center", color: "#6B7280" }}>
                            아직 리뷰가 없어요.{"\n"}첫 리뷰를 작성해보세요!
                        </Text>
                    )}
                </Card>

                {/* + 버튼을 누르면 리뷰 작성 모달이 뜨도록*/}
                <Modal
                    visible={openReview}
                    animationType="slide"
                    onRequestClose={() => setOpenReview(false)}  // 안드로이드 하드웨어 뒤로가기 대응
                >
                    <ReviewModal
                        alcoholName={item.name}
                        onRequestClose={() => setOpenReview(false)}
                        onSubmit={handleSubmitFromModal}
                    />
                </Modal>
            </View>
        </ScrollView>
    );
}

function Center({ children }: { children: React.ReactNode }) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>{children}</View>;
}

// Card 컴포넌트는 children을 받는데, 그 타입을 React.ReactNode로 설정해서 다양한 자식 요소를 허용하도록 한다. 
function Card({ children }: { children: React.ReactNode }) {
    return <View style={styles.card}>{children}</View>;
}
function ProfileCard({ children }: { children: React.ReactNode }) {
    return <View style={styles.profileCard}>{children}</View>;
}
function Row({ label, value, isLink }: { label: string; value: string; isLink?: boolean }) {
    const handlePress = () => {
        if (isLink && value) {
            Linking.openURL(value);
        }
    };
    return (
        <View style={{ flexDirection: "row", marginTop: 6 }}>
            <Text style={{ fontSize: 16, width: 72, fontWeight: "600" }}>{label}</Text>
            <View style={styles.linkBox}>
                {isLink ? (
                    <TouchableOpacity onPress={handlePress}>
                        <Text style={styles.link}>{value}</Text>
                    </TouchableOpacity>
                ) : (
                    <Text style={styles.link}>{value}</Text>
                )}
            </View>
        </View>
    );
}

function Dots({ label, value }: { label: string; value: number }) {
    return (
        <View style={{ flexDirection: "row", marginVertical: 3, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 15, width: 60, color: "#111827", fontWeight: "800", marginRight: 20, }}>{label}</Text>
            {Array.from({ length: 5 }).map((_, i) => {
                const filled = i < Math.round(value);
                return (
                    <View
                        key={i}
                        style={{
                            width: 20, height: 20, borderRadius: 999, marginRight: 8,
                            borderWidth: 1, borderColor: "lightgray",
                            backgroundColor: filled ? "#FFBF60" : "#FAFAFA",
                        }}
                    />
                );
            })}
        </View>
    );
}
function parseKeywords(kw?: string) {
    if (!kw) return [];
    return kw
        .split(/[,\s#]+/)     // 콤마, 공백, 해시태그 기준 분리
        .map(s => s.trim())
        .filter(Boolean);
}

function Chip({ label }: { label: string }) {
    return (
        <View style={styles.chip}>
            <Text style={styles.chipText}>#{label}</Text>
        </View>
    );
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        padding: 15,
    },
    itemName: {
        fontSize: 28,
        fontWeight: "700",
        textAlign: "center",
        color: "#111827"
    },
    divider: {
        marginHorizontal: -10,
        borderBottomWidth: 4,
        borderBottomColor: "black",
        marginTop: -8,
    },
    card: {
        backgroundColor: "#F5F5F5",
        padding: 20,
        paddingHorizontal: 25,
        gap: 3,
        borderRadius: 8,
        marginBottom: 8,
        marginHorizontal: 5,
    },
    profileCard: {
        padding: 30,
        gap: 5,
        borderRadius: 10,
        marginHorizontal: 20,
        marginBottom: -10,
        backgroundColor: "#FFF7EB",
        borderColor: '#FFD8A8',
        borderWidth: 2,
        borderStyle: 'dashed',
    },
    cardTitle: {
        fontSize: 20,
        textAlign: "center",
        fontWeight: "800",
        marginTop: 50,
        color: "#111827"
    },
    linkBox: {
        flex: 1,
    },
    link: {
        fontSize: 15,
        color: "#555",
    },
    chipsWrap: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginHorizontal: 30,
        justifyContent: "center",
    },
    chip: {
        borderRadius: 999,
        borderWidth: 2,
        borderColor: "#FFD8A8",
        backgroundColor: "#FFD8A8",
        paddingVertical: 5,
        paddingHorizontal: 10,
        marginRight: 8,
        marginBottom: 8,
    },
    chipText: {
        fontSize: 13,
        fontWeight: "800",
        color: "#111827",
    },
    reviewScore: {
        fontSize: 36,
        fontWeight: "800",
        color: "#111827",
        lineHeight: 40,
    },
    author: {
        fontSize: 16,
        fontWeight: "700",
        color: "#111827",
    },
    reviewDate: {
        marginTop: 2,
        fontSize: 13,
        color: "#6B7280",
    },
    reviewCount: {
        width: 70,
        color: "#374151",
    },
    reviewBubble: {
        flex: 1,
        backgroundColor: "white",
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    reviewText: {
        fontSize: 14,
        color: "#111827",
    },
    moreLink: {
        color: "#2563EB",
        fontSize: 13,
    },
});
