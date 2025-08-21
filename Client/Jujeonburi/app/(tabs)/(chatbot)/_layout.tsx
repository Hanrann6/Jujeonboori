// app/(tabs)/(chatbot)/_layout.tsx

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

export default function ChatbotLayout() {
    return (
        <Stack>
            <Stack.Screen
                name="index"
                options={{
                    headerShown: true,
                    title: "챗봇",
                    headerTitleStyle: { fontSize: 18, fontWeight: "700" },
                    headerTitleAlign: "center",
                    headerLeft: () => <BackBtn />,
                    headerShadowVisible: true,
                }} />
        </Stack>
    );
}
