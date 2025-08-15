// app/(initialProfile)/_layout.tsx
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { TouchableOpacity } from "react-native";

function BackBtn() {
  const router = useRouter();
  return (
      <TouchableOpacity onPress={() => router.push("/(beforeLogin)")} style={{ paddingHorizontal: 12 }}>
          <Ionicons name="arrow-back" size={24} color="black" />
      </TouchableOpacity>
  );

}
export default function InitialProfileLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          title: "주류 취향 분석",
          headerTitleStyle: { fontSize: 17, fontWeight: "bold" },
          headerTitleAlign: "center",
          headerLeft: () => <BackBtn />,
          headerShadowVisible: true,
        }}
      />
      <Stack.Screen
        name="testResult"
        options={{
          headerShown: true,
          title: "주류 취향 분석",
          headerTitleStyle: { fontSize: 17, fontWeight: "bold" },
          headerTitleAlign: "center",
          headerLeft: () => <BackBtn />,
          headerShadowVisible: true,
        }}/>
    </Stack>
  );
}
