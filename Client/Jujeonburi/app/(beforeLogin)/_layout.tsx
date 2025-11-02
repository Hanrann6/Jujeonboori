// app/(beforeLogin)/_layout.tsx
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

export default function BeforeLoginLayout() {
    return (
        <Stack>
            <Stack.Screen
                name="index"
                options={{
                    headerShown: false, 
                }} />
            <Stack.Screen name="login"
                options={{
                    headerShown: true,
                    title: "로그인",
                    headerTitleStyle: { fontSize: 17, fontWeight: "bold" },
                    headerTitleAlign: "center",
                    headerLeft: () => <BackBtn />,
                    headerShadowVisible: true,
                }} />
            <Stack.Screen name="signUp"
                options={{
                    headerShown: true,
                    title: "회원가입",
                    headerTitleStyle: { fontSize: 17, fontWeight: "bold" },
                    headerTitleAlign: "center",
                    headerLeft: () => <BackBtn />,
                    headerShadowVisible: true,
                }}
            />
            <Stack.Screen name="setNick"
                options={{
                    headerShown: true,
                    title: "회원가입",
                    headerTitleStyle: { fontSize: 17, fontWeight: "bold" },
                    headerTitleAlign: "center",
                    headerLeft: () => <BackBtn />,
                    headerShadowVisible: true,
                }}/>
        </Stack>
    );
}
