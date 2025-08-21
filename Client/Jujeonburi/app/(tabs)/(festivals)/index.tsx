// app/(tabs)/(festival)/index.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import festivalsJson from "./festival_dummy.json";

/** ---------- 타입 ---------- */
type Festival = {
  festival_id: number;
  name: string;
  description: string;
  location: string;
  start_date: string | Date;
  end_date: string | Date;
  official_url?: string;
  image_url?: string;
};

/** ---------- 유틸 (파일 내부 유지) ---------- */
function toDate(v: string | Date) {
  return v instanceof Date ? v : new Date(v);
}
function formatRange(s: string | Date, e: string | Date) {
  const d1 = toDate(s);
  const d2 = toDate(e);
  const sameYear = d1.getFullYear() === d2.getFullYear();

  const fmt = (d: Date, withYear = false) =>
    d.toLocaleDateString("ko-KR", {
      year: withYear ? "numeric" : undefined,
      month: "numeric",
      day: "numeric",
    });

  return sameYear
    ? `${fmt(d1, true)} ~ ${fmt(d2, false)}`
    : `${fmt(d1, true)} ~ ${fmt(d2, true)}`;
}
function statusOf(s: string | Date, e: string | Date) {
  const now = new Date();
  const start = toDate(s);
  const end = new Date(toDate(e));
  end.setHours(23, 59, 59, 999);
  if (now < start) return { label: "예정", color: "#0088FF" };
  if (now > end) return { label: "종료", color: "#9CA3AF" };
  return { label: "진행중", color: "#19BB55" };
}
function statusRank(s: string | Date, e: string | Date) {
    const { label } = statusOf(s, e);
    // 진행중(0) → 예정(1) → 종료(2)
    return label === "진행중" ? 0 : label === "예정" ? 1 : 2;
  }
  
/** ---------- 원본 더미 → Date 통일 ---------- */
const festivalsPrepared: Festival[] = festivalsJson.map((f) => ({
  ...f,
  start_date: toDate(f.start_date as any),
  end_date: toDate(f.end_date as any),
}));

/** ---------- 색상 ---------- */
const CARD_BG = "#FFFFFF";
const BORDER = "#E5E7EB";
const TITLE = "#111827";
const MUTED = "#6B7280";

export default function FestivalScreen() {
  /** 연도 목록 만들기 (더미에서 추출) */
  const years = useMemo(() => {
    const set = new Set<number>();
    for (const f of festivalsPrepared) {
      set.add(toDate(f.start_date).getFullYear());
    }
    return Array.from(set).sort((a, b) => a - b);
  }, []);

  /** 기본 연도: 현재 연도가 목록에 있으면 현재, 없으면 최댓값 */
  const defaultYear = useMemo(() => {
    const nowY = new Date().getFullYear();
    if (years.includes(nowY)) return nowY;
    return years.length ? years[years.length - 1] : nowY;
  }, [years]);

  const [year, setYear] = useState<number>(defaultYear);

  /** 선택 연도별 필터링 */
  const data = useMemo(() => {
    const list = festivalsPrepared.filter(
      (f) => toDate(f.start_date).getFullYear() === year
    );
  
    return list.sort((a, b) => {
      const ra = statusRank(a.start_date, a.end_date);
      const rb = statusRank(b.start_date, b.end_date);
      if (ra !== rb) return ra - rb; // 진행중/예정 먼저, 종료는 아래로
  
      // 같은 상태끼리의 세부 정렬
      const sa = statusOf(a.start_date, a.end_date).label;
      if (sa === "진행중") {
        // 진행중: 곧 끝나는 순으로
        return +new Date(a.end_date as any) - +new Date(b.end_date as any);
      }
      if (sa === "예정") {
        // 예정: 가까운 시작일 순
        return +new Date(a.start_date as any) - +new Date(b.start_date as any);
      }
      // 종료: 최근에 끝난 것 먼저 보고 싶으면 내림차순, 아니면 오름차순
      return +new Date(b.end_date as any) - +new Date(a.end_date as any);
    });
  }, [year]);
  

  const changeYear = useCallback((y: number) => setYear(y), []);

  return (
    <SafeAreaView style={s.safe}>
      {/* 상단 연도 선택 칩 */}
      <View style={s.yearBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
        >
          {years.map((y) => {
            const selected = y === year;
            return (
              <Pressable
                key={y}
                onPress={() => changeYear(y)}
                style={[
                  s.yearChip,
                  selected && { backgroundColor: "#FFBF60"},
                ]}
                android_ripple={{ color: "#F3F4F6" }}
              >
                <Text
                  style={[
                    s.yearChipText,
                    selected && { color: "black", fontWeight: "800" },
                  ]}
                >
                  {y}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        contentContainerStyle={s.listContent}
        data={data}
        keyExtractor={(it) => String(it.festival_id)}
        renderItem={({ item }) => <FestivalCard item={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{ color: MUTED }}>
              {year}년에는 등록된 축제가 없어요.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function FestivalCard({ item }: { item: Festival }) {
  const badge = statusOf(item.start_date, item.end_date);
  const range = formatRange(item.start_date, item.end_date);

  return (
    <View style={s.card}>
      {/* 썸네일 */}
      <View style={s.thumbWrap}>
        <Image
          source={
            item.image_url
              ? { uri: item.image_url }
              : require("../../../assets/images/icon.png")
          }
          style={s.thumb}
          resizeMode="cover"
        />
        <View style={[s.badge, { backgroundColor: badge.color }]}>
          <Text style={s.badgeText}>{badge.label}</Text>
        </View>
      </View>

      {/* 본문 */}
      <View style={s.body}>
        <Text style={s.title} numberOfLines={1}>
          {item.name}
        </Text>

        {!!item.description && (
          <Text style={s.desc} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={s.row}>
          <Ionicons name="calendar-outline" size={20} color={MUTED} />
          <Text style={s.metaText} numberOfLines={1}>
            {range}
          </Text>
        </View>

        <View style={s.row}>
          <Ionicons name="location-outline" size={20} color={MUTED} />
          <Text style={s.metaText} numberOfLines={1}>
            {item.location}
          </Text>
        </View>

        {!!item.official_url && (
          <Pressable
            style={s.linkBtn}
            onPress={() => Linking.openURL(item.official_url!)}
            android_ripple={{ color: "#F3F4F6" }}
          >
            <Text style={s.linkBtnText}>공식 사이트 바로가기</Text>
            <Ionicons name="chevron-forward" size={16} color={TITLE} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** ---------- 스타일 ---------- */
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },

  yearBar: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  yearChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#fff",
  },
  yearChipText: { color: TITLE, fontWeight: "700" },

  listContent: { padding: 16 },

  card: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    overflow: "hidden",
  },

  thumbWrap: {
    position: "relative",
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#F3F4F6",
  },
  thumb: { width: "100%", height: "100%" },
  badge: {
    width: 60,
    height: 30,
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  body: { justifyContent: "center", padding: 12, gap: 6 },
  title: {
    height: 25,
    marginHorizontal: 4,
    marginBottom: 4,
    fontSize: 20,
    fontWeight: "800",
    color: TITLE,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : null),
  },

  row: { marginHorizontal: 4, flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { color: MUTED, fontSize: 14 },

  desc: { marginHorizontal: 4, color: TITLE, fontSize: 14, lineHeight: 18 },

  linkBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    backgroundColor: "#FFF",
  },
  linkBtnText: { color: TITLE, fontWeight: "700" },

  empty: { padding: 24, alignItems: "center" },
});
