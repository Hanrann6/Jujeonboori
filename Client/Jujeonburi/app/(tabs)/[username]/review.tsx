// app/(tabs)/[username]/review.tsx

import { authedFetch } from "@/app/lib/auth";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ReviewModal from "../../components/ReviewModal";

/* ---------- API 응답 타입 ---------- */
type ApiMyReview = {
  review_id: number | string;
  alcohol: {
    alcohol_id: number | string;
    name: string;
  };
  rating: number;
  content: string;
  image_url?: string | null; // 리뷰 이미지
  created_at: string;
};

type ApiMyReviewListResponse = {
  reviews: ApiMyReview[];
  total: number;
};

type ApiAlcoholDetail = {
  alcohol_id: number | string;
  name: string;
  category?: string;
  image_url?: string | null;
  // (필요하면 degree, description 등 추가 가능)
};

/* ---------- 화면에서 쓸 타입 ---------- */
type Review = {
  id: string;
  alcoholId: string;
  alcoholName: string;
  rating: number;
  content: string;
  reviewImageUrl?: string;
  createdAt: string;
};

type AlcoholMeta = {
  name: string;
  category: string;
  imageUrl?: string;
};

const API_BASE = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/+$/, "");
const CATEGORY_ORDER = ["탁주", "약주/청주", "증류주", "과실주", "기타 주류"];

const validHttpUrl = (u?: string | null) =>
  !!u && /^https?:\/\//i.test(String(u).trim());

const timeOf = (r: Review) => new Date(r.createdAt).getTime();

const formatKDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

/* ===== 서버 통신 함수들 ===== */

/** 나의 리뷰 목록: GET /users/me/reviews */
async function fetchMyReviews(): Promise<Review[]> {
  const url = `${API_BASE}/users/me/reviews`;

  const res = await authedFetch(url, { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.log("[MyReviews] fetchMyReviews error", res.status, text);
    return [];
  }

  const data = (await res.json()) as ApiMyReviewListResponse;

  return (data.reviews || []).map((r) => ({
    id: String(r.review_id),
    alcoholId: String(r.alcohol.alcohol_id),
    alcoholName: r.alcohol.name,
    rating: r.rating,
    content: r.content,
    reviewImageUrl: r.image_url ?? undefined,
    createdAt: r.created_at,
  }));
}

/** 전통주 메타데이터: GET /alcohols/{alcohol_id} */
async function fetchAlcoholMeta(alcoholId: string): Promise<AlcoholMeta | null> {
  const url = `${API_BASE}/alcohols/${encodeURIComponent(alcoholId)}`;

  const res = await authedFetch(url, { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.log("[MyReviews] fetchAlcoholMeta error", alcoholId, res.status, text);
    return null;
  }

  const j = (await res.json()) as ApiAlcoholDetail;

  return {
    name: j.name,
    category: j.category || "기타 주류",
    imageUrl: validHttpUrl(j.image_url) ? String(j.image_url) : undefined,
  };
}

/** 리뷰 수정: PATCH /users/me/reviews/{review_id} */
async function patchReviewOnServer(
  reviewId: string,
  payload: { rating: number; content: string; images?: { uri: string }[] }
): Promise<boolean> {
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

  const url = `${API_BASE}/users/me/reviews/${encodeURIComponent(reviewId)}`;
  const res = await authedFetch(url, {
    method: "PATCH",
    body: form,
  });

  const text = await res.text().catch(() => "");
  console.log("[MyReviews] patch", res.status, text);

  if (!res.ok) {
    Alert.alert("리뷰 수정 실패", "잠시 후 다시 시도해 주세요.");
    return false;
  }
  return true;
}

/** 리뷰 삭제: DELETE /users/me/reviews/{review_id} */
async function deleteReviewOnServer(reviewId: string): Promise<boolean> {
  const url = `${API_BASE}/users/me/reviews/${encodeURIComponent(reviewId)}`;
  const res = await authedFetch(url, { method: "DELETE" });
  const text = await res.text().catch(() => "");
  console.log("[MyReviews] delete", res.status, text);

  if (!res.ok) {
    Alert.alert("리뷰 삭제 실패", "잠시 후 다시 시도해 주세요.");
    return false;
  }
  return true;
}

/* ================= 컴포넌트 ================= */

export default function MyReviewsByCategory() {
  const router = useRouter();

  const [nickname, setNickname] = useState<string>("익명");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [editing, setEditing] = useState<Review | null>(null);

  // alcoholId → { name, category, imageUrl }
  const [metaMap, setMetaMap] = useState<Map<string, AlcoholMeta>>(new Map());

  /* 닉네임 (헤더용) */
  useEffect(() => {
    (async () => {
      const nick = (await AsyncStorage.getItem("nickname")) ?? "";
      setNickname(nick);
    })();
  }, []);

  /* alcohol 메타데이터 채우기 */
  const loadMetaFor = useCallback(
    async (list: Review[]) => {
      const ids = Array.from(new Set(list.map((r) => r.alcoholId)));
      const missingIds = ids.filter((id) => !metaMap.has(id));
      if (!missingIds.length) return;

      const results = await Promise.all(
        missingIds.map(async (id) => {
          const meta = await fetchAlcoholMeta(id);
          return { id, meta };
        })
      );

      setMetaMap((prev) => {
        const next = new Map(prev);
        for (const { id, meta } of results) {
          if (meta) next.set(id, meta);
        }
        return next;
      });
    },
    [metaMap]
  );

  /* 내 리뷰 목록 로드 */
  const load = useCallback(async () => {
    setLoading(true);
    const mine = await fetchMyReviews();
    mine.sort((a, b) => timeOf(b) - timeOf(a));
    setReviews(mine);
    setLoading(false);

    // 메타데이터도 같이 로드
    await loadMetaFor(mine);
  }, [loadMetaFor]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const mine = await fetchMyReviews();
    mine.sort((a, b) => timeOf(b) - timeOf(a));
    setReviews(mine);
    setRefreshing(false);

    await loadMetaFor(mine);
  }, [loadMetaFor]);

  useEffect(() => {
    load();
  }, [load]);

  /* 주종별 섹션 나누기 */
  const sections = useMemo(() => {
    const buckets = new Map<string, Review[]>();

    for (const r of reviews) {
      const meta = metaMap.get(r.alcoholId);
      const cat = meta?.category || "기타 주류";
      const list = buckets.get(cat) || [];
      list.push(r);
      buckets.set(cat, list);
    }

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
      {/* 섹션 리스트 (주종별) */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>
              <Text style={styles.nick}>{nickname || "익명"}</Text>님의 리뷰
            </Text>
            <Text style={{ marginTop: 10, marginLeft: 15, color: "gray" }}>
              {reviews.length}건
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={{ color: "#6B7280" }}>아직 작성한 리뷰가 없어요.</Text>
          </View>
        }
        contentContainerStyle={{paddingHorizontal: 16, paddingBottom: 24 }}

        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>• {section.title}</Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        SectionSeparatorComponent={() => <View style={{ height: 16 }} />}
        renderItem={({ item }) => {
          const meta = metaMap.get(item.alcoholId);
          const name = meta?.name || item.alcoholName;
          const thumb = meta?.imageUrl;

          // 나의 리뷰 목록이므로 전부 수정/삭제 가능
          const canEdit = true;

          return (
            <ScrollView>
              <Pressable
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/(home)/reviewList",
                  params: {
                    alcohol_id: String(item.alcoholId),
                    alcoholName: name,
                  },
                })
              }
              style={styles.card}
            >
              {/* 전통주 썸네일 */}
              {thumb ? (
                <Image source={{ uri: thumb }} style={styles.thumb} />
              ) : (
                <View
                  style={[styles.thumb, { backgroundColor: "#F3F4F6" }]}
                />
              )}

              {/* 텍스트 영역 */}
              <View style={{ flex: 1 }}>
                <View style={{ alignItems: "flex-start" }}>
                  <Text
                    style={styles.cardTitle}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {name}
                  </Text>
                  <Text style={styles.cardDate}>
                    {formatKDate(item.createdAt)}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 2,
                    }}
                  >
                    <Text style={styles.stars}>
                      {"⭐".repeat(Math.round(Number(item.rating) || 0))}
                    </Text>
                  </View>
                </View>
                <Text
                  style={styles.snippet}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {item.content}
                </Text>
              </View>

              {/* 수정/삭제 아이콘 */}
              {canEdit && (
                <View style={styles.cardIcons}>
                  <TouchableOpacity
                    onPress={() => setEditing(item)}
                    accessibilityLabel="리뷰 수정"
                  >
                    <Ionicons
                      name="create-outline"
                      size={18}
                      color="#374151"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert("리뷰 삭제", "정말 이 리뷰를 삭제할까요?", [
                        { text: "취소" },
                        {
                          text: "삭제",
                          style: "destructive",
                          onPress: async () => {
                            const ok = await deleteReviewOnServer(item.id);
                            if (!ok) return;
                            const mine = await fetchMyReviews();
                            mine.sort((a, b) => timeOf(b) - timeOf(a));
                            setReviews(mine);
                            await loadMetaFor(mine);
                          },
                        },
                      ]);
                    }}
                    style={{ marginLeft: 8 }}
                    accessibilityLabel="리뷰 삭제"
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color="#EF4444"
                    />
                  </TouchableOpacity>
                </View>
              )}
            </Pressable>
            </ScrollView>
          );
        }}
      />

      {/* 리뷰 수정 모달 */}
      <Modal
        visible={!!editing}
        animationType="slide"
        onRequestClose={() => setEditing(null)}
      >
        <ReviewModal
          key={editing?.id ?? "edit"}
          mode="edit"
          alcoholName={
            (editing && (metaMap.get(editing.alcoholId)?.name || editing.alcoholName)) ||
            ""
          }
          defaultRating={editing?.rating ?? 0}
          defaultContent={editing?.content ?? ""}
          defaultImages={
            editing?.reviewImageUrl ? [{ uri: editing.reviewImageUrl }] : []
          }
          onRequestClose={() => setEditing(null)}
          onSubmit={async (payload) => {
            if (!editing) return;

            const ok = await patchReviewOnServer(editing.id, {
              rating: payload.rating,
              content: payload.content,
              images: payload.images,
            });
            if (!ok) return;

            const mine = await fetchMyReviews();
            mine.sort((a, b) => timeOf(b) - timeOf(a));
            setReviews(mine);
            await loadMetaFor(mine);
            setEditing(null);
          }}
        />
      </Modal>
    </View>
  );
}

/* ---------- 스타일 ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  headerContainer: {
    margin: 20,
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  nick: {
    color: "#F59E0B",
    fontWeight: "800",
  },

  sectionHeader: {
    justifyContent: "center",
    marginTop: 12,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    textAlign: "left",
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },

  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#808080",
    borderRadius: 10,
    padding: 10,
    position: "relative",
    marginHorizontal: 15,
  },
  thumb: { width: 84, height: 84, borderRadius: 8, marginRight: 10 },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    maxWidth: "70%",
  },
  cardDate: { fontSize: 12, color: "#6B7280" },
  stars: { color: "#111827", fontWeight: "700" },
  snippet: { marginTop: 4, color: "#374151", fontSize: 13, lineHeight: 18 },

  cardIcons: {
    position: "absolute",
    right: 8,
    top: 8,
    flexDirection: "row",
  },
});
