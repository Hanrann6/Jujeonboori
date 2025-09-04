import { Asset } from "expo-asset";
import Constants from "expo-constants";
import * as Font from "expo-font";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import Toast from "react-native-toast-message";


const splashImg = require("../assets/images/splash-icon.png");
SplashScreen.preventAutoHideAsync().catch(() => { }); // Expo 스플래시 스크린 자동 숨김 방지
const MIN_SPLASH_MS = 2000; // 스플래시 스크린 2초 이상 보여주도록 설정
const FONTS = {
  BagelFatOne: require("../assets/fonts/BagelFatOne-Regular.ttf"),
};
export default function RootLayout() {
  //처음 스플래시 스크린에 쓸 이미지(splash-icon.png)가 로딩되었는지를 확인
  const [splashReady, setSplashReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    let timer: number | null = null;

    (async () => {
      const preloadImage = Asset.fromModule(splashImg).downloadAsync(); // 스플래시 이미지
      const preloadFonts = Font.loadAsync(FONTS);
      const wait = new Promise((resolve) => {
        timer = setTimeout(resolve, MIN_SPLASH_MS) as unknown as number; // 최소 2초 대기
      });

      await Promise.all([preloadImage, preloadFonts, wait]);
      if (mounted) {
        setSplashReady(true);
        await SplashScreen.hideAsync(); //Expo 기본 스플래시 화면을 숨김 
      }
    })();

    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Slot />
      {!splashReady && (
        <View
          pointerEvents="none"
          style={styles.splashContainer}
        >
          <Image
            source={splashImg}
            style={{ width: 300, height: 300 }}
            resizeMode="contain"
          />
        </View>
      )}
      <Toast position="bottom" bottomOffset={60} />

    </View>
  )
};

const styles = StyleSheet.create({
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor:
      Constants.expoConfig?.splash?.backgroundColor || "#F5F5F5",
  },
});