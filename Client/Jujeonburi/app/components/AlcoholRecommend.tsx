// app/components/AlcoholRecommend.tsx
import { authedFetch } from "@/app/lib/auth";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";

const API_BASE = process.env.EXPO_PUBLIC_API_URL;

/* ====== API 타입 (변경된 스펙) ====== */
type ApiRec = {
  alcoholId: string | number;  
  name: string;
  degree?: number;
  imageUrl: string;           
};
// 이제 응답은 배열 그대로 내려옴
type ApiRes = ApiRec[];

/* ====== 화면 아이템 ====== */
type RecItem = {
  id: string;
  name: string;
  degree?: number;
  imageUrl?: string;
  liked: boolean;
};

/* ====== 로컬 찜 저장 ====== */
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

/* ====== 추천 카드 ====== */
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
      <Pressable onPress={onToggle} hitSlop={12} style={styles.heart} accessibilityLabel={item.liked ? "찜 취소" : "찜하기"}>
        <Ionicons name={item.liked ? "heart" : "heart-outline"} size={23} style={{ marginTop: 2 }}
          color={item.liked ? "#F59E0B" : "#9CA3AF"} />
      </Pressable>

      <Pressable onPress={onOpen} android_ripple={{ color: "#F3F4F6" }}>
        <Text numberOfLines={2} style={styles.name}>{item.name}</Text>
        {!!item.degree && <Text style={styles.meta}>{item.degree}%</Text>}
      </Pressable>
    </View>
  );
}

/* ====== 메인 컴포넌트 ====== */
export default function AlcoholRecommend({ limit = 5 }: { limit?: number }) {
  const [items, setItems] = useState<RecItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await authedFetch(`${API_BASE}/recommend/`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        const raw = await res.text();
        // 개발 중 로그 확인 원하면 활성화
        // console.log("[recommend] status:", res.status);
        // console.log("[recommend] raw:", raw);

        if (!res.ok) throw new Error(`GET /recommend/실패(${res.status}) ${raw}`);

        const data = JSON.parse(raw) as ApiRes;  // ← 배열로 파싱
        const localFavs = await getFavIds();

        const mapped: RecItem[] = (data ?? []).slice(0, limit).map((r, i) => {
          const id = String(r?.alcoholId ?? r?.name ?? `idx-${i}`); // 안전한 키
          return {
            id,
            degree: r.degree,
            name: r.name,
            imageUrl: r.imageUrl,
            liked: localFavs.includes(id), // 서버 is_bookmarked 없어져서 로컬만 사용
          };
        });

        // 혹시 중복 키가 있으면 유일화
        const uniq = Array.from(new Map(mapped.map(m => [m.id, m])).values());

        setItems(uniq);
      } catch (e: any) {
        setErr(e?.message || "추천을 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, [limit]);

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
            const next = await toggleFav(item.id);
            setItems(prev => prev.map((x, i) => (i === index ? { ...x, liked: next } : x)));
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


/* ===== PriceRecommend와 동일한 스타일 ===== */
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