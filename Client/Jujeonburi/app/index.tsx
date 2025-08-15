// app/index.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const nick = await AsyncStorage.getItem("nickname");
      if (nick && nick.trim().length > 0) {
        router.replace("/(tabs)/(home)");        // 닉네임 있으면 메인
      } else {
        router.replace("/(beforeLogin)/index"); // 없으면 온보딩
      }
    })();
  }, []);

  return <View style={{ flex: 1, backgroundColor: "#fff" }} />;
}
