//app/(beforeLogin)/setNick.tsx

import { authedFetch } from "@/app/lib/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    Keyboard,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from "react-native";
const API_BASE = process.env.EXPO_PUBLIC_API_URL!; 

export default function ChangeNick() {
    const router = useRouter();
    const {suggested = "" } = useLocalSearchParams<{ suggested?: string }>();
    const [name, setName] = useState(String(suggested ?? ""));
    const [submitting, setSubmitting] = useState(false); 
    // 2~12자, 한/영/숫자만 허용 (Android용)
    const valid = useMemo(() => /^[A-Za-z0-9가-힣]{2,12}$/.test(name), [name]);
    const [nickname, setNickname] = useState<string>("");

    useFocusEffect(
        useCallback(() => {
          let alive = true;
          (async () => {
            const v = await AsyncStorage.getItem("nickname");
            if (alive) setNickname(v ?? "");
          })();
          return () => { alive = false; };
        }, [])
      );

    const onContinue = async () => {
        if (!valid || submitting) return;
        setSubmitting(true);
        try {
          const nickname = name.trim();
    
          const res = await authedFetch(`${API_BASE}/users/me`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nickname }),
          });
    
          const raw = await res.text();
          if (!res.ok) {
            throw new Error(raw || `닉네임 저장 실패 (${res.status})`);
          }
          // 성공 응답 예: { "user_id": 1, "nickname": "새로운닉네임" }
          const json = (() => { try { return JSON.parse(raw); } catch { return {}; } })();
          console.log("닉네임 변경 성공", json);
          await AsyncStorage.setItem("nickname", json?.nickname ?? nickname);
          
          router.back();
        } catch (e: any) {
          alert(e?.message ?? "닉네임 변경 중 문제가 발생했습니다.");
        } finally {
          setSubmitting(false);
          router.back();
        }
      };

    return (
        <SafeAreaView style={styles.safe}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <View style={styles.container}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>
                            <Text style={styles.nick}>{nickname}</Text>님의{'\n'}새로운 닉네임을 입력해주세요.
                        </Text>
                    </View>
                    {/* 입력창 */}
                    <View style={styles.formContainer}>
                        <TextInput
                            value={name}
                            onChangeText={setName}
                            placeholder={`예) ${suggested || "닌자토끼"}`}
                            placeholderTextColor="#9CA3AF"
                            style={styles.input}
                            autoCapitalize="none"
                            autoCorrect={false}
                            maxLength={12}
                            returnKeyType="done"
                            onSubmitEditing={() => valid && onContinue()}
                            importantForAutofill="no"
                            textContentType="none"
                        />

                        {!valid && name.length > 0 && (
                            <Text style={styles.hintText}>2–12자, 한글/영문/숫자만 사용할 수 있어요.</Text>
                        )}

                        <TouchableOpacity
                            style={[styles.continueBtn, { opacity: valid ? 1 : 0.5 }]}
                            disabled={!valid}
                            onPress={onContinue}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.continueBtnText}>변경</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: "#fff"
    },
    container: {
        flex: 1,
        paddingHorizontal: 28,
    },
    titleContainer: {
        paddingTop: 70,
        paddingBottom: 30
    },
    title: {
        paddingHorizontal: 10,
        fontSize: 22,
        lineHeight: 30,
        fontWeight: "800",
        color: "#111",
        ...(Platform.OS === "android" ? { includeFontPadding: false } : null),
    },
    formContainer:{
        paddingHorizontal: 10,
        gap: 6,
        paddingTop: 4
    },
    nick: {
        color: "#F59E0B" 
     },
    input: {
        height: 44,
        borderRadius: 10,
        borderWidth: 1.2,
        borderColor: "#E0E0E0",
        paddingHorizontal: 12,
        backgroundColor: "#fff",
        fontSize: 14,
        color: "#111",
        ...(Platform.OS === "android" ? { includeFontPadding: false } : null),
    },
    hintText: {
        paddingHorizontal: 8,
        fontSize: 12,
        color: "#9CA3AF"
    },
    continueBtn: {
        height: 44,
        borderRadius: 10,
        backgroundColor: "#FBBC05",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 4,
    },
    continueBtnText: {
        color: "#111",
        fontWeight: "700",
        fontSize: 14
    },
});