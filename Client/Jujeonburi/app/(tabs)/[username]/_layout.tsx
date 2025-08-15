//app/(tabs)/[username]/_layout.tsx

import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { TouchableOpacity } from "react-native";

function BackBtn() {
  const router = useRouter();
  return (
      <TouchableOpacity onPress={() => router.back()} style={{ paddingHorizontal: 12 }}>
          <Ionicons name="arrow-back" size={24} color="black" />
      </TouchableOpacity>
  );

}
export default function UserProfileLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          title: "마이 페이지",
          headerTitleStyle: { fontSize: 16, fontWeight: "700" },
          headerTitleAlign: "center",
          headerLeft: () => <BackBtn />,
          headerShadowVisible: true,
        }}
      />
      <Stack.Screen
        name="liked"
        options={{
          headerShown: true,
          title: "마이 페이지",
          headerTitleStyle: { fontSize: 16, fontWeight: "700" },
          headerTitleAlign: "center",
          headerLeft: () => <BackBtn />,
          headerShadowVisible: true,
        }}
      />
      <Stack.Screen
        name="review"
        options={{
          headerShown: true,
          title: "마이 페이지",
          headerTitleStyle: { fontSize: 16, fontWeight: "700" },
          headerTitleAlign: "center",
          headerLeft: () => <BackBtn />,
          headerShadowVisible: true,
        }}
      />
      <Stack.Screen
        name="setting"
        options={{
          headerShown: true,
          title: "설정",
          headerTitleStyle: { fontSize: 16, fontWeight: "700" },
          headerTitleAlign: "center",
          headerLeft: () => <BackBtn />,
          headerShadowVisible: true,
        }}
      />
    </Stack>
  );
}
