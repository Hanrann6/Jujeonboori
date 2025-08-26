// app/(tabs)/(home)/[reviewId].tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ReviewModal from "../../../components/ReviewModal";

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

const keyFor = (alcoholId: string) => `@reviews:${alcoholId}`;

async function getReviews(alcoholId: string): Promise<Review[]> {
  const raw = await AsyncStorage.getItem(keyFor(alcoholId));
  return raw ? JSON.parse(raw) : [];
}
async function getReviewById(alcoholId: string, reviewId: string): Promise<Review | null> {
  const list = await getReviews(alcoholId);
  return list.find(r => r.id === reviewId) ?? null;
}
async function updateReview(alcoholId: string, reviewId: string, patch: Partial<Pick<Review, "rating" | "content" | "images">>) {
  const list = await getReviews(alcoholId);
  const next = list.map(r => r.id === reviewId ? { ...r, ...patch, updatedAt: Date.now() } : r);
  await AsyncStorage.setItem(keyFor(alcoholId), JSON.stringify(next));
  return next.find(r => r.id === reviewId) ?? null;
}
async function removeReview(alcoholId: string, reviewId: string) {
  const list = await getReviews(alcoholId);
  const next = list.filter(r => r.id !== reviewId);
  await AsyncStorage.setItem(keyFor(alcoholId), JSON.stringify(next));
}

const fmtDate = (ts?: number) =>
  new Date(ts ?? 0).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

export default function ReviewDetail() {
  const router = useRouter();
  const { reviewId, alcoholId, alcoholName } = useLocalSearchParams<{ reviewId: string; alcoholId: string; alcoholName?: string }>();

  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState<Review | null>(null);
  const [nickname, setNickname] = useState<string>("익명");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    (async () => {
      const nick = (await AsyncStorage.getItem("nickname")) ?? "";
      setNickname(nick);
    })();
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!alcoholId || !reviewId) { setLoading(false); return; }
      const r = await getReviewById(String(alcoholId), String(reviewId));
      if (mounted) { setReview(r ?? null); setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [alcoholId, reviewId]);

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
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: "#2563EB" }}>뒤로가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const canEdit = (review.author || "익명").trim() === (nickname || "익명").trim();

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* 본문 */}
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.card}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={styles.author}>{review.author ?? "익명"}</Text>
            <Text style={styles.date}>{fmtDate(review.createdAt)}</Text>
          </View>

          <View style={{ flexDirection: "row", marginTop: 8 }}>
            <Text style={styles.stars}>{"⭐".repeat(Math.round(Number(review.rating) || 0))}</Text>
          </View>

          {/*이미지 먼저 보이고 그 다음에 내용 렌더링 */}
          {!!review.images?.length && (
            <View style={styles.imagesWrap}>
              {review.images.map((img, i) => (
                <Image key={`${review.id}-${i}`} source={{ uri: img.uri }} style={styles.image} />
              ))}
            </View>
          )}
          <View>
            <Text style={styles.content}>{review.content}</Text>
          </View>
        </View>
      </ScrollView>

      {/* 하단 버튼 */}
      <View >
        {canEdit && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Text>목록</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditing(true)} style={styles.iconBtn} accessibilityLabel="리뷰 수정">
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
                      await removeReview(review.alcoholId, review.id);
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
      <Modal visible={editing} animationType="slide" onRequestClose={() => setEditing(false)}>
        <ReviewModal
          key={review.id}
          mode="edit"
          alcoholName={alcoholName ? String(alcoholName) : ""}
          defaultRating={review.rating}
          defaultContent={review.content}
          defaultImages={review.images ?? []}
          onRequestClose={() => setEditing(false)}
          onSubmit={async (payload) => {
            const me = (nickname || "익명").trim();
            if ((review.author || "익명").trim() !== me) return;
            const updated = await updateReview(review.alcoholId, review.id, {
              rating: payload.rating,
              content: payload.content,
              images: payload.images,
            });
            if (updated) setReview(updated);
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
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#EEE",
  },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "800", color: "#111827" },
  headerRight: { width: 72, flexDirection: "row", justifyContent: "flex-end" },
  buttonContainer: {
    gap: 10,
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    justifyContent: "flex-end",
    alignItems: "center",
    margin:15
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
  image: { width: 130, height: 130, borderRadius: 8, marginRight: 8, marginTop: 8 },
});
