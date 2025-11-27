// app/(beforeLogin)/login.tsx
import { loginWithGoogleIdToken, loginWithKakaoIdToken } from "@/app/lib/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { initializeKakaoSDK } from "@react-native-kakao/core";
import { login as kakaoLogin } from "@react-native-kakao/user";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Image, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const KAKAO_NATIVE_KEY = process.env.EXPO_PUBLIC_KAKAO_NATIVE_KEY!;
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!;
const GOOGLE_REDIRECT_URI = process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI!;

export default function LoginScreen() {
  const router = useRouter();
  const [kloading, setKloading] = useState(false);
  const [gloading, setGloading] = useState(false);
  // ---- 카카오 로그인 처리 ----
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
    if (kloading) return;
    try {
      setKloading(true);

      // 카카오 로그인 → idToken 획득
      const { idToken } = await kakaoLogin();
      if (!idToken) throw new Error("카카오 로그인 토큰을 받지 못했습니다.");

      // 서버 로그인(신규/기존 통합) → 토큰·user_id 저장은 auth.ts에서 처리
      const { isNewUser } = await loginWithKakaoIdToken(idToken);

      // 분기: 신규 → 온보딩, 그 외 → 홈
      if (isNewUser) {
        router.replace("/(beforeLogin)/setNick");
      } else {
        router.push("../(tabs)/(home)")
      }
    } catch (err: any) {
      Alert.alert("로그인 오류", err?.message ?? "로그인 중 문제가 발생했습니다.");
    } finally {
      setKloading(false);
    }
  };
  //--- 구글 로그인 처리 --
  // 1) Google SDK 초기화
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: GOOGLE_CLIENT_ID,
      offlineAccess: true,
    });
  }, []);

  // 2) 구글 로그인 핸들러
  const onGoogle = async () => {
    if (gloading) return;
    try {
      setGloading(true);
      await GoogleSignin.signOut();
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();

      const serverAuthCode = userInfo.data?.serverAuthCode;
      if (!serverAuthCode) {
        throw new Error("구글 로그인 토큰을 받지 못했습니다.");
      }
      const { isNewUser } = await loginWithGoogleIdToken(serverAuthCode, GOOGLE_REDIRECT_URI);
      // 분기: 신규 → 온보딩, 그 외 → 홈
      if (isNewUser) {
        router.replace("/(beforeLogin)/setNick");
      } else {
        router.push("../(tabs)/(home)")
      }

    } catch (err: any) {
      console.log("[Google] ERROR:", err);
      Alert.alert("구글 로그인 오류", err?.message ?? "로그인 중 문제가 발생했습니다.");
    } finally {
      setGloading(false);
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
          {/* 카카오 로그인 */}
          <TouchableOpacity onPress={onKakao} activeOpacity={0.8} disabled={kloading}>
            <Image
              source={require("../../assets/images/kakao_signUp_medium_wide.png")}
              style={[styles.kakaoBtn, kloading && { opacity: 0.6 }]}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={onGoogle} style={styles.googleBtn} activeOpacity={0.8} disabled={gloading}>
                      <Image
                        source={require("../../assets/images/google_login.png")}
                        style={[styles.googleIcon, kloading && { opacity: 0.6 }]}
                        resizeMode="contain"
                      />
                      <Text style={styles.googleText}>구글로 시작하기</Text>
                    </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFF"
  },
  container: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20
  },
  IntroTextContainer: {
    flex: 9,
    justifyContent: "center",
    paddingBottom: 90,
  },
  bold: {
    fontWeight: "bold",
  },
  IntroText_1: {
    fontSize: 36,
    color: "#111",
    ...(Platform.OS === "android" ? { includeFontPadding: false } : null),
  },
  IntroText_2: {
    marginTop: -20,
    fontSize: 24,
    lineHeight: 30,
    color: "#333",
  },
  buttonContainer: { flex: 5, paddingBottom: 10, gap: 12 },
  kakaoBtn: { width: 300 },
  googleBtn: { width: 300, height: 45, backgroundColor: "#FFFFFF", borderRadius: 4, borderWidth: 1, borderColor: "#DDD", justifyContent: "center", alignItems: "center", flexDirection: "row", gap: 8, },
  googleText: { fontSize: 14, fontWeight: "600", color: "darkslategray", },
  googleIcon: { position: "absolute", left: 12, width: 20, height: 20, }
});
