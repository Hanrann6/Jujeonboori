//app/(initialProfile)/testResult.tsx
import { authedFetch, getUserId } from "@/app/lib/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const API_BASE = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/+$/, "");
type Profile = {
    sweetness: number;
    sourness: number;
    freshness: number;
    body: number;
    abv?: number;
    carbonation?: number;
};

const MAX = 5;

const clamp5 = (v: unknown) => {
    const n = Number(v ?? 0);
    return Math.max(0, Math.min(n, MAX));
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

export default function TestResult() {
    const [nickname, setNickname] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const { profile: profileParam = "{}" } =
        useLocalSearchParams<{ profile?: string }>();
    const toNumOrUndef = (v: unknown) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
    };
    const profile: Profile = useMemo(() => {
        try {
            const p = JSON.parse(profileParam || "{}");
            return {
                sweetness: clamp5(p?.sweetness),
                sourness: clamp5(p?.sourness),
                freshness: clamp5(p?.freshness),
                body: clamp5(p?.body),
                abv: toNumOrUndef(p?.abv),
                carbonation: toNumOrUndef(p?.carbonation),
            };
        } catch {
            return { sweetness: 0, sourness: 0, freshness: 0, body: 0 };
        }
    }, [profileParam]);
    useEffect(() => {
        (async () => {
            try {
                const stored = await AsyncStorage.getItem("nickname");
                if (stored) {
                    setNickname(stored);
                }
            } catch (e) {
                console.log("닉네임 로드 실패:", e);
            }
        })();
    }, []);
    const rows: { key: keyof Profile; label: string }[] = [
        { key: "sweetness", label: "단맛" },
        { key: "sourness", label: "신맛" },
        { key: "freshness", label: "청량감" },
        { key: "body", label: "바디감" },];


    //서버 전송 함수
    const postPreference = async () => {
        const payload = {
            sweetness: Number(profile.sweetness ?? 0),
            sourness: Number(profile.sourness ?? 0),
            carbonation: profile.carbonation == null ? 0 : Number(profile.carbonation),
            body: Number(profile.body ?? 0),
            refreshing: Number(profile.freshness ?? 0),
            abv: Number(profile.abv ?? 0),
        };
        const userId = await getUserId();
        const res = await authedFetch(`${API_BASE}/preference?userId=${userId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const raw = await res.text();
        console.log("취향 저장 내용:", raw);
        if (!res.ok) {
            throw new Error(`취향 저장 실패 (${res.status}) ${raw}`);
        }
    };

    const onContinue = async () => {
        try {
            setSubmitting(true);
            await postPreference();
            router.replace("../(tabs)/(home)");
        } catch (e: any) {
            Alert.alert("저장 오류", e?.message ?? "취향 저장 중 문제가 발생했습니다.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={styles.container} >
            <Text style={styles.title}>
                <Text style={styles.nickname}>{nickname}</Text>
                님의 {'\n'}주류 취향 프로필이 완성되었어요.
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
            <TouchableOpacity
                style={styles.btn}
                onPress={onContinue}
                activeOpacity={0.8}>
                <Text style={styles.btnText}>계속</Text>
            </TouchableOpacity>
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
        margin: 20,
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
    //버튼
    btn: {
        height: 46,
        borderRadius: 10,
        backgroundColor: "#FBBC05",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 110,
        marginHorizontal: 16,
    },
    btnText: {
        color: "#111",
        fontWeight: "700",
        fontSize: 14
    },

});
