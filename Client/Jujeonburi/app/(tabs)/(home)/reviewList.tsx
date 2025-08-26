import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ReviewModal from "../../components/ReviewModal";

type Review = {
  id: string;
  alcoholId: string;
  rating: number;
  content: string;
  images?: { uri: string }[];
  createdAt: number;
  author?: string;
};

//AsyncStorage에 저장된 리뷰 목록을 가져와서 렌더링 
const keyFor = (alcoholId: string) => `@reviews:${alcoholId}`;
async function getReviews(alcoholId: string): Promise<Review[]> {
  const raw = await AsyncStorage.getItem(keyFor(alcoholId));
  return raw ? JSON.parse(raw) : [];
}
//리뷰를 삭제하는 함수
async function removeReview(alcoholId: string, reviewId: string): Promise<Review[]> {
  const list: Review[] = await getReviews(alcoholId);
  const next = list.filter(r => r.id !== reviewId);
  await AsyncStorage.setItem(keyFor(alcoholId), JSON.stringify(next));
  return next;
}
//리뷰를 업데이트하는 함수
type ReviewPatch = Partial<Pick<Review, "rating" | "content" | "images" | "author">>;

async function updateReview(alcoholId: string, reviewId: string, patch: ReviewPatch): Promise<Review[]> {
  const list: Review[] = await getReviews(alcoholId);
  const next = list.map(r =>
    r.id === reviewId ? { ...r, ...patch, updatedAt: Date.now() } : r
  );
  await AsyncStorage.setItem(keyFor(alcoholId), JSON.stringify(next));
  return next;
}

const formatKDate = (ts: number) =>
  new Date(ts).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

function sortReviews(list: Review[]) {
  const toNum = (v: any) => {
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };
  return [...list].sort((a, b) => {
    const an = toNum(a.id), bn = toNum(b.id);
    if (an != null && bn != null) return bn - an;              // id 숫자면 id 내림차순
    return (b.createdAt ?? 0) - (a.createdAt ?? 0);            // 아니면 작성일 내림차순
  });
}

export default function ReviewList() {
  const router = useRouter();
  const { alcoholId, alcoholName } = useLocalSearchParams<{ alcoholId: string; alcoholName?: string }>();

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Review | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const count = reviews.length;
  const [nickname, setNickname] = useState<string>("익명");
  const resolvedAlcoholName = Array.isArray(alcoholName) ? alcoholName[0] : (alcoholName ?? "");

  // 닉네임 로드
  useEffect(() => {
    (async () => {
      const nick = (await AsyncStorage.getItem("nickname")) ?? "";
      setNickname(nick);
    })();
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!alcoholId) {
        if (mounted) setLoading(false);
        return;
      }
      const list = await getReviews(String(alcoholId));
      if (mounted) {
        setReviews(sortReviews(list));
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [alcoholId]);


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
          {alcoholName}
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
            // 작성자만 수정/삭제 허용(작성자 정보가 없으면 누구나 가능)
            const me = (nickname || "익명").trim();
            const canEdit = !!item.author && item.author.trim() === me;
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
                      alcoholName: resolvedAlcoholName, // 상단에서 받은 이름 그대로 전달
                    },
                  })
                }
              >
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                  {/* 작성자 표시는 필요에 따라 item.author로 바꿔도 됨 */}
                  <Text style={styles.author}>{item.author ?? "익명"}</Text>
                  <Text style={styles.itemDate}>{formatKDate(item.createdAt)}</Text>

                  {/* 오른쪽 정렬을 위한 스페이서 */}
                  <View style={{ flex: 1 }} />

                  {canEdit && (
                    <TouchableOpacity
                      onPress={() => setEditing(item)}            // 수정 모달 오픈
                      style={{ padding: 6 }}
                      accessibilityLabel="리뷰 수정"
                    >
                      <Ionicons name="create-outline" size={18} color="#374151" />
                    </TouchableOpacity>
                  )}

                  {/* 삭제도 작성자만 허용하려면 canEdit로 감싸면 됨 */}
                  {canEdit && (
                    <TouchableOpacity
                      onPress={() => {
                        Alert.alert("리뷰 삭제", "정말 이 리뷰를 삭제할까요?", [
                          { text: "취소" },
                          {
                            text: "삭제",
                            style: "destructive",
                            onPress: async () => {
                              const next = await removeReview(item.alcoholId, item.id);
                              setReviews(sortReviews(next));
                            },
                          },
                        ]);
                      }}
                      style={{ padding: 6 }}
                      accessibilityLabel="리뷰 삭제"
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                  <Text style={styles.itemStars}>{"⭐".repeat(Math.round(Number(item.rating) || 0))}</Text>
                </View>
                <Text style={styles.itemContent}>{item.content}</Text>

                {!!item.images?.length && (
                  <View style={styles.imagesWrap}>
                    {item.images!.map((img, idx) => (
                      <Image
                        key={idx}
                        source={{ uri: img.uri }}
                        style={{ width: 64, height: 64, borderRadius: 8, marginRight: 8, marginTop: 8 }}
                      />
                    ))}
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
          mode="edit"                                // ← ReviewModal에 추가할 prop
          alcoholName={resolvedAlcoholName}
          defaultRating={editing?.rating ?? 0}       // ← 초기값 주입
          defaultContent={editing?.content ?? ""}
          defaultImages={editing?.images ?? []}
          onRequestClose={() => setEditing(null)}
          onSubmit={async (payload) => {
            if (!editing) return;
            const next = await updateReview(editing.alcoholId, editing.id, {
              rating: payload.rating,
              content: payload.content,
              images: payload.images,
            });
            setReviews(sortReviews(next));
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
    justifyContent: "center"
  },
  summaryCount: {
    marginBottom:10,

    fontSize: 12,
    color: "#374151"
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  headerSub: { fontSize: 12, color: "#6B7280" },
  summaryBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginHorizontal: 20,
  },
  summaryScore: { 
    fontSize: 28, fontWeight: "800", color: "#111827" },

  itemCard: {
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    padding: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginTop: 15,
    marginBottom:5,

  },
  itemStars: { fontWeight: "700", marginRight: 8, color: "#111827" },
  itemDate: {
    marginLeft: 10,
    marginTop: 5,
    color: "#6B7280",
    fontSize: 12
  },
  itemContent: { marginTop: 4, color: "black", fontSize: 14, lineHeight: 20 },
  imagesWrap: { flexDirection: "row", flexWrap: "wrap" },
  author: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
});
