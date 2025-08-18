// app/index.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

export default function RootIndex() {
  const [ready, setReady] = useState(false);
  const [hasNick, setHasNick] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const nick = await AsyncStorage.getItem("nickname");
        setHasNick(!!nick);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  // 닉네임 없으면 (beforeLogin)로, 있으면 메인 탭으로
  return hasNick
    ? <Redirect href="/(tabs)/(home)" />
    : <Redirect href="/(beforeLogin)/index" />;
}
