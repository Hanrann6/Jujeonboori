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
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ReviewModal from "../../components/ReviewModal";

/* ---------- 상세페이지 API 타입 ---------- */
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
//---------- 리뷰 작성 API 타입 ----------
type ReviewSubmitPayload = {
  rating: number;
  content: string;
  images?: { uri: string }[];
};

// ---------- 리뷰 불러오기 API 타입 ----------
type ApiReview = {
  review_id: number;
  author: {
    user_id: number;
    nickname: string;
  };
  rating: number;
  content: string;
  image_url?: string | null;
  created_at: string;
};

type ApiReviewListResponse = {
  reviews: ApiReview[];
  total: number;
};

type Review = {
  id: string;
  rating: number;
  content: string;
  imageUrl?: string;
  createdAt: string;
  authorNickname: string;
};

const API_BASE = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/+$/, "");
const validHttpUrl = (u?: string) => !!u && /^https?:\/\//i.test(u.trim());
const parseKeywords = (kw?: string) =>
  !kw ? [] : kw.split(/[,\s#]+/).map(s => s.trim()).filter(Boolean);

// ---------- 상세페이지 API 호출 ---------- 
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

// ---------- 특정 전통주 리뷰 목록 조회 API ----------
async function fetchReviewsByAlcoholId(alcoholId: string): Promise<Review[]> {
  const url = `${API_BASE}/alcohols/${encodeURIComponent(alcoholId)}/reviews`;

  const res = await authedFetch(url, { method: "GET" });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.log("[fetchReviewsByAlcoholId] error", res.status, text);
    return [];
  }

  const data = (await res.json()) as ApiReviewListResponse;

  return (data.reviews || []).map((r) => ({
    id: String(r.review_id),
    rating: r.rating,
    content: r.content,
    imageUrl: r.image_url ?? undefined,
    createdAt: r.created_at,
    authorNickname: r.author?.nickname ?? "익명",
  }));
}
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

/* ---------- 컴포넌트 ---------- */
export default function AlcoholDetailRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // 북마크 api 호출시 사용
  const targetIdStr = Array.isArray(id) ? id[0] : id;
  const targetIdNum = targetIdStr ? Number(targetIdStr) : NaN;

  const [item, setItem] = useState<AlcoholItem | null>(null);
  const [loading, setLoading] = useState(true);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [topReview, setTopReview] = useState<Review | null>(null);
  const [openReview, setOpenReview] = useState(false);
  const [nickname, setNickname] = useState<string>("익명");
  const [bookmarks, setBookmarks] = useState<Set<number>>(new Set());

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
  useFocusEffect(
    useCallback(() => {
      let active = true;

      (async () => {
        const nick = (await AsyncStorage.getItem("nickname")) ?? "";
        if (active) {
          setNickname(nick || "익명");
        }
      })();

      return () => {
        active = false;
      };
    }, [])
  );

  //찜
  useFocusEffect(
    useCallback(() => {
      let active = true;

      (async () => {
        try {
          const set = await fetchBookmarks();   // Set<number>
          if (active) {
            setBookmarks(set);
          }
        } catch (e) {
          console.log("[bookmark] load error", e);
        }
      })();

      return () => {
        active = false;
      };
    }, [])
  );

  const loadReviews = useCallback(async () => {
    const targetId = Array.isArray(id) ? id[0] : id;
    if (!targetId) return;

    const list = await fetchReviewsByAlcoholId(targetId);
    setReviews(list);
  }, [id]);

  const onToggle = useCallback(async () => {
    if (!targetIdStr) return;
    const alcoholIndex = Number(targetIdStr);
    if (Number.isNaN(alcoholIndex)) return;

    const isLiked = bookmarks.has(alcoholIndex);

    try {
      if (isLiked) {
        // 이미 찜 상태 → 삭제
        await removeBookmark(alcoholIndex);
        setBookmarks(prev => {
          const next = new Set(prev);
          next.delete(alcoholIndex);
          return next;
        });
      } else {
        // 찜 추가
        await addBookmark(alcoholIndex);
        setBookmarks(prev => {
          const next = new Set(prev);
          next.add(alcoholIndex);
          return next;
        });
      }
    } catch (e) {
      console.log("[bookmark] toggle error", e);
      Alert.alert("찜 실패", "잠시 후 다시 시도해 주세요.");
    }
  }, [targetIdStr, bookmarks]);

  useFocusEffect(React.useCallback(() => { loadReviews(); }, [loadReviews]));
  useEffect(() => { loadReviews(); }, [loadReviews]);
  useEffect(() => { setTopReview(pickTopReview(reviews)); }, [reviews]);

  const avgRating = useMemo(() => {
    if (!reviews?.length) return 0;
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    return sum / reviews.length;
  }, [reviews]);

  const handleSubmitFromModal = async (payload: {
    rating: number;
    content: string;
    images?: { uri: string }[];
  }) => {
    const targetId = Array.isArray(id) ? id[0] : id;
    if (!targetId) return;

    try {
      const form = new FormData();
      form.append("rating", String(payload.rating));
      form.append("content", payload.content.trim());

      if (payload.images && payload.images.length > 0) {
        const first = payload.images[0];
        form.append("image", {
          uri: first.uri,
          name: "review.jpg",
          type: "image/jpeg",
        } as any);
      }

      const url = `${API_BASE}/alcohols/${encodeURIComponent(targetId)}/reviews`;
      const res = await authedFetch(url, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.log("[handleSubmitFromModal] error", res.status, text);
        Alert.alert("리뷰 등록 실패", "잠시 후 다시 시도해 주세요.");
        return;
      }

      const data = await res.json();
      console.log("created review:", data);

      // 새로 등록된 리뷰까지 포함해서 목록 다시 불러오기
      await loadReviews();
      setOpenReview(false);
    } catch (e) {
      console.log(e);
      Alert.alert("리뷰 등록 실패", "네트워크 상태를 확인하고 다시 시도해 주세요.");
    }
  };

  useEffect(() => {
    if (!id || typeof id !== "string") {
      router.replace("/(tabs)/(home)");
    }
  }, [id]);

  if (!id || typeof id !== "string") return null;
  if (loading) return <Center><ActivityIndicator /><Text style={{ marginTop: 8 }}>불러오는 중…</Text></Center>;
  if (!item) return <Center><Text>해당 전통주를 찾지 못했어요.</Text></Center>;
  const liked = targetIdNum && bookmarks.has(targetIdNum);
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, gap: 20 }}>
      <Image
        source={item.imageUrl ? { uri: item.imageUrl } : require("../../../assets/images/bottle_placeholder.png")}
        style={{ width: 250, height: 300, alignSelf: "center" }}
        resizeMode="contain"
      />

      <View style={styles.titleRow}>

        <Text style={styles.itemName}>{item.name}</Text>

        {/* 오른쪽 찜 영역 */}
        <View style={styles.bookmarkWrap}>
          <Text style={styles.bookmarkLabel}>찜</Text>
          <Pressable
            onPress={onToggle}
            hitSlop={12}
            style={styles.heart}
            accessibilityLabel={liked ? "찜 취소" : "찜하기"}
          >
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={22}
              color={liked ? "#F59E0B" : "#9CA3AF"}
            />
          </Pressable>
        </View>
      </View>
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
      {
        item.keywords && (
          <View style={styles.chipsWrap}>
            {parseKeywords(item.keywords).map((k, i) => (<Chip key={`${k}-${i}`} label={k} />))}
          </View>
        )
      }

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
                  <Text style={styles.author}>{topReview.authorNickname}</Text>
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
                        params: { alcohol_id: String(item.alcohol_id), alcoholName: item.name },
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
    </ScrollView >
  );
}

/* ---------- 보조 컴포넌트 & 스타일 ---------- */
function pickTopReview(list: Review[]): Review | null {
  if (!list.length) return null;

  // 평점 높은 순, 같으면 최신 순
  return list.reduce((best, cur) => {
    if (!best) return cur;
    if (cur.rating > best.rating) return cur;
    if (cur.rating < best.rating) return best;

    const tCur = new Date(cur.createdAt).getTime();
    const tBest = new Date(best.createdAt).getTime();
    return tCur > tBest ? cur : best;
  }, list[0]);
}

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
  divider: { marginHorizontal: -10, borderBottomWidth: 2, borderBottomColor: "black", marginTop: -8 },
  card: { backgroundColor: "#F5F5F5", padding: 20, paddingHorizontal: 25, gap: 3, borderRadius: 8, marginBottom: 8, marginHorizontal: 5 },
  profileCard: { padding: 30, gap: 5, borderRadius: 10, marginHorizontal: 20, marginBottom: -10, backgroundColor: "#FFF7EB", borderColor: '#FFD8A8', borderWidth: 2, borderStyle: 'dashed' },
  cardTitle: { fontSize: 20, textAlign: "center", fontWeight: "800", marginTop: 50, color: "#111827" },
  linkBox: { flex: 1 },
  link: { fontSize: 15, color: "black" },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: 30, justifyContent: "center" },
  chip: { borderRadius: 999, borderWidth: 2, borderColor: "#FFD8A8", backgroundColor: "#FFD8A8", paddingVertical: 5, paddingHorizontal: 10, marginRight: 8, marginBottom: 8 },
  chipText: { fontSize: 13, fontWeight: "800", color: "#111827" },
  reviewScore: { fontSize: 40, fontWeight: "800", color: "#111827", lineHeight: 50 },
  author: { fontSize: 16, fontWeight: "700", color: "#111827" },
  reviewDate: { marginTop: 2, fontSize: 13, color: "#6B7280" },
  reviewCount: { width: 70, color: "#374151" },
  reviewBubble: { marginLeft: 10, width: 180, backgroundColor: "white", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  reviewText: { fontSize: 14, color: "#111827" },
  moreLink: { color: "#2563EB", fontSize: 13 },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  itemName: {
    flex: 10,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "left",
    color: "#111827",
  },
  bookmarkWrap: {
    flex:1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop:10,
  },
  bookmarkLabel: {
    fontSize: 12,
    color: "#4B5563",
  },
  heart: {
    width: 30, height: 30,
    borderRadius: 999,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    elevation: 1,
  },
});
