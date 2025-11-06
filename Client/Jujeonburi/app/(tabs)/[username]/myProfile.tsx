import { authedFetch, getUserId } from "@/app/lib/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
const API_BASE = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/+$/, "");

type Profile = {
    sweetness: number;
    sourness: number;
    carbonation?: number;
    body: number;
    freshness: number;
    abv?: number;
  };

const clamp5 = (v: unknown) => {
    const n = Number(v ?? 0);
    return Math.max(0, Math.min(n, 5));
};

const abvLabel = (abv?: number) => {
    const n = Number(abv);
    if (!Number.isFinite(n)) return "도수 정보 없음";
    if (n > 10) return "높은 도수 선호";
    if (n <= 10) return "낮은 도수 선호";
    return "중간 도수 선호";
};

const carbonationLabel = (c?: number) => {
    const n = Number(c);
    if (n === 1) return "탄산 선호";
    if (n === 0) return "무탄산 선호";
    return "탄산/무탄산 무관";
};

export default function MyProfile() {
    const [loading, setLoading] = useState(true);
    const [nickname, setNickname] = useState("");
    const [raw, setRaw] = useState<any>(null);
    const [err, setErr] = useState<string | null>(null);
  
    const fetchProfile = useCallback(async () => {
      try {
        setLoading(true);
        setErr(null);
  
        const nick = (await AsyncStorage.getItem("nickname")) ?? "";
        setNickname(nick);
        const userId = await getUserId();
        const res = await authedFetch(`${API_BASE}/preference?userId=${userId}`, { method: "GET" });
        const rawText = await res.text();
        console.log("fetchProfile", {rawText });
        if (!res.ok) {
          if (res.status === 404 || res.status === 204) {
            setRaw(null);
            return;
          }
          throw new Error(`GET /preference 실패(${res.status}) ${rawText}`);
        }
  
        const j = JSON.parse(rawText) as {
          sweetness?: number;
          sourness?: number;
          carbonation?: number;
          body?: number;
          refreshing?: number;  
          abv?: number;
        };
  
        setRaw({
          sweetness: j.sweetness,
          sourness: j.sourness,
          freshness: j.refreshing,
          body: j.body,
          abv: j.abv,
          carbonation: j.carbonation,
        });
      } catch (e: any) {
        setErr(e?.message || "프로필을 불러오지 못했어요.");
        setRaw(null);
      } finally {
        setLoading(false);
      }
    }, []);
  
    useFocusEffect(
      useCallback(() => {
        fetchProfile();
      }, [fetchProfile])
    );
  
    const profile: Profile | null = useMemo(() => {
      if (!raw) return null;
      return {
        sweetness: Number(raw.sweetness),
        sourness: Number(raw.sourness),
        freshness: Number(raw.freshness),
        body: Number(raw.body),
        abv: Number.isFinite(Number(raw.abv)) ? Number(raw.abv) : undefined,
        carbonation: Number.isFinite(Number(raw.carbonation)) ? Number(raw.carbonation) : undefined,
      };
    }, [raw]);
  
    if (loading) {
      return (
        <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
          <ActivityIndicator />
        </View>
      );
    }
    if (err) {
      return (
        <View style={[styles.container, { padding: 16 }]}>
          <Text style={{ color: "red" }}>{err}</Text>
        </View>
      );
    }
  
    if (!profile) {
      return (
        <View style={[styles.container, { padding: 16, gap: 12 }]}>
          <Text style={styles.title}>내 취향 프로필</Text>
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>아직 취향 테스트 기록이 없어요.</Text>
            <Pressable style={styles.cta} onPress={() => {/* router.replace("/(initialProfile)") */}}>
              <Text style={styles.ctaText}>취향 테스트 하러 가기</Text>
            </Pressable>
          </View>
        </View>
      );
    }
  
    const rows: { key: keyof Profile; label: string }[] = [
      { key: "sweetness", label: "단맛" },
      { key: "sourness", label: "신맛" },
      { key: "freshness", label: "청량감" },  // ← 서버 refreshing
      { key: "body", label: "바디감" },
    ];
  
    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          <Text style={styles.nickname}>{nickname}</Text>
          님의{'\n'}주류 취향 프로필
        </Text>
  
        <View style={styles.profileCard}>
          {rows.map(({ key, label }) => {
            const value = profile[key];
            const pct = Math.round(((clamp5(value) ?? 0) / 5) * 100);  // 🔒 표시만 0~5
            const level = pct >= 67 ? "높음" : pct >= 34 ? "중간" : "낮음";
            return (
              <View key={key} style={styles.row}>
                <Text style={styles.tasteLabel}>{label}</Text>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${pct}%` }]} />
                </View>
                <Text style={styles.rowValue}>
                  {(Number(value ?? 0)).toFixed(1)}/{5} ({level})
                </Text>
              </View>
            );
          })}
          <View style={styles.badges}>
            <View style={styles.badge}><Text style={styles.badgeText}>도수</Text><Text> {abvLabel(profile.abv)}</Text></View>
            <View style={styles.badge}><Text style={styles.badgeText}>탄산</Text><Text> {carbonationLabel(profile.carbonation)}</Text></View>
          </View>
        </View>
  
        <Text style={styles.helperText}>* 각 특성 값은 서버에 저장된 선호도 점수입니다.</Text>
      </View>
    );
  }

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        padding: 16,
        gap: 12
    },

    title: {
        marginHorizontal: 20,
        paddingTop: 40,
        fontSize: 22,
        fontWeight: "bold",
        color: "#111827",
        justifyContent: "center",
        textAlign: "left",
    },
    nickname: {
        color: "#EE8F00"
    },
    subtitle: {
        fontSize: 20,
    },
    profileCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        margin: 16,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
        gap: 10,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        marginVertical: 15,
    },
    // 주류 특성
    tasteLabel: {
        flex: 1,
        fontSize: 14,
        fontWeight: "bold",
        color: "#111827",
    },
    // 막대 그래프
    barBg: {
        flex: 2,
        width: 160,
        height: 18,
        borderRadius: 999,
        backgroundColor: "#F3F4F6",
        overflow: "hidden",
    },
    barFill: {
        height: "100%",
        borderRadius: 999,
        backgroundColor: "#FBBC05",
    },
    // 막대 그래프 수치값
    rowValue: {
        flex: 1,
        width: 110,
        textAlign: "center",
        color: "#374151",
        fontSize: 12
    },

    helperText: {
        fontSize: 11,
        marginTop: -20,
        marginLeft: 16,
        color: "#9CA3AF"
    },

    badges: {
        flexDirection: "row",
        gap: 15,
        flexWrap: "wrap",
        justifyContent: "center",
        paddingVertical: 8,
        paddingHorizontal: 4
    },
    badge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: "#FFF7ED",
        borderWidth: 1.5,
        borderColor: "#FBBC05",
    },
    badgeText: {
        fontWeight: "800",
        color: "#111827"
    },
    
    emptyCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        alignItems: "center",
        gap: 10,
        borderWidth: 1,
        borderColor: "#F3F4F6",
    },
    emptyText: { color: "#6B7280" },
    cta: {
        backgroundColor: "#FBBC05",
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    ctaText: { fontWeight: "700", color: "#111" },
});
