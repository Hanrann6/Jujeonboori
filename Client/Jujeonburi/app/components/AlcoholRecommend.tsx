// app/components/AlcoholRecommend.tsx

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";
import Papa from "papaparse";
import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Image, StyleSheet, Text, View } from "react-native";
import csvAsset from "../../assets/data/trad_alcohol.csv";

/** ===== CSV 컬럼 타입 ===== */
type AlcoholRow = {
  index?: number;
  "제품명": string;
  "단맛": number;
  "신맛": number;
  "청량감": number;
  "바디감": number;
  "도수%": number;
  "탄산": number;
  "주종": string;
  "keyword"?: string;
  "용량"?: string | number;
  "가격"?: string | number;
  "제조사"?: string;
  "원재료"?: string;
  "어울리는음식"?: string;
  "사진URL"?: string;
  "detailPageUrl"?: string;
  "docId"?: string | number;
};

/** ===== 표준 아이템/프로필 ===== */
type AlcoholItem = {
  name: string;
  sweetness: number;
  sourness: number;
  sparkling: number;
  body: number;
  abv: number;
  carbonation: number;
  category: string;
  keyword?: string;
  imageUrl?: string;        
  volume?: string;          // 용량
  price?: string;           
  maker?: string;           // 제조사
  ingredients?: string;     
  pairings?: string;        // 어울리는음식
  detailUrl?: string;
  docId?: string;
};

type TasteProfile = {
  sweetness: number;
  sourness: number;
  sparkling: number;
  body: number;
  abv: number;
  carbonation: number;
  abvTolerance?: number; //도수 허용 오차(defaultprofile에서 ±5%으로 설정해둠)
  categories?: string[]; //비워두면 전체에서 추천, 값이 있으면 해당 주종만 대상으로 추천
  //sweetness | sourness | sparkling | body | abv | carbonation에 대한 가중치
  weights?: Partial<Record<keyof Omit<TasteProfile,"abvTolerance"|"categories"|"weights">, number>>;
};

type Props = { limit?: number; title?: string };

/** 유효한 http(s) URL인지 체크 */
function validHttpUrl(u?: string) {
  return !!u && /^https?:\/\//i.test(u.trim());
}

/** ===== CSV → 아이템 ===== */
function rowToItem(r: AlcoholRow): AlcoholItem {
  const img = (r["사진URL"] ?? "").toString().trim();
  return {
    name: String(r["제품명"]).trim(),
    sweetness: Number(r["단맛"]) || 0,
    sourness: Number(r["신맛"]) || 0,
    sparkling: Number(r["청량감"]) || 0,
    body: Number(r["바디감"]) || 0,
    abv: Number(r["도수%"]) || 0,
    carbonation: Number(r["탄산"]) || 0,
    category: String(r["주종"] ?? "").trim(),
    keyword: r["keyword"] ? String(r["keyword"]) : undefined,

    imageUrl: validHttpUrl(img) ? img : undefined,
    volume: r["용량"] != null ? String(r["용량"]) : undefined,
    price: r["가격"] != null ? String(r["가격"]) : undefined,
    maker: r["제조사"] || undefined,
    ingredients: r["원재료"] || undefined,
    pairings: r["어울리는음식"] || undefined,
    detailUrl: r["detailPageUrl"] || undefined,
    docId: r["docId"] != null ? String(r["docId"]) : undefined,
  };
}

/** CSV 로드 */
async function loadAlcoholDataset(): Promise<AlcoholItem[]> {
  const asset = Asset.fromModule(csvAsset);
  await asset.downloadAsync();
  const csv = await FileSystem.readAsStringAsync(asset.localUri!);
  const parsed = Papa.parse<AlcoholRow>(csv, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });
  const rows = parsed.data.filter((r) => (r as any)["제품명"]);
  return rows.map(rowToItem);
}

/** 저장된 tasteProfile 파싱 & 기본값 보정 */
function normalizeProfile(raw: any): TasteProfile {
  return {
    sweetness: Number(raw?.sweetness) ?? 0,
    sourness: Number(raw?.sourness) ?? 0,
    sparkling: Number(raw?.sparkling) ?? 0,
    body: Number(raw?.body) ?? 0,
    abv: Number(raw?.abv) ?? 0,
    carbonation: Number(raw?.carbonation) ?? 0,
    abvTolerance: Number(raw?.abvTolerance) || 5,
    categories: Array.isArray(raw?.categories) ? raw.categories : undefined,
    weights: raw?.weights || undefined,
  };
}

const DEFAULT_PROFILE: TasteProfile = {
  sweetness: 3, sourness: 3, sparkling: 3, body: 3, abv: 6, carbonation: 1, abvTolerance: 5,
};

/** 스코어링 & 추천 */
function score(item: AlcoholItem, p: TasteProfile): number {
  const W = { sweetness:1, sourness:1, sparkling:1, body:1, carbonation:1, abv:0.5, ...(p.weights||{}) };

  const sSweet = W.sweetness * (5 - Math.abs(item.sweetness - p.sweetness));
  const sSour  = W.sourness  * (5 - Math.abs(item.sourness  - p.sourness));
  const sSpark = W.sparkling * (5 - Math.abs(item.sparkling - p.sparkling));
  const sBody  = W.body      * (5 - Math.abs(item.body      - p.body));
  const sCarb  = W.carbonation * (5 - Math.abs(item.carbonation - p.carbonation));

  const tol = p.abvTolerance ?? 5;
  const abvDiff = Math.abs(item.abv - p.abv);
  const sAbvRaw = Math.max(0, 1 - Math.max(0, abvDiff - tol) / 20); // 0~1
  const sAbv = W.abv * (5 * sAbvRaw);

  return sSweet + sSour + sSpark + sBody + sCarb + sAbv;
}

function recommend(items: AlcoholItem[], p: TasteProfile, limit: number) {
  const filtered = !p.categories?.length ? items : items.filter(it => p.categories!.includes(it.category));
  return filtered
    .map(it => ({ it, s: score(it, p) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(x => x.it);
}

/** ===== 메인 컴포넌트 ===== */
export default function AlcoholRecommend({ limit = 5, title = "내 취향 추천 전통주" }: Props) {
  const [dataset, setDataset] = useState<AlcoholItem[]>([]);
  const [profile, setProfile] = useState<TasteProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

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
      } catch (e: any) {
        setErr(e?.message || "추천을 준비하는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const picks = useMemo(() => (profile ? recommend(dataset, profile, limit) : []), [dataset, profile, limit]);

  if (loading) return <Text style={{ margin: 16, color: "#6B7280" }}>추천을 준비 중…</Text>;
  if (err) return <Text style={{ margin: 16, color: "red" }}>오류: {err}</Text>;
  if (!profile) return <Text style={{ margin: 16 }}>취향 테스트를 먼저 진행해 주세요.</Text>;

  return (
    <View style={{ marginTop: 12 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
        data={picks}
        keyExtractor={(it) => it.docId ?? it.name}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image
              source={
                item.imageUrl
                  ? { uri: item.imageUrl } // ✅ CSV의 사진URL 사용
                  : require("../../assets/images/bottle_placeholder.png")
              }
              style={styles.thumb}
            />
            <Text numberOfLines={2} style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{item.category} · {item.abv}%</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 16, fontWeight: "800", marginHorizontal: 16, marginBottom: 8 },
  card: { width: 120, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 8, backgroundColor: "#fff" },
  thumb: { width: "100%", height: 90, borderRadius: 8, backgroundColor: "#F3F4F6" },
  name: { marginTop: 6, fontWeight: "700" },
  meta: { color: "#6B7280", fontSize: 12 },
});
