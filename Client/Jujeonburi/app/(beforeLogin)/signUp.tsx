// app/(beforeLogin)/signUp.tsx
import { getKeyHashAndroid, initializeKakaoSDK } from "@react-native-kakao/core";
import { login as kakaoLogin } from "@react-native-kakao/user";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Image, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { loginWithKakaoIdToken } from "@/app/lib/auth";

const KAKAO_NATIVE_KEY = process.env.EXPO_PUBLIC_KAKAO_NATIVE_KEY!;

export default function SignUpScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // 1) Kakao SDK 초기화
  useEffect(() => {
    try {
      initializeKakaoSDK(KAKAO_NATIVE_KEY);
    } catch (e) {
      console.warn("KakaoSDK init failed:", e);
    }
  }, []);

  // 2) 카카오 로그인 핸들러
  const onKakao = async () => {
    console.log("Kakao KeyHash (Android):", await getKeyHashAndroid());
    if (loading) return;
    try {
      setLoading(true);

      // 카카오 로그인 → idToken 획득
      const { idToken } = await kakaoLogin();
      if (!idToken) throw new Error("카카오 로그인 토큰을 받지 못했습니다.");

      // 서버 로그인(신규/기존 통합) → 토큰·user_id 저장은 auth.ts에서 처리
      const { isNewUser} = await loginWithKakaoIdToken(idToken);

      // 분기: 신규 → 온보딩, 그 외 → 홈
      if (isNewUser) {
        router.replace("/(beforeLogin)/setNick");
      } else {
        router.push("../(tabs)/(home)")
      }
    } catch (err: any) {
      Alert.alert("로그인 오류", err?.message ?? "로그인 중 문제가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* 텍스트 영역 */}
        <View style={styles.IntroTextContainer}>
          <Text style={[styles.IntroText_1, styles.bold]}>전통주,{"\n"}</Text>
          <Text style={styles.IntroText_2}>
            어렵지 않게 즐길 수 있도록{"\n"}
            <Text style={styles.bold}>주전부리</Text>가 도와드릴게요.
          </Text>
        </View>

        {/* 버튼 영역 */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity onPress={onKakao} activeOpacity={0.8} disabled={loading}>
            <Image
              source={require("../../assets/images/kakao_signUp_medium_wide.png")}
              style={[styles.kakaoBtn, loading && { opacity: 0.6 }]}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFF" },
  container: { flex: 1, alignItems: "center", paddingHorizontal: 20 },
  IntroTextContainer: { flex: 9, justifyContent: "center", paddingBottom: 90 },
  bold: { fontWeight: "bold" },
  IntroText_1: { fontSize: 36, color: "#111", ...(Platform.OS === "android" ? { includeFontPadding: false } : null) },
  IntroText_2: { marginTop: -20, fontSize: 24, lineHeight: 30, color: "#333" },
  buttonContainer: { flex: 1, paddingBottom: 110, gap: 12 },
  kakaoBtn: { width: 300 },
});
