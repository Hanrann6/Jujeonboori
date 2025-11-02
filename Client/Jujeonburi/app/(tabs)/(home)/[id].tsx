// app/(tabs)/(home)/[id].tsx
// 전통주 상세페이지 (API 사용) + 리뷰 저장은 로컬(AsyncStorage)

import { authedFetch } from "@/app/lib/auth";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ReviewModal from "../../components/ReviewModal";

/* ---------- API & 화면 타입 ---------- */
type ApiAlcoholDetail = {
  alcohol_id: string;
  name: string;
  description?: string;
  category?: string;
  degree?: number;          // 도수
  volume?: string;
  price?: string;
  price_value?: number;
  sweetness?: number;
  sourness?: number;
  freshness?: number;
  body?: number;
  food?: string;
  ingredients?: string;
  keywords?: string[] | string;
  brewery?: string;
  location?: string;
  representative?: string;
  contact?: string;
  website?: string;
  image_url?: string;
  average_rating?: number;
  review_count?: number;
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
  keywords?: string;     // 화면에서는 문자열로 보관
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

const API_BASE = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/+$/, "");
const validHttpUrl = (u?: string) => !!u && /^https?:\/\//i.test(u.trim());
const parseKeywords = (kw?: string) =>
  !kw ? [] : kw.split(/[,\s#]+/).map(s => s.trim()).filter(Boolean);

/* ---------- API 호출 ---------- */
async function fetchAlcoholDetailById(id: string): Promise<AlcoholItem | null> {
  const res = await authedFetch(`${API_BASE}/alcohols/${encodeURIComponent(id)}`, {
    method: "GET",
  });
  if (!res.ok) return null;

  const j = (await res.json()) as ApiAlcoholDetail;
  return {
    alcohol_id: String(j.alcohol_id),
    name: j.name,
    sweetness: Number(j.sweetness ?? 0),
    sourness: Number(j.sourness ?? 0),
    freshness: Number(j.freshness ?? 0),
    body: Number(j.body ?? 0),
    abv: Number(j.degree ?? 0),
    category: j.category ?? "",
    keywords: Array.isArray(j.keywords) ? j.keywords.join(", ") : (j.keywords || undefined),
    imageUrl: validHttpUrl(j.image_url) ? j.image_url : undefined,
    volume: j.volume,
    price: j.price ?? (j.price_value != null ? `${j.price_value.toLocaleString()}원` : undefined),
    manufacturer: undefined,
    ingredients: j.ingredients,
    pairings: j.food,
    detailUrl: undefined,
    brewery: j.brewery,
    description: j.description,
    representative: j.representative,
    address: j.location,
    contact: j.contact,
    website: j.website,
  };
}

/* ---------- 리뷰 로컬 저장 ---------- */
export type Review = {
  id: string;
  alcoholId: string;
  rating: number;
  content: string;
  images?: { uri: string }[];
  createdAt: number;
  author?: string;
};
const keyFor = (alcoholId: string) => `@reviews:${alcoholId}`;
async function getReviews(alcoholId: string) {
  const raw = await AsyncStorage.getItem(keyFor(alcoholId));
  return raw ? JSON.parse(raw) : [];
}
async function addReview(review: Review) {
  const list = await getReviews(review.alcoholId);
  const next = [review, ...list];
  await AsyncStorage.setItem(keyFor(review.alcoholId), JSON.stringify(next));
  return next;
}
function pickTopReview(list: Review[]) {
  if (!list?.length) return null;
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

/* ---------- 컴포넌트 ---------- */
export default function AlcoholDetailRoute() {
  const router = useRouter();
  // 이 페이지는 **id(= alcohol_id)** 로만 진입한다고 가정
  const { id } = useLocalSearchParams<{ id: string }>();

  const [item, setItem] = useState<AlcoholItem | null>(null);
  const [loading, setLoading] = useState(true);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [topReview, setTopReview] = useState<Review | null>(null);
  const [openReview, setOpenReview] = useState(false);
  const [nickname, setNickname] = useState<string>("익명");

  // 상세 로드
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const targetId = Array.isArray(id) ? id[0] : id;
        if (targetId) {
          const detail = await fetchAlcoholDetailById(targetId);
          setItem(detail);
        } else {
          setItem(null);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // 닉네임 & 리뷰
  useEffect(() => {
    (async () => {
      const nick = (await AsyncStorage.getItem("nickname")) ?? "";
      setNickname(nick || "익명");
    })();
  }, []);
  const loadReviews = useCallback(async () => {
    if (!item?.alcohol_id) return;
    const list = await getReviews(String(item.alcohol_id));
    setReviews(list);
  }, [item?.alcohol_id]);
  useFocusEffect(React.useCallback(() => { loadReviews(); }, [loadReviews]));
  useEffect(() => { loadReviews(); }, [loadReviews]);
  useEffect(() => { setTopReview(pickTopReview(reviews)); }, [reviews]);

  const avgRating = useMemo(() => {
    if (!reviews?.length) return 0;
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    return sum / reviews.length;
  }, [reviews]);

  const handleSubmitFromModal = async (payload: { rating: number; content: string; images?: { uri: string }[] }) => {
    if (!item) return;
    const review: Review = {
      id: String(Date.now()),
      alcoholId: String(item.alcohol_id),
      rating: payload.rating,
      content: payload.content,
      images: payload.images,
      createdAt: Date.now(),
      author: (await AsyncStorage.getItem("nickname")) || "익명",
    };
    await addReview(review);
    setReviews(prev => [review, ...prev]);
    setOpenReview(false);
  };
  useEffect(() => {
    if (!id || typeof id !== "string") {
      // 스택 히스토리까지 정리하고 홈으로
      router.replace("/(tabs)/(home)");
    }
  }, [id]);

  if (!id || typeof id !== "string") return null;
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

      <Card>
        <Row label="종류" value={item.category ?? ""} />
        <Row label="원재료" value={item.ingredients ?? ""} />
        <Row label="도수" value={item.abv ? `${item.abv}%` : ""} />
        <Row label="용량" value={item.volume ?? ""} />
        <Row label="가격" value={item.price ?? ""} />
      </Card>

      <Text style={styles.cardTitle}>제품 설명</Text>
      <View>
        <ProfileCard>
          {item.sweetness ? <Dots label="단맛" value={item.sweetness} /> : null}
          {item.sourness ? <Dots label="신맛" value={item.sourness} /> : null}
          {item.freshness ? <Dots label="청량감" value={item.freshness} /> : null}
          {item.body ? <Dots label="바디감" value={item.body} /> : null}
        </ProfileCard>
      </View>
      {item.pairings && <Text style={{ fontSize: 14, marginHorizontal: 20, color: "black" }}>{item.pairings}</Text>}
      {item.keywords && (
        <View style={styles.chipsWrap}>
          {parseKeywords(item.keywords).map((k, i) => (<Chip key={`${k}-${i}`} label={k} />))}
        </View>
      )}

      <Text style={styles.cardTitle}>양조장</Text>
      <Card>
        {item.brewery ? <Row label="양조장" value={item.brewery} /> : null}
        {item.representative ? <Row label="대표자" value={item.representative} /> : null}
        {item.address ? <Row label="주소" value={item.address} /> : null}
        {item.contact ? <Row label="연락처" value={item.contact} /> : null}
        {item.website && <Row label="상세" value={item.website} isLink />}
      </Card>

      <View>
        <View style={{ padding: 20, flexDirection: "row", alignItems: "center" }}>
          <Text style={[styles.cardTitle, { flex: 1 }]}>리뷰/평점</Text>
          <TouchableOpacity
            onPress={() => setOpenReview(true)}
            style={{ position: "absolute", right: 0, padding: 10, top: 62 }}
            accessibilityLabel="리뷰 작성"
          >
            <Ionicons name="add-circle-outline" size={24} color="#111827" />
          </TouchableOpacity>
        </View>

        <Card>
          {topReview ? (
            <View style={[styles.card, { padding: 0 }]}>
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <Text style={styles.reviewScore}>{avgRating.toFixed(1)}</Text>
                <View style={{ flex: 1, marginLeft: 30 }}>
                  <Text style={styles.author}>{nickname}</Text>
                  <Text style={styles.reviewDate}>
                    {new Date(topReview.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", marginTop: 10 }}>
                <View style={{ width: 70, justifyContent: "center", alignItems: "center" }}>
                  <Text style={styles.reviewCount}>리뷰({reviews.length}건)</Text>
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/(home)/reviewList",
                        params: { alcoholId: String(item.alcohol_id), alcoholName: item.name },
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

        <Modal visible={openReview} animationType="slide" onRequestClose={() => setOpenReview(false)}>
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

/* ---------- 보조 컴포넌트 & 스타일 ---------- */
function Center({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>{children}</View>;
}
function Card({ children }: { children: React.ReactNode }) { return <View style={styles.card}>{children}</View>; }
function ProfileCard({ children }: { children: React.ReactNode }) { return <View style={styles.profileCard}>{children}</View>; }

function Row({ label, value, isLink }: { label: string; value: string; isLink?: boolean }) {
  const handlePress = () => { if (isLink && value) Linking.openURL(value); };
  return (
    <View style={{ flexDirection: "row", marginTop: 6 }}>
      <Text style={{ fontSize: 16, width: 72, fontWeight: "600" }}>{label}</Text>
      <View style={styles.linkBox}>
        {isLink ? <TouchableOpacity onPress={handlePress}><Text style={styles.link}>{value}</Text></TouchableOpacity>
          : <Text style={styles.link}>{value}</Text>}
      </View>
    </View>
  );
}

function Dots({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flexDirection: "row", marginVertical: 3, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 15, width: 60, color: "#111827", fontWeight: "800", marginRight: 20 }}>{label}</Text>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < Math.round(value);
        return (
          <View key={i} style={{
            width: 20, height: 20, borderRadius: 999, marginRight: 8,
            borderWidth: 1, borderColor: "lightgray",
            backgroundColor: filled ? "#FFBF60" : "#FAFAFA",
          }} />
        );
      })}
    </View>
  );
}

function Chip({ label }: { label: string }) {
  return <View style={styles.chip}><Text style={styles.chipText}>#{label}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 15 },
  itemName: { fontSize: 28, fontWeight: "700", textAlign: "center", color: "#111827" },
  divider: { marginHorizontal: -10, borderBottomWidth: 4, borderBottomColor: "black", marginTop: -8 },
  card: { backgroundColor: "#F5F5F5", padding: 20, paddingHorizontal: 25, gap: 3, borderRadius: 8, marginBottom: 8, marginHorizontal: 5 },
  profileCard: { padding: 30, gap: 5, borderRadius: 10, marginHorizontal: 20, marginBottom: -10, backgroundColor: "#FFF7EB", borderColor: '#FFD8A8', borderWidth: 2, borderStyle: 'dashed' },
  cardTitle: { fontSize: 20, textAlign: "center", fontWeight: "800", marginTop: 50, color: "#111827" },
  linkBox: { flex: 1 },
  link: { fontSize: 15, color: "#555" },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: 30, justifyContent: "center" },
  chip: { borderRadius: 999, borderWidth: 2, borderColor: "#FFD8A8", backgroundColor: "#FFD8A8", paddingVertical: 5, paddingHorizontal: 10, marginRight: 8, marginBottom: 8 },
  chipText: { fontSize: 13, fontWeight: "800", color: "#111827" },
  reviewScore: { fontSize: 36, fontWeight: "800", color: "#111827", lineHeight: 40 },
  author: { fontSize: 16, fontWeight: "700", color: "#111827" },
  reviewDate: { marginTop: 2, fontSize: 13, color: "#6B7280" },
  reviewCount: { width: 70, color: "#374151" },
  reviewBubble: { flex: 1, backgroundColor: "white", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  reviewText: { fontSize: 14, color: "#111827" },
  moreLink: { color: "#2563EB", fontSize: 13 },
});
