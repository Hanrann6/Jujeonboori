import { authedFetch } from "@/app/lib/auth";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ReviewModal from "../../components/ReviewModal";

/* ---------- API 응답 타입 ---------- */
type ApiReview = {
  review_id: number | string;
  author: {
    user_id: string;
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

/* ---------- 화면에서 쓸 리뷰 타입 ---------- */
type Review = {
  id: string;
  alcoholId: string;
  rating: number;
  content: string;
  imageUrl?: string;
  createdAt: string;          // 문자열 그대로 두고 포맷할 때 Date로 변환
  authorNickname: string;
};

const API_BASE = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/+$/, "");

/* ---------- 특정 전통주 리뷰 목록 조회 API ---------- */
async function fetchReviewsByAlcoholId(alcoholId: string): Promise<Review[]> {
  const url = `${API_BASE}/alcohols/${encodeURIComponent(alcoholId)}/reviews`;

  const res = await authedFetch(url, { method: "GET" });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.log("[ReviewList] fetchReviewsByAlcoholId error", res.status, text);
    return [];
  }

  const data = (await res.json()) as ApiReviewListResponse;

  return (data.reviews || []).map((r) => ({
    id: String(r.review_id),
    alcoholId,
    rating: r.rating,
    content: r.content,
    imageUrl: r.image_url ?? undefined,
    createdAt: r.created_at,
    authorNickname: r.author?.nickname ?? "익명",
  }));
}
/** 리뷰 수정(PATCH /users/me/reviews/{review_id}) */
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
  console.log("[patchReviewOnServer]", res.status, text);

  if (!res.ok) {
    Alert.alert("리뷰 수정 실패", "잠시 후 다시 시도해 주세요.");
    return false;
  }
  return true;
}

/** 리뷰 삭제(DELETE /users/me/reviews/{review_id}) */
async function deleteReviewOnServer(reviewId: string): Promise<boolean> {
  const url = `${API_BASE}/users/me/reviews/${encodeURIComponent(reviewId)}`;

  const res = await authedFetch(url, { method: "DELETE" });
  const text = await res.text().catch(() => "");
  console.log("[deleteReviewOnServer]", res.status, text);

  if (!res.ok) {
    Alert.alert("리뷰 삭제 실패", "잠시 후 다시 시도해 주세요.");
    return false;
  }
  return true;
}
const formatKDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export default function ReviewList() {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [editing, setEditing] = useState<Review | null>(null); // 아직 서버 수정/삭제 API 없으면 안 써도 됨
  const [nickname, setNickname] = useState<string>("익명");
  const router = useRouter();
  const { alcohol_id, alcoholName } = useLocalSearchParams<{
    alcohol_id: string;
    alcoholName?: string;
  }>();

  const resolvedAlcoholId = Array.isArray(alcohol_id) ? alcohol_id[0] : alcohol_id;
  const resolvedAlcoholName = Array.isArray(alcoholName)
    ? alcoholName[0]
    : alcoholName ?? "";

  useEffect(() => {
    (async () => {
      const nick = (await AsyncStorage.getItem("nickname")) ?? "";
      setNickname(nick || "익명");
    })();
  }, []);
  const count = reviews.length;

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!resolvedAlcoholId) {
        if (mounted) setLoading(false);
        return;
      }

      setLoading(true);
      const list = await fetchReviewsByAlcoholId(resolvedAlcoholId);
      if (mounted) {
        setReviews(list);
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [resolvedAlcoholId]);

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
      {/* 상단 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {resolvedAlcoholName}
        </Text>
      </View>
      <View style={styles.divider} />

      {/* 요약 바 */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryCount}>{count}건의 리뷰</Text>
      </View>

      {/* 목록 */}
      {count === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: "#6B7280" }}>아직 작성된 리뷰가 없어요.</Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          renderItem={({ item }) => {
            const me = (nickname || "익명").trim();
            const canEdit = item.authorNickname.trim() === me;   // 내가 쓴 리뷰인지 체크

            return (
              <TouchableOpacity
                style={styles.itemCard}
                activeOpacity={0.85}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/(home)/review/[reviewId]",
                    params: {
                      reviewId: item.id,
                      alcoholId: item.alcoholId,
                      alcoholName: resolvedAlcoholName,
                    },
                  })
                }
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <Text style={styles.author}>{item.authorNickname}</Text>
                  <Text style={styles.itemDate}>{formatKDate(item.createdAt)}</Text>

                  {/* 오른쪽 정렬용 spacer */}
                  <View style={{ flex: 1 }} />

                  {canEdit && (
                    <>
                      {/* 수정 버튼 */}
                      <TouchableOpacity
                        onPress={() => setEditing(item)}
                        style={{ padding: 6 }}
                        accessibilityLabel="리뷰 수정"
                      >
                        <Ionicons name="create-outline" size={18} color="#374151" />
                      </TouchableOpacity>

                      {/* 삭제 버튼 */}
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert("리뷰 삭제", "정말 이 리뷰를 삭제할까요?", [
                            { text: "취소", style: "cancel" },
                            {
                              text: "삭제",
                              style: "destructive",
                              onPress: async () => {
                                const ok = await deleteReviewOnServer(item.id);
                                if (!ok) return;

                                // 로컬 목록에서도 제거
                                setReviews(prev => prev.filter(r => r.id !== item.id));
                              },
                            },
                          ]);
                        }}
                        style={{ padding: 6 }}
                        accessibilityLabel="리뷰 삭제"
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </>
                  )}
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <Text style={styles.itemStars}>
                    {"⭐".repeat(Math.round(Number(item.rating) || 0))}
                  </Text>
                </View>

                <Text style={styles.itemContent}>{item.content}</Text>

                {item.imageUrl && (
                  <View style={styles.imagesWrap}>
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 8,
                        marginRight: 8,
                        marginTop: 8,
                      }}
                    />
                  </View>
                )}
              </TouchableOpacity>
            );
          }}

        />
      )}
      <Modal
        visible={!!editing}
        animationType="slide"
        onRequestClose={() => setEditing(null)}
      >
        <ReviewModal
          mode="edit"
          alcoholName={resolvedAlcoholName}
          defaultRating={editing?.rating ?? 0}
          defaultContent={editing?.content ?? ""}
          defaultImages={
            editing?.imageUrl ? [{ uri: editing.imageUrl }] : []
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

            if (!ok) return;

            const list = await fetchReviewsByAlcoholId(resolvedAlcoholId);
            setReviews(list);
            setEditing(null);
          }}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 15,
    justifyContent: "center",
  },
  summaryCount: {
    marginBottom: 10,
    fontSize: 12,
    color: "#374151",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  summaryBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginHorizontal: 20,
  },
  itemCard: {
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    padding: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginTop: 15,
    marginBottom: 5,
  },
  itemStars: { fontWeight: "700", marginRight: 8, color: "#111827" },
  itemDate: {
    marginLeft: 10,
    marginTop: 5,
    color: "#6B7280",
    fontSize: 12,
  },
  itemContent: { marginTop: 4, color: "black", fontSize: 14, lineHeight: 20 },
  imagesWrap: { flexDirection: "row", flexWrap: "wrap" },
  author: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
});
