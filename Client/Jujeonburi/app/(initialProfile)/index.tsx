/* 사용자 선호도 테스트 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import QUESTIONS from "./taste_questions.json"; // JSON이 같은 폴더에 있다고 가정

// ---------- 타입 ----------
type Effects = Partial<{
    sweetness: number;   // 단맛
    sourness: number;    // 신맛
    freshness: number;   // 청량
    body: number;        // 바디감
    abv: number;         // 도수
    carbonation: number; // 탄산
}>;

type Option = {
    id: "A" | "B";
    text: string;
    effects?: Effects;
    recommendations?: string[];
};

type Question = {
    id: number;
    question: string;
    options: [Option, Option]; // A/B 선택지
};

const STEPS = QUESTIONS as Question[];
const TOTAL = STEPS.length;

export default function TasteTest() {
    const router = useRouter();
    const [nickname, setNickname] = useState<string>("");
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState<("A" | "B" | undefined)[]>(
        Array(TOTAL).fill(undefined)
    );
    const [selectedIdx, setSelectedIdx] = useState<0 | 1 | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const current = STEPS[step];

    // 닉네임 불러오기
    useEffect(() => {
        (async () => {
          const saved = await AsyncStorage.getItem("nickname");
          if (saved) setNickname(saved);
        })();
      }, []);
      
    // 특성 벡터 집계
    const accumulateProfile = (finalAnswers: ("A" | "B" | undefined)[]) => {
        const profile: Required<Effects> = {
            sweetness: 3,
            sourness: 3,
            freshness: 3,
            body: 3,
            abv: 5, // 기본 도수 5% (낮은 도수)
            carbonation: 1
        };

        finalAnswers.forEach((ab, i) => {
            const q = STEPS[i];
            if (!q || !ab) return;
            const opt = ab === "A" ? q.options[0] : q.options[1];

            // 주류 취향 특성 집계
            Object.entries(opt.effects ?? {}).forEach(([k, v]) => {
                // @ts-ignore - k는 Effects의 키
                profile[k] = (profile[k] ?? 0) + (v ?? 0);
            });

        });
        return { profile, };
    };

    const handleFinish = async(finalAnswers: ("A" | "B" | undefined)[]) => {
        const { profile } = accumulateProfile(finalAnswers);
        console.log("특성 프로필:", profile);
        await AsyncStorage.setItem("tasteProfile", JSON.stringify(profile));
        
        router.push({
          pathname: "./(initialProfile)/testResult",
          params: {
            nickname,
            profile: JSON.stringify(profile)
          }
        });
      };
    const handleSelect = (idx: 0 | 1) => {
        setSelectedIdx(idx);
        const nextAnswers = [...answers];
        nextAnswers[step] = idx === 0 ? "A" : "B";
        setAnswers(nextAnswers);

        // 잠깐 하이라이트 후 다음 단계
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            if (step < TOTAL - 1) {
                setStep((s) => s + 1);
                setSelectedIdx(null);
            } else {
                // 완료 시 최종 집계
                handleFinish(nextAnswers);
            }
        }, 180);
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    return (
        <View style={styles.container}>
            {/* 상단 텍스트 영역 */}
            <View style={styles.titleContainer}>
                <Text style={styles.title}>
                    <Text style={styles.nickname}>{nickname}</Text>
                    님 취향에 맞춘{"\n"}전통주를 추천해드릴게요.
                </Text>
                <Text style={styles.hintText}>
                    선택한 결과를 기반으로 맞춤 추천을 해드려요.
                </Text>
            </View>

            {/* 중앙 질문 영역 */}
            <View style={styles.testContainer}>
                <Text style={styles.testTitle}>
                    질문 <Text>{step + 1}</Text>.
                </Text>
                <Text style={styles.testText}>{current.question}</Text>

                <View style={styles.testBox}>
                    {/* 왼쪽 버튼 (A) */}
                    <Pressable
                        onPress={() => handleSelect(0)}
                        style={({ pressed }) => [
                            styles.answerBtn,
                            pressed && styles.pressedBtn,
                            selectedIdx === 0 && styles.selectedBtn
                        ]}
                    >
                        <Text style={styles.answerBtnText}>{current.options[0].text}</Text>
                    </Pressable>

                    {/* 오른쪽 버튼 (B) */}
                    <Pressable
                        onPress={() => handleSelect(1)}
                        style={({ pressed }) => [
                            styles.answerBtn,
                            pressed && styles.pressedBtn,
                            selectedIdx === 1 && styles.selectedBtn
                        ]}
                    >
                        <Text style={styles.answerBtnText}>{current.options[1].text}</Text>
                    </Pressable>
                </View>
            </View>

            {/* 하단 진행 도트 */}
            <View style={styles.stepContainer}>
                <View style={styles.dotsRow}>
                    {Array.from({ length: TOTAL }).map((_, i) => {
                        const filled = i <= step;
                        return (
                            <View
                                key={i}
                                style={[styles.dot, filled ? styles.dotFilled : styles.dotIdle]}
                            />
                        );
                    })}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { backgroundColor: "#FFFFFF", flex: 1 },
    // 화면 상단 영역
    titleContainer: {
        flex: 2,
        justifyContent: "center",
        alignItems: "stretch",
        paddingLeft: 40,
        paddingTop: 70
    },
    nickname: { fontWeight: "bold", fontSize: 24, color: "#EE8F00" },
    title: { color:"black",fontWeight: "bold", fontSize: 24 },
    hintText: { fontSize: 12, color: "#828282" },
    // 화면 중앙 영역
    testContainer: {
        flex: 8,
        justifyContent: "center",
        padding: 20,
        marginTop: 30
    },
    testTitle: {color:"black", fontSize: 24, textAlign: "left", fontWeight: "bold", paddingLeft: 20 },
    testText: { color:"black",fontSize: 20, textAlign: "left", fontWeight: "bold", paddingLeft: 20 },
    testBox: {
        flex: 4,
        margin: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12
    },
    answerBtn: {
        flex: 1,
        backgroundColor: "#F2F2F2",
        borderRadius: 16,
        width: 150,
        height: 220,
        margin: 10,
        alignItems: "center",
        justifyContent: "center"
    },
    pressedBtn: { backgroundColor: "#E6E6E6" },
    selectedBtn: { backgroundColor: "#FFBF60" },
    answerBtnText: { fontSize: 14, textAlign: "center", fontWeight: "600" },
    // 화면 하단 영역
    stepContainer: { flex: 5, alignItems: "center", justifyContent: "flex-start" },
    dotsRow: { flexDirection: "row", gap: 20, paddingTop: 4 },
    dot: { width: 14, height: 14, borderRadius: 999 },
    dotIdle: { backgroundColor: "#E5E7EB" },
    dotFilled: { backgroundColor: "#FBBC05" }
});
