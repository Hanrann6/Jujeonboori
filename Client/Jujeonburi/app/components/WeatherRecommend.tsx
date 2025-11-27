// components/WeatherRecommend.tsx
import { authedFetch } from "@/app/lib/auth";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";

const API_BASE = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/+$/, "");
const KEY_TEMP = "@weather:temperature";
const KEY_PTY = "@weather:pty";

type ApiItem = {
  alcoholId: string | number;
  name: string;
  degree?: number;
  alcoholType?: string;
  imageUrl?: string;
  priceValue?: number;
};

type Item = {
  id: string;
  name: string;
  degree?: number;
  category?: string;
  priceValue?: number;
  imageUrl?: string;
  liked: boolean;
  alcoholIndex?: number; // 북마크 API용 인덱스
};

/** ===== 북마크 API (서버) ===== */
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
  console.log(JSON.stringify({ alcoholIndex }));
  const raw = await res.text();
  console.log("addBookmark response:", raw);
  if (!res.ok) throw new Error(`POST /bookmark 실패(${res.status}) ${raw}`);
}

async function removeBookmark(alcoholIndex: number) {
  const res = await authedFetch(`${API_BASE}/bookmark`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ alcoholIndex }),
  });
  console.log(JSON.stringify({ alcoholIndex }));

  const raw = await res.text();
  console.log("deleteBookmark response:", raw);
  if (!res.ok) throw new Error(`DELETE /bookmark 실패(${res.status}) ${raw}`);
}

/** ===== 카드  ===== */
function RecCard({ item, onToggle, onOpen }: { item: Item; onToggle: () => void; onOpen: () => void }) {
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
export default function WeatherRecommend({
  temperature: temperatureFallback,
  precipitationType: ptyFallback,
  horizontal = true,
  limit = 10,
}: {
  temperature?: number;        // Optional fallback
  precipitationType?: number;  // Optional fallback
  horizontal?: boolean;
  limit?: number;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const toNum = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  useFocusEffect(
    React.useCallback(() => {
      let alive = true;
      (async () => {
        try {
          setLoading(true);
          setErr(null);

          // 1) 저장된 날씨 값 읽기
          const [tRaw, pRaw] = await Promise.all([
            AsyncStorage.getItem(KEY_TEMP),
            AsyncStorage.getItem(KEY_PTY),
          ]);

          // 2) 기본값 치환 (fallback)
          const temperature = toNum(tRaw) ?? 15;   // ← fallback 15
          const pty = toNum(pRaw) ?? 1;    // ← fallback 1

          // 추천 데이터 호출
          const qs = new URLSearchParams();
          qs.set("temperature", String(temperature));
          qs.set("precipitationType", String(pty));
          const url = `${API_BASE}/recommend/weather?${qs.toString()}`;
          console.log("WeatherRecommend fetch url:", url);
          const res = await authedFetch(url, { method: "GET" });
          const raw = await res.text();
          if (!res.ok) throw new Error(`GET /recommend/weather 실패(${res.status}) ${raw}`);
          const data = JSON.parse(raw) as ApiItem[];

          // 3) 서버 북마크 목록 읽기 → Set<number>
          const bookmarked = await fetchBookmarks();

          // 4) 매핑
          const mapped: Item[] = (data ?? []).slice(0, limit).map((r) => {
            const alcoholIndex = Number(r.alcoholId);

            return {
              id: String(r.alcoholId ?? r.name),
              name: r.name,
              degree: r.degree,
              category: r.alcoholType,
              priceValue: r.priceValue,
              imageUrl: r.imageUrl,
              liked: alcoholIndex != null ? bookmarked.has(alcoholIndex) : false,
              alcoholIndex,
            };
          });

          if (alive) setItems(mapped);
        } catch (e: any) {
          if (alive) setErr(e?.message || "날씨 기반 추천을 불러오는 중 오류가 발생했습니다.");
        } finally {
          if (alive) setLoading(false);
        }
      })();

      return () => { alive = false; };
    }, [limit])
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
              if (item.alcoholIndex == null) {
                return;
              }

              const ai = item.alcoholIndex;
              const willLike = !item.liked;

              try {
                if (willLike) {
                  await addBookmark(ai);
                } else {
                  await removeBookmark(ai);
                }

                setItems(prev =>
                  prev.map((x, i) => (i === index ? { ...x, liked: willLike } : x))
                );
              } catch (e) {
                console.log("bookmark toggle failed:", e);
              }
            };

            return (
              <RecCard
                item={item}
                onToggle={onToggle}
                onOpen={() => router.push({
                  pathname: "/(tabs)/(home)/[id]",
                  params: { id: item.id, alcoholName: item.name }
                })}
              />
            );
          }}
          numColumns={horizontal ? 1 : 2}
        />
      )}
    </View>
  );
}

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
  meta: { textAlign: "left", color: "#6B7280", fontSize: 12, marginTop: 2 },
  heart: {
    position: "absolute", top: 15, right: 15,
    width: 28, height: 28, borderRadius: 999,
    backgroundColor: "white", alignItems: "center", justifyContent: "center", elevation: 1,
  },
});
