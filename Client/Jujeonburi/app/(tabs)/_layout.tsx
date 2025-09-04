// ./app/(tabs)/_layout.tsx

import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function TabLayout() {

    return (
        <Tabs screenOptions={{ headerShown: false, }}>
            <Tabs.Screen name="(home)"
                options={{
                    tabBarLabel: () => null,
                    tabBarIcon: ({ focused }) => (
                        <Ionicons
                            name="home"
                            size={24}
                            color={focused ? "black" : "gray"}
                        />
                    )
                }} />
            <Tabs.Screen name="(chatbot)"
                options={{
                    tabBarLabel: () => null,
                    tabBarIcon: ({ focused }) => (
                        <Ionicons
                            name="chatbubble-outline"
                            size={24}
                            color={focused ? "black" : "gray"}
                        />
                    )
                }} />

            <Tabs.Screen name="(festivals)"
                options={{
                    tabBarLabel: () => null,
                    tabBarIcon: ({ focused }) => (
                        <Ionicons
                            name="balloon-outline"
                            size={24}
                            color={focused ? "black" : "gray"}
                        />
                    )
                }} />
            <Tabs.Screen name="[username]"
                options={{
                    tabBarLabel: () => null,
                    tabBarIcon: ({ focused }) => (
                        <Ionicons
                            name="person-outline"
                            size={24}
                            color={focused ? "black" : "gray"}
                        />
                    )
                }} />
        </Tabs>
    );
};