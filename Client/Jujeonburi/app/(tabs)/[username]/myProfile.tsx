import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

type Profile = {
    sweetness: number;   // 0~5
    sourness: number;    // 0~5
    sparkling: number;   // 0~5
    body: number;        // 0~5
    abv?: number;        // 도수(%). 예: 6 또는 16
    carbonation?: number;// 0(무탄산) | 1(탄산)
};

const MAX = 5;
const SIDE_COL = 110;

const clamp5 = (v: unknown) => {
    const n = Number(v ?? 0);
    return Math.max(0, Math.min(n, MAX));
};

const abvLabel = (abv?: number) => {
    const n = Number(abv);
    if (!Number.isFinite(n)) return "도수 정보 없음";
    if (n >= 16) return "높은 도수 선호";
    if (n <= 6) return "낮은 도수 선호";
    return "중간 도수 선호";
};

const carbonationLabel = (c?: number) => {
    const n = Number(c);
    if (n === 1) return "탄산 선호";
    if (n === 0) return "무탄산 선호";
    return "탄산/무탄산 무관";
};

export default function MyProfile() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [nickname, setNickname] = useState("");
    const [raw, setRaw] = useState<any>(null);

    useEffect(() => {
        (async () => {
            const [nick, stored] = await Promise.all([
                AsyncStorage.getItem("nickname"),
                AsyncStorage.getItem("tasteProfile"),
            ]);
            setNickname(nick ?? "");
            setRaw(stored ? JSON.parse(stored) : null);
            setLoading(false);
        })();
    }, []);

    const profile: Profile | null = useMemo(() => {
        if (!raw) return null;
        return {
            sweetness: clamp5(raw?.sweetness),
            sourness: clamp5(raw?.sourness),
            sparkling: clamp5(raw?.sparkling),
            body: clamp5(raw?.body),
            abv: Number.isFinite(Number(raw?.abv)) ? Number(raw?.abv) : undefined,
            carbonation: Number.isFinite(Number(raw?.carbonation)) ? Number(raw?.carbonation) : undefined,
        };
    }, [raw]);

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
                <ActivityIndicator />
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={[styles.container, { padding: 16, gap: 12 }]}>
                <Text style={styles.title}>내 취향 프로필</Text>
                <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>아직 취향 테스트 기록이 없어요.</Text>
                    <Pressable style={styles.cta} onPress={() => router.replace("/(initialProfile)")}>
                        <Text style={styles.ctaText}>취향 테스트 하러 가기</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    const rows: { key: keyof Profile; label: string }[] = [
        { key: "sweetness", label: "단맛" },
        { key: "sourness", label: "신맛" },
        { key: "sparkling", label: "청량감" },
        { key: "body", label: "바디감" },
    ];

    return (
        <View style={styles.container} >
            <Text style={styles.title}>
                <Text style={styles.nickname}>{nickname}</Text>
                님의{'\n'}주류 취향 프로필
            </Text>
            <View style={styles.profileCard}>
                {rows.map(({ key, label }) => {
                    const value = profile[key];
                    const pct = Math.round(((value ?? 0) / MAX) * 100);
                    const level = pct >= 67 ? "높음" : pct >= 34 ? "중간" : "낮음";
                    return (
                        <View key={key} style={styles.row}>
                            <Text style={styles.tasteLabel}>{label}</Text>

                            <View style={styles.barBg}>
                                <View style={[styles.barFill, { width: `${pct}%` }]} />
                            </View>

                            <Text style={styles.rowValue}>
                                {(value ?? 0).toFixed(1)}/{MAX} ({level})
                            </Text>
                        </View>
                    );
                })}
                <View style={styles.badges}>
                    <View style={styles.badge}><Text style={styles.badgeText}>도수</Text><Text> {abvLabel(profile.abv)}</Text></View>
                    <View style={styles.badge}><Text style={styles.badgeText}>탄산</Text><Text> {carbonationLabel(profile.carbonation)}</Text></View>
                </View>
            </View>

            <Text style={styles.helperText}>
                * 각 특성 값은 설문 값을 가중치(0~5)로 표시한 결과입니다.
            </Text>

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
