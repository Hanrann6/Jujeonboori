// app/(tabs)/[username]/bookmark.tsx
import { authedFetch } from "@/app/lib/auth";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

const API_BASE = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/+$/, "");

/** ===== API 타입 ===== */
type BookmarkRow = { alcoholIndex: number };
type ApiAlcohol = {
  alcohol_id: number | string;
  name: string;
  image_url?: string;
  category?: string;
  priceValue?: number;
  degree?: number;
};
type ApiAlcoholListResp = { alcohols: ApiAlcohol[] };

type Item = {
  alcoholIndex: number;        // 서버 북마크 토글에 사용
  idForRoute: string;          // 상세 페이지 파라미터
  name: string;
  imageUrl?: string;
  category?: string;
  priceValue?: number;
  degree?: number;
};

/** ===== 북마크 api ===== */
async function fetchBookmarks(): Promise<number[]> {
  const res = await authedFetch(`${API_BASE}/bookmark`, { method: "GET" });
  const raw = await res.text();
  if (!res.ok) throw new Error(`GET /bookmark 실패(${res.status}) ${raw}`);
  const rows = JSON.parse(raw) as BookmarkRow[];
  return (rows || []).map(r => Number(r.alcoholIndex)).filter(n => Number.isFinite(n));
}

async function deleteBookmark(alcoholIndex: number) {
  const res = await authedFetch(`${API_BASE}/bookmark`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ alcoholIndex }),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`DELETE /bookmark 실패(${res.status}) ${raw}`);
}

async function fetchAlcoholMeta(ids: number[]): Promise<Map<number, ApiAlcohol>> {
  const map = new Map<number, ApiAlcohol>();
  if (ids.length === 0) return map;

  try {
    const qs = new URLSearchParams();
    qs.set("ids", ids.join(","));
    const url = `${API_BASE}/alcohols?${qs.toString()}`;
    const res = await authedFetch(url, { method: "GET" });
    const raw = await res.text();
    if (res.ok) {
      const data = JSON.parse(raw) as ApiAlcoholListResp;
      for (const a of data.alcohols || []) {
        const key = Number(a.alcohol_id);
        if (Number.isFinite(key)) map.set(key, a);
      }
      const missing = ids.filter(id => !map.has(id));
      if (missing.length === 0) return map;
      ids = missing;
    } else {
      throw new Error(raw);
    }
  } catch {
  }

  await Promise.all(
    ids.map(async (id) => {
      if (map.has(id)) return;
      const tryUrls = [
        `${API_BASE}/alcohols/${id}`,
        `${API_BASE}/alcohols?id=${id}`,
      ];
      for (const url of tryUrls) {
        try {
          const res = await authedFetch(url, { method: "GET" });
          const raw = await res.text();
          if (!res.ok) continue;
          const parsed = JSON.parse(raw);
          const a: ApiAlcohol | undefined =
            Array.isArray(parsed?.alcohols)
              ? parsed.alcohols[0]
              : parsed;
          if (a && (a.alcohol_id ?? a.name)) {
            map.set(id, a);
            break;
          }
        } catch {
        }
      }
    })
  );

  return map;
}


/** ===== 컴포넌트 ===== */
export default function BookmarkScreen() {
  const router = useRouter();
  const [nickname, setNickname] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 닉네임
  useEffect(() => {
    (async () => {
      setNickname((await AsyncStorage.getItem("nickname")) ?? "");
    })();
  }, []);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      // 1) 북마크 인덱스 목록
      const ids = await fetchBookmarks();

      // 2) 메타 조회
      const metaMap = await fetchAlcoholMeta(ids);

      // 3) 화면 데이터 구성
      const list: Item[] = ids.map((alcoholIndex) => {
        const meta = metaMap.get(alcoholIndex);
        return {
          alcoholIndex,
          idForRoute: String(alcoholIndex),                 // 상세 페이지로 넘길 id
          name: meta?.name ?? `#${alcoholIndex}`,
          imageUrl: meta?.image_url,
          category: meta?.category,
          degree: meta?.degree,
          priceValue: meta?.priceValue,
        };
      });

      setItems(list);
      console.log(list);
    } catch (e: any) {
      setError(e?.message ?? "북마크를 불러오지 못했어요.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

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
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>
          <Text style={styles.nick}>{nickname || "익명"}</Text>님이 찜한 전통주
        </Text>
      </View>

      {!!error && (
        <Text style={{ color: "red", marginHorizontal: 20, marginBottom: 8 }}>{error}</Text>
      )}

      <View style={{ flex: 1, paddingTop: 8 }}>
        {items.length === 0 ? (
          <View style={styles.center}>
            <Text style={{ textAlign: "center", color: "#6B7280" }}>
              아직 찜한 전통주가 없어요.{"\n"}마셔보고 싶은 전통주를 찜해보세요.
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(m) => String(m.alcoholIndex)}
            numColumns={2}
            columnWrapperStyle={{ paddingHorizontal: 40, justifyContent: "space-between", marginBottom: 12 }}
            contentContainerStyle={{ paddingBottom: 24, gap: 8 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/(home)/[id]",
                      params: { id: item.idForRoute, alcoholName: item.name }
                    })}
                >
                  <Image
                    source={
                      item.imageUrl
                        ? { uri: item.imageUrl }
                        : require("../../../assets/images/bottle_placeholder.png")
                    }
                    style={styles.thumb}
                    resizeMode="cover"

                  />
                  <Text numberOfLines={2} style={styles.name}>{item.name}</Text>
                  {!!item.category && <Text style={styles.meta}>{item.category} • {typeof item.degree === "number" && !isNaN(item.degree) && (
                    <Text style={styles.meta}>{item.degree}%</Text>
                  )}</Text>}
                  {!!item.priceValue && <Text style={styles.meta}>{'\n'}₩{item.priceValue.toLocaleString()}</Text>}

                </Pressable>

                {/* 찜 해제 */}
                <Pressable
                  onPress={async () => {
                    try {
                      await deleteBookmark(item.alcoholIndex);
                      // UI 즉시 반영
                      setItems(prev => prev.filter(x => x.alcoholIndex !== item.alcoholIndex));
                    } catch (e) {
                      // 실패 시 필요하면 토스트/알림
                      console.log("unbookmark failed:", e);
                    }
                  }}
                  style={styles.heart}
                  hitSlop={12}
                  accessibilityLabel="찜 해제"
                >
                  <Ionicons name="heart" size={22} color="#F59E0B" />
                </Pressable>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}

/** ===== 스타일 ===== */
const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerContainer: {
    margin: 20, flexDirection: "row",
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#111827" },
  nick: { color: "#F59E0B", fontWeight: "800" },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexBasis: '48%',
    maxWidth: '48%',
    flexGrow: 0,
    padding: 10,
    alignItems: 'center',
    minHeight: 220,
    position: 'relative',
  },
  heart: {
    position: "absolute",
    top: 6, right: 6,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "white",
    alignItems: "center", justifyContent: "center",
    elevation: 2,
  },
  thumb: { width: 140, height: 150, borderRadius: 8, backgroundColor: "#F3F4F6" },
  name: { textAlign: "left", marginTop: 8, color: "#111827", fontWeight: "700" },
  meta: { textAlign: "left", color: "#6B7280", fontSize: 12, marginTop: 2 },
});