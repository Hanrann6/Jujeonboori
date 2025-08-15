//app/(tabs)/[username]/index.tsx

import { useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";

export default function MyPage() {
  const router = useRouter();
  const { username } = useLocalSearchParams();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}    >        
    </View>
  );
}