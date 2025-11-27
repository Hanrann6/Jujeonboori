// components/PriceRecommend.tsx
import { authedFetch } from "@/app/lib/auth";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useRef, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";

const API_BASE = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/+$/, "");

/** ===== 서버 응답 ===== */
type ApiItem = {
  alcoholId: string | number; // ← 서버가 주는 식별자(숫자 index 또는 문자열)
  name: string;
  alcoholType?: string;
  degree?: number;
  priceValue: number;
  imageUrl?: string;
};

/** ===== 화면 아이템 ===== */
type Item = {
  id: string;               
  name: string;
  degree?: number;
  category: string | undefined;
  priceValue: number;
  imageUrl?: string;
  liked: boolean;           // 서버 북마크 기준
  alcoholIndex?: number;    // 서버 북마크 API용 index(숫자) — 없으면 토글 불가
};

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

/** ===== 카드 ===== */
function Card({ item, onToggle, onOpen }: { item: Item; onToggle: () => void; onOpen: () => void }) {
  return (
    <View style={styles.card}>
      <Image
        source={item.imageUrl ? { uri: item.imageUrl } : require("../../assets/images/bottle_placeholder.png")}
        style={styles.thumb}
        resizeMode="cover"
      />
      <Pressable onPress={onToggle} hitSlop={12} style={styles.heart} accessibilityLabel={item.liked ? "찜 취소" : "찜하기"}>
        <Ionicons name={item.liked ? "heart" : "heart-outline"} size={22} color={item.liked ? "#F59E0B" : "#9CA3AF"} />
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

/** ===== 메인 컴포넌트 ===== */
export default function PriceRecommend({
  maxPrice,
  horizontal = true,
  limit = 10,
}: {
  maxPrice: number;
  title?: string;
  horizontal?: boolean;
  limit?: number;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // 현재 북마크 상태를 들고 있는 ref (토글 직후 일관성 유지용)
  const bookmarkedRef = useRef<Set<number>>(new Set());

  useFocusEffect(
    React.useCallback(() => {
      let alive = true;
      (async () => {
        try {
          setLoading(true);
          setErr(null);

          // 1) 가격 추천 가져오기
          const url = `${API_BASE}/recommend/price?price=${maxPrice}`;
          const res = await authedFetch(url, { method: "GET" });
          const raw = await res.text();
          if (!res.ok) throw new Error(`GET /recommend/price 실패(${res.status}) ${raw}`);
          const data = JSON.parse(raw) as ApiItem[];

          // 2) 서버 북마크 목록(Set) 가져와 ref에 저장
          const bookmarked = await fetchBookmarks();
          bookmarkedRef.current = bookmarked;

          // 3) 추천 → 화면 아이템으로 매핑 (liked는 ref 기준)
          const mapped: Item[] = (data ?? []).slice(0, limit).map((r) => {
            const idx = Number(r.alcoholId);
            const alcoholIndex = Number.isFinite(idx) ? idx : undefined;
            const liked = alcoholIndex != null ? bookmarkedRef.current.has(alcoholIndex) : false;

            return {
              id: String(r.alcoholId ?? r.name),
              name: r.name,
              category: r.alcoholType,
              degree: r.degree,
              imageUrl: r.imageUrl,
              priceValue: r.priceValue,
              liked,
              alcoholIndex,
            };
          });

          if (alive) setItems(mapped);
        } catch (e: any) {
          if (alive) setErr(e?.message || "가격 기반 추천을 불러오는 중 오류가 발생했습니다.");
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => { alive = false; };
    }, [limit, maxPrice]) // ← maxPrice 바뀌면 다시 로드
  );

  return (
    <View style={{ marginTop: 12 }}>
      {loading ? (
        <View style={{ padding: 16, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <ActivityIndicator /><Text style={{ color: "#6B7280" }}>불러오는 중…</Text>
        </View>
      ) : err ? (
        <Text style={{ margin: 16, color: "red" }}>{err}</Text>
      ) : items.length === 0 ? (
        <Text style={{ margin: 16, color: "#6B7280" }}>추천 결과가 없어요.</Text>
      ) : (
        <FlatList
          horizontal={horizontal}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={horizontal ? { paddingHorizontal: 16, gap: 10 } : { padding: 16, rowGap: 12 }}
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={({ item, index }) => {
            const onToggle = async () => {
              if (item.alcoholIndex == null) return; // index 없으면 명세상 토글 불가
              const idx = item.alcoholIndex;
              const willLike = !item.liked;

              try {
                if (willLike) {
                  await addBookmark(idx);
                  bookmarkedRef.current.add(idx);     // ref 동기화
                } else {
                  await removeBookmark(idx);
                  bookmarkedRef.current.delete(idx);  // ref 동기화
                }

                // 화면 갱신
                setItems(prev => prev.map((x, i) => (i === index ? { ...x, liked: willLike } : x)));
              } catch (e) {
                console.log("bookmark toggle failed:", e);
              }
            };

            return (
              <Card
                item={item}
                onToggle={onToggle}
                onOpen={() =>
                  router.push({ pathname: "/(tabs)/(home)/[id]", params: { id: item.id } })
                }
              />
            );
          }}
          numColumns={horizontal ? 1 : 2}
        />
      )}
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
    borderRadius: 10, padding:10, backgroundColor: "#fff",
    position: "relative",
  },
  thumb: { width: "100%", height: 150, borderRadius: 8, backgroundColor: "#F3F4F6" },
  name: { marginTop: 6, fontWeight: "700", color: "#111827" },
  meta: { textAlign: "left", color: "#6B7280", fontSize: 12, marginTop: 2 },
  heart: {
    position: "absolute", top: 15, right: 15,
    width: 28, height: 28, borderRadius: 999,
    backgroundColor: "white", alignItems: "center", justifyContent: "center", elevation: 1,
  },
});
