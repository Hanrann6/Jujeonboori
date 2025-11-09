import { authedFetch } from "@/app/lib/auth";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";

const API_BASE = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/+$/, "");

/** ===== 서버 응답 ===== */
type ApiItem = {
  alcoholId: string | number;
  name: string;
  degree?: number;
  imageUrl?: string;
};

type Item = {
  id: string;
  name: string;
  degree?: number;
  imageUrl?: string;
  liked: boolean;
};

/** ===== 로컬 찜 ===== */
const FAV_KEY = "@fav:alcohol";
async function getFavIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(FAV_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}
async function setFavIds(ids: string[]) {
  await AsyncStorage.setItem(FAV_KEY, JSON.stringify([...new Set(ids)]));
}
async function toggleFav(id: string): Promise<boolean> {
  const list = await getFavIds();
  const has = list.includes(id);
  const next = has ? list.filter(x => x !== id) : [...list, id];
  await setFavIds(next);
  return !has;
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
        {!!item.degree && <Text style={styles.meta}>{item.degree}%</Text>}
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

  useFocusEffect(
    React.useCallback(() => {
      let alive = true;
      (async () => {
        try {
          setLoading(true);
          const url = `${API_BASE}/recommend/price?price=${maxPrice}`;
          //console.log("[price-url]", url);

          const res = await authedFetch(url, { method: "GET" });
          const raw = await res.text();
          if (!res.ok) throw new Error(`GET /recommend/price 실패(${res.status}) ${raw}`);
          const data = JSON.parse(raw) as ApiItem[];
          const favs = await getFavIds();

          const mapped: Item[] = (data ?? []).slice(0, limit).map((r) => {
            const id = String(r.alcoholId);
            return {
              id,
              name: r.name,
              degree: r.degree,
              imageUrl: r.imageUrl,
              liked: favs.includes(id),
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
              const next = await toggleFav(item.id);
              setItems((prev) => prev.map((x, i) => (i === index ? { ...x, liked: next } : x)));
            };
            return (
              <Card
                item={item}
                onToggle={onToggle}
                onOpen={() => router.push({ pathname: "/(tabs)/(home)/[id]", params: { id: item.id } })}
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
    width: 140,

    borderWidth: 1, borderColor: "#E5E7EB",
    borderRadius: 10, padding: 8, backgroundColor: "#fff",
    position: "relative",
  },
  thumb: { width: "100%", height: 150, borderRadius: 8, backgroundColor: "#F3F4F6" },
  name: { marginTop: 6, fontWeight: "700", color: "#111827" },
  meta: { color: "#6B7280", fontSize: 12 },
  heart: {
    position: "absolute", top: 5, right: 5,
    width: 28, height: 28, borderRadius: 999,
    backgroundColor: "white", alignItems: "center", justifyContent: "center", elevation: 1,
  },
});
