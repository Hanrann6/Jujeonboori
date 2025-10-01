// app/components/AlcoholRecommend.tsx

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";
import { router } from "expo-router";
import Papa from "papaparse";
import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import csvAsset from "../../assets/data/trad_alcohol.csv";
// CSV 컬럼 타입
type AlcoholRow = {
  "index": string | number;
  "alcoholName": string;
  "normalizedName"?: string;
  "foodPairing"?: string;
  "sweetness": number;
  "sourness": number;
  "freshness": number;
  "body": number;
  "degree": number;
  "alcoholType": string;
  "keywords"?: string;
  "volume"?: string | number;
  "price"?: string;
  "priceValue?": number;
  "manufacturer"?: string;
  "ingredients"?: string;
  "brewery"?: string;
  "description"?: string;
  "representative"?: string;
  "address"?: string;
  "contact"?:string;
  "website"?: string;
  "imageURL"?: string;
  "detailPageUrl"?: string;
  "docId"?: string | number;
};

type AlcoholItem = {
  alcohol_id: string;
  name: string;
  sweetness: number;
  sourness: number;
  freshness: number;
  body: number;
  abv: number;
  category: string;
  keywords?: string;
  imageUrl?: string;
  volume?: string;         
  price?: string;
  manufacturer?: string;          
  ingredients?: string;
  pairings?: string;       
  detailUrl?: string;
  brewery?: string;
  description?: string;
  representative?: string;
  address?: string;
  contact?:string;
  website?: string;
};

// 유효한 http(s) URL인지 체크
function validHttpUrl(u?: string) {
  return !!u && /^https?:\/\//i.test(u.trim());
}

// CSV → 아이템
function rowToItem(r: AlcoholRow): AlcoholItem {
const id = String(r.index); 
const img = (r["imageURL"] ?? "").toString().trim();
return {
  alcohol_id: id,
  name: String(r["alcoholName"]).trim(),
  sweetness: Number(r["sweetness"]) || 0,
  sourness: Number(r["sourness"]) || 0,
  freshness: Number(r["freshness"]) || 0,
  body: Number(r["body"]) || 0,
  abv: Number(r["degree"]) || 0,
  category: String(r["alcoholType"] ?? "").trim(),
  keywords: r["keywords"] ? String(r["keywords"]) : undefined,
  imageUrl: validHttpUrl(img) ? img : undefined,
  volume: r["volume"] != null ? String(r["volume"]) : undefined,
  price: r["price"] != null ? String(r["price"]) : undefined,
  manufacturer: r["manufacturer"] || undefined,
  ingredients: r["ingredients"] || undefined,
  pairings: r["foodPairing"] || undefined,
  detailUrl: r["detailPageUrl"] || undefined,
  brewery: r["brewery"] || undefined,
  description: r["description"] || undefined,
  representative: r["representative"] || undefined,
  address: r["address"] || undefined,
  contact: r["contact"] || undefined,
  website: r["website"] || undefined,
};
}

type TasteProfile = {
  sweetness: number;
  sourness: number;
  freshness: number;
  body: number;
  abv: number;
  carbonation: number;
  abvTolerance?: number; //도수 허용 오차(defaultprofile에서 ±5%으로 설정해둠)
  categories?: string[]; //비워두면 전체에서 추천, 값이 있으면 해당 주종만 대상으로 추천
  //sweetness | sourness | freshness | body | abv | carbonation에 대한 가중치
  weights?: Partial<Record<keyof Omit<TasteProfile, "abvTolerance" | "categories" | "weights">, number>>;
};

type Props = { limit?: number; title?: string };
  
// 저장된 전통주 CSV 가져옴 
async function loadAlcoholDataset(): Promise<AlcoholItem[]> {
  const asset = Asset.fromModule(csvAsset);
  await asset.downloadAsync();
  const csv = await FileSystem.readAsStringAsync(asset.localUri!);
  const parsed = Papa.parse<AlcoholRow>(csv, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });
  const rows = parsed.data.filter((r) => (r as any)["alcoholName"]);
  return rows.map(rowToItem);
}

/** 저장된 tasteProfile 파싱 & 기본값 보정 */
function normalizeProfile(raw: any): TasteProfile {
  return {
    sweetness: Number(raw?.sweetness) ?? 0,
    sourness: Number(raw?.sourness) ?? 0,
    freshness: Number(raw?.freshness) ?? 0,
    body: Number(raw?.body) ?? 0,
    abv: Number(raw?.abv) ?? 0,
    carbonation: Number(raw?.carbonation) ?? 0,
    abvTolerance: Number(raw?.abvTolerance) || 5,
    categories: Array.isArray(raw?.categories) ? raw.categories : undefined,
    weights: raw?.weights || undefined,
  };
}

const DEFAULT_PROFILE: TasteProfile = {
  sweetness: 3, sourness: 3, freshness: 3, body: 3, abv: 6, carbonation: 1, abvTolerance: 5,
};

// 전통주 추천에 사용하는 스코어링
function score(item: AlcoholItem, p: TasteProfile): number {
  const W = { sweetness: 1, sourness: 1, freshness: 1, body: 1, carbonation: 0, abv: 0.5, ...(p.weights || {}) };
  //각 축(단맛/신맛/청량감/바디감/탄산)의 차이가 0이면 5점(최고), 차이가 5면 0점(최저).
  const sSweet = W.sweetness * (5 - Math.abs(item.sweetness - p.sweetness));
  const sSour = W.sourness * (5 - Math.abs(item.sourness - p.sourness));
  const sSpark = W.freshness * (5 - Math.abs(item.freshness - p.freshness));
  const sBody = W.body * (5 - Math.abs(item.body - p.body));
  //도수의 경우, ±5% 오차 범위를 허용하고, 차이가 10% 이상이면 0점, 0~10% 이내면 0~5점으로 계산
  const tol = p.abvTolerance ?? 5;
  const abvDiff = Math.abs(item.abv - p.abv);
  const sAbvRaw = Math.max(0, 1 - Math.max(0, abvDiff - tol) / 10); // 0~1
  const sAbv = W.abv * (5 * sAbvRaw);

  return sSweet + sSour + sSpark + sBody + sAbv;
}

function recommend(items: AlcoholItem[], p: TasteProfile, limit: number) {
  const filtered = !p.categories?.length ? items : items.filter(it => p.categories!.includes(it.category));
  return filtered
    .map(it => ({ it, s: score(it, p) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(x => x.it);
}

// 전통주 찜 저장키 
const FAV_KEY = "@fav:alcohol";

// 현재 찜 id[] 읽기
async function getFavIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(FAV_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

// 찜 저장
async function setFavIds(ids: string[]) {
  await AsyncStorage.setItem(FAV_KEY, JSON.stringify([...new Set(ids)]));
}

// 토글(추가/제거 후 최종 상태 반환)
async function toggleFav(id: string): Promise<boolean> {
  const list = await getFavIds();
  const has = list.includes(id);
  const next = has ? list.filter(x => x !== id) : [...list, id];
  await setFavIds(next);
  return !has;
}

// 추천 카드 1개를 담당하는 컴포넌트 
function RecCard({
  item,
  liked,
  onToggle,
  onOpen,
}: {
  item: AlcoholItem;
  liked: boolean,
  onToggle: () => void,
  onOpen: () => void;
}) {

  return (
    <View style={styles.card}>
      <Image
        source={
          item.imageUrl
            ? { uri: item.imageUrl }
            : require("../../assets/images/bottle_placeholder.png")
        }
        style={styles.thumb}
        resizeMode="cover"
      />

      {/* 우상단 하트 */}
      <Pressable
        onPress={onToggle}
        hitSlop={12}
        style={styles.heart}
        accessibilityLabel={liked ? "찜 취소" : "찜하기"}
      >
        <Ionicons
          name={liked ? "heart" : "heart-outline"}
          size={23}
          style={{ marginTop: 2 }}
          color={liked ? "#F59E0B" : "#9CA3AF"}
        />
      </Pressable>

      {/* 전통주 메타 정보 */}
      <Pressable onPress={onOpen} android_ripple={{ color: "#F3F4F6" }}>
        <Text numberOfLines={2} style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>{item.category} · {item.abv}%</Text>
      </Pressable>
    </View>
  );
}


export default function AlcoholRecommend({ limit = 5 }: Props) {
  const [dataset, setDataset] = useState<AlcoholItem[]>([]);
  const [profile, setProfile] = useState<TasteProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [favIds, setFavIdsState] = useState<string[]>([]);
  const loadFavs = React.useCallback(async () => {
    setFavIdsState(await getFavIds());
  }, []);
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [items, stored] = await Promise.all([
          loadAlcoholDataset(),
          AsyncStorage.getItem("tasteProfile"),
        ]);
        setDataset(items);
        setProfile(stored ? normalizeProfile(JSON.parse(stored)) : DEFAULT_PROFILE);
        await loadFavs();
      } catch (e: any) {
        setErr(e?.message || "추천을 준비하는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadFavs]);

  useFocusEffect(React.useCallback(() => {
    loadFavs();
  }, [loadFavs]));

  const picks = useMemo(() => (profile ? recommend(dataset, profile, limit) : []), [dataset, profile, limit]);

  if (loading) return <Text style={{ margin: 16, color: "#6B7280" }}>추천을 준비 중…</Text>;
  if (err) return <Text style={{ margin: 16, color: "red" }}>오류: {err}</Text>;
  if (!profile) return <Text style={{ margin: 16 }}>취향 테스트를 먼저 진행해 주세요.</Text>;

  return (
    <View style={{ marginTop: 12 }}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
        data={picks}
        keyExtractor={(it) => it.alcohol_id}
        renderItem={({ item }) => {
          const id = String(item.alcohol_id ?? item.name);
          const liked = favIds.includes(id);
          const onToggle = async () => {
            // 토글 후 부모 상태를 다시 로드 (여러 카드 일관성)
            await toggleFav(id);
            await loadFavs();
          };
          return (
            <RecCard
              item={item}
              liked={liked}
              onToggle={onToggle}
              onOpen={() =>
                router.push({
                  pathname: "/(tabs)/(home)/[id]",
                  params: { id: item.alcohol_id ?? encodeURIComponent(item.name) },
                })
              }
            />
          );
        }} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: 140, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 8, backgroundColor: "#fff", position: "relative" },
  thumb: { width: "100%", height: 100, borderRadius: 8, backgroundColor: "#F3F4F6" },
  name: { marginTop: 6, fontWeight: "700" },
  meta: { color: "#6B7280", fontSize: 12 },
  heart: {
    position: "absolute",
    top: 5, right: 5,
    width: 30, height: 30, borderRadius: 99,
    backgroundColor: "white",
    alignItems: "center", justifyContent: "center",
    elevation: 1,
  },
});
