// app/(tabs)/(home)/review/[reviewId].tsx
import { authedFetch } from "@/app/lib/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ReviewModal from "../../../components/ReviewModal";

/* ---------- API 타입 ---------- */
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
  createdAt: string;          
  authorNickname: string;
};

const API_BASE = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/+$/, "");

/* ---------- 특정 전통주 리뷰 목록 조회 후 하나 선택 ---------- */
async function fetchReviewDetail(
  alcoholId: string,
  reviewId: string
): Promise<Review | null> {
  const url = `${API_BASE}/alcohols/${encodeURIComponent(alcoholId)}/reviews`;

  const res = await authedFetch(url, { method: "GET" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.log("[ReviewDetail] fetchReviewDetail error", res.status, text);
    return null;
  }

  const data = (await res.json()) as ApiReviewListResponse;

  const target = (data.reviews || []).find(
    (r) => String(r.review_id) === String(reviewId)
  );
  if (!target) return null;

  return {
    id: String(target.review_id),
    alcoholId,
    rating: target.rating,
    content: target.content,
    imageUrl: target.image_url ?? undefined,
    createdAt: target.created_at,
    authorNickname: target.author?.nickname ?? "익명",
  };
}

/** 리뷰 수정  */
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
  console.log("[ReviewDetail patch]", res.status, text);

  if (!res.ok) {
    Alert.alert("리뷰 수정 실패", "잠시 후 다시 시도해 주세요.");
    return false;
  }
  return true;
}

/** 리뷰 삭제 */
async function deleteReviewOnServer(reviewId: string): Promise<boolean> {
  const url = `${API_BASE}/users/me/reviews/${encodeURIComponent(reviewId)}`;
  const res = await authedFetch(url, { method: "DELETE" });
  const text = await res.text().catch(() => "");
  console.log("[ReviewDetail delete]", res.status, text);

  if (!res.ok) {
    Alert.alert("리뷰 삭제 실패", "잠시 후 다시 시도해 주세요.");
    return false;
  }
  return true;
}

const fmtDate = (iso?: string) =>
  new Date(iso ?? "").toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export default function ReviewDetail() {
  const router = useRouter();
  const { reviewId, alcoholId, alcoholName } = useLocalSearchParams<{
    reviewId: string;
    alcoholId: string;
    alcoholName?: string;
  }>();

  const resolvedAlcoholId = Array.isArray(alcoholId) ? alcoholId[0] : alcoholId;
  const resolvedReviewId = Array.isArray(reviewId) ? reviewId[0] : reviewId;
  const resolvedAlcoholName = Array.isArray(alcoholName)
    ? alcoholName[0]
    : alcoholName ?? "";

  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState<Review | null>(null);
  const [nickname, setNickname] = useState<string>("익명");
  const [editing, setEditing] = useState(false);

  // 내 닉네임 로드
  useEffect(() => {
    (async () => {
      const nick = (await AsyncStorage.getItem("nickname")) ?? "";
      setNickname(nick || "익명");
    })();
  }, []);

  // 리뷰 상세 로드
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!resolvedAlcoholId || !resolvedReviewId) {
        setLoading(false);
        return;
      }
      const r = await fetchReviewDetail(resolvedAlcoholId, resolvedReviewId);
      if (mounted) {
        setReview(r);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [resolvedAlcoholId, resolvedReviewId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>불러오는 중…</Text>
      </View>
    );
  }

  if (!review) {
    return (
      <View style={styles.center}>
        <Text>리뷰를 찾을 수 없어요.</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 12 }}
        >
          <Text style={{ color: "#2563EB" }}>뒤로가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const canEdit =
    review.authorNickname.trim() === (nickname || "익명").trim();

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* (옵션) 상단에 술 이름 보여주고 싶으면 추가 */}
      {resolvedAlcoholName ? (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{resolvedAlcoholName}</Text>
        </View>
      ) : null}

      {/* 본문 */}
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.card}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={styles.author}>{review.authorNickname}</Text>
            <Text style={styles.date}>{fmtDate(review.createdAt)}</Text>
          </View>

          <View style={{ flexDirection: "row", marginTop: 8 }}>
            <Text style={styles.stars}>
              {"⭐".repeat(Math.round(Number(review.rating) || 0))}
            </Text>
          </View>

          {/* 이미지 먼저 */}
          {review.imageUrl && (
            <View style={styles.imagesWrap}>
              <Image
                source={{ uri: review.imageUrl }}
                style={styles.image}
              />
            </View>
          )}

          <View>
            <Text style={styles.content}>{review.content}</Text>
          </View>
        </View>
      </ScrollView>

      {/* 하단 버튼 */}
      <View>
        {canEdit && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.iconBtn}
            >
              <Text>목록</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setEditing(true)}
              style={styles.iconBtn}
              accessibilityLabel="리뷰 수정"
            >
              <Text>수정</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                Alert.alert("리뷰 삭제", "정말 삭제할까요?", [
                  { text: "취소" },
                  {
                    text: "삭제",
                    style: "destructive",
                    onPress: async () => {
                      const ok = await deleteReviewOnServer(review.id);
                      if (!ok) return;
                      router.back();
                    },
                  },
                ]);
              }}
              style={styles.iconBtn}
              accessibilityLabel="리뷰 삭제"
            >
              <Text style={{ color: "#DC2626" }}>삭제</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 수정 모달 */}
      <Modal
        visible={editing}
        animationType="slide"
        onRequestClose={() => setEditing(false)}
      >
        <ReviewModal
          key={review.id}
          mode="edit"
          alcoholName={resolvedAlcoholName}
          defaultRating={review.rating}
          defaultContent={review.content}
          defaultImages={
            review.imageUrl ? [{ uri: review.imageUrl }] : []
          }
          onRequestClose={() => setEditing(false)}
          onSubmit={async (payload) => {
            const me = (nickname || "익명").trim();
            if (review.authorNickname.trim() !== me) return;

            const ok = await patchReviewOnServer(review.id, {
              rating: payload.rating,
              content: payload.content,
              images: payload.images,
            });
            if (!ok) return;

            // 수정 후 최신 상태 다시 로드
            const refreshed = await fetchReviewDetail(
              resolvedAlcoholId,
              resolvedReviewId
            );
            if (refreshed) setReview(refreshed);

            setEditing(false);
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
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  buttonContainer: {
    gap: 10,
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    justifyContent: "flex-end",
    alignItems: "center",
    margin: 15,
  },
  iconBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#828282",
    alignSelf: "flex-end",
  },
  card: { backgroundColor: "#FAFAFA", borderRadius: 12, padding: 14 },
  author: { fontSize: 16, fontWeight: "700", color: "#111827" },
  date: { marginLeft: 8, marginTop: 2, fontSize: 12, color: "#6B7280" },
  stars: { color: "#111827", fontWeight: "700" },
  content: { marginTop: 10, color: "#111827", fontSize: 14, lineHeight: 20 },
  imagesWrap: { flexDirection: "row", flexWrap: "wrap", marginTop: 10 },
  image: {
    width: 130,
    height: 130,
    borderRadius: 8,
    marginRight: 8,
    marginTop: 8,
  },
});
