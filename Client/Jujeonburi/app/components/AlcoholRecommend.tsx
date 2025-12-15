// app/components/AlcoholRecommend.tsx
import { authedFetch } from "@/app/lib/auth";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";

const API_BASE = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/+$/, "");

/* ====== API 타입 ====== */
type ApiRec = {
  alcoholId: string | number;
  name: string;
  alcoholType: string;
  degree: number;
  imageUrl: string;
  priceValue: number;
};
type ApiRes = ApiRec[];

/* ====== 화면 아이템 ====== */
type RecItem = {
  id: string;
  name: string;
  degree: number;
  priceValue: number;
  category: string;
  imageUrl: string;
  liked: boolean;         // 서버 북마크 기준
  alcoholIndex?: number;  // 북마크 API용 숫자 인덱스(없으면 토글 불가)
};

/* ====== 북마크 API ====== */
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

/* ====== 카드 ====== */
function RecCard({ item, onToggle, onOpen }: {
  item: RecItem; onToggle: () => void; onOpen: () => void;
}) {
  return (
    <View style={styles.card}>
      <Image
        source={item.imageUrl ? { uri: item.imageUrl } : require("../../assets/images/bottle_placeholder.png")}
        style={styles.thumb}
        resizeMode="cover"
      />
      <Pressable
        onPress={onToggle}
        hitSlop={12}
        style={styles.heart}
        accessibilityLabel={item.liked ? "찜 취소" : "찜하기"}
      >
        <Ionicons
          name={item.liked ? "heart" : "heart-outline"}
          size={23}
          style={{ marginTop: 2 }}
          color={item.liked ? "#F59E0B" : "#9CA3AF"}
        />
      </Pressable>

      <Pressable onPress={onOpen} android_ripple={{ color: "#F3F4F6" }}>
        <Text numberOfLines={2} style={styles.name}>{item.name}</Text>
        {!!item.category && <Text style={styles.meta}>{item.category} • {!!item.degree && <Text style={styles.meta}>{item.degree}%</Text>}
          {!!item.priceValue && <Text style={styles.meta}>{'\n'}₩{item.priceValue.toLocaleString()}</Text>}
        </Text>}
      </Pressable>
    </View>
  );
}

/* ====== 메인 컴포넌트 ====== */
export default function AlcoholRecommend({ limit = 10 }: { limit?: number }) {
  const [items, setItems] = useState<RecItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      let alive = true;
      (async () => {
        try {
          setLoading(true);
          setErr(null);

          // 1) 추천 목록
          const res = await authedFetch(`${API_BASE}/recommend/`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });
          const raw = await res.text();
          if (!res.ok) throw new Error(`GET /recommend 실패(${res.status}) ${raw}`);
          const data = JSON.parse(raw) as ApiRes;

          // 2) 서버 북마크 세트
          const bookmarked = await fetchBookmarks();

          // 3) 매핑 + liked 채우기
          const source = (data ?? []).slice().reverse();  // 역순 정렬

          const mapped: RecItem[] = source.slice(0, limit).map((r, i) => {
            const idStr = String(r?.alcoholId ?? r?.name ?? `idx-${i}`);
            const idx = Number(r.alcoholId);
            const alcoholIndex = Number.isFinite(idx) ? idx : undefined;
            const liked = alcoholIndex != null ? bookmarked.has(alcoholIndex) : false;

            return {
              id: idStr,
              degree: r.degree,
              name: r.name,
              category: r.alcoholType,
              imageUrl: r.imageUrl,
              priceValue: r.priceValue,
              liked,
              alcoholIndex,
            };
          });

          // 중복 제거
          const uniq = Array.from(new Map(mapped.map(m => [m.id, m])).values());

          if (alive) setItems(uniq);
        } catch (e: any) {
          if (alive) setErr(e?.message || "추천을 불러오는 중 오류가 발생했습니다.");
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => { alive = false; };
    }, [limit]));

  if (loading) return <Text style={{ margin: 16, color: "#6B7280" }}>추천을 준비 중…</Text>;
  if (err) return <Text style={{ margin: 16, color: "red" }}>오류: {err}</Text>;
  if (items.length === 0) return <Text style={{ margin: 16, color: "#6B7280" }}>추천 결과가 없어요.</Text>;

  return (
    <View style={{ marginTop: 12 }}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
        data={items}
        keyExtractor={(it, i) => it.id || `idx-${i}`}
        renderItem={({ item, index }) => {
          const onToggle = async () => {
            // 숫자 index 없으면(문자형 id만 있을 때) 서버 명세상 토글 불가
            if (item.alcoholIndex == null) {
              console.log("bookmark toggle skipped: alcoholIndex is not numeric", item.id);
              return;
            }
            const willLike = !item.liked;
            try {
              if (willLike) await addBookmark(item.alcoholIndex);
              else await removeBookmark(item.alcoholIndex);

              setItems(prev => prev.map((x, i) => (i === index ? { ...x, liked: willLike } : x)));
            } catch (e) {
              console.log("bookmark toggle failed:", e);
            }
          };

          return (
            <RecCard
              item={item}
              onToggle={onToggle}
              onOpen={() => router.push({ pathname: "/(tabs)/(home)/[id]", params: { id: item.id } })}
            />
          );
        }}
      />
    </View>
  );
}

/* ===== 스타일 ===== */
const styles = StyleSheet.create({
  headerRow: { paddingHorizontal: 16, marginBottom: 6, flexDirection: "row", alignItems: "center" },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  priceChip: { color: "#F59E0B" },
  card: {
    width: 160,
    minHeight: 200,
    borderWidth: 1, borderColor: "#E5E7EB",
    borderRadius: 10, padding: 10, backgroundColor: "#fff",
    position: "relative",
  },
  thumb: { width: "100%", height: 150, borderRadius: 8, backgroundColor: "#F3F4F6" },
  name: { marginTop: 6, fontWeight: "700", color: "#111827" },
  meta: { color: "#6B7280", fontSize: 12 },
  heart: {
    position: "absolute", top: 15, right: 15,
    width: 28, height: 28, borderRadius: 999,
    backgroundColor: "white", alignItems: "center", justifyContent: "center", elevation: 1,
  },
});
