import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Setting() {
    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.container}>
                <Text style={styles.Title}>설정</Text>
                <View style={styles.BtnContainer}>
                    <TouchableOpacity style={styles.Btn} onPress={() => router.replace("/(beforeLogin)")}>
                        <Text style={styles.BtnText}>로그아웃</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.Btn} onPress={() => router.push("./delete")}>
                        <Text style={styles.BtnText}>회원탈퇴</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safe: { 
        flex: 1, 
        backgroundColor: "#FFFFFF" 
    },
    container: { 
        flex: 1, 
        paddingHorizontal: 20,
        
    },
    Title: {
        fontSize: 22,
        fontWeight: "800",
        color: "#111827",
        margin: 20,
        marginTop: 0,
    },
    BtnContainer: {
        alignItems: "center",
    },
    Btn: {
        marginTop: 10,
        width: 320,
        height: 45,
        justifyContent: "center",
        padding: 10,
        backgroundColor: "white",
        borderRadius: 8,     
        borderWidth: 1.5,          
        borderColor: "gray",    
},
    BtnText: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#333",
        textAlign: "center"
    },
});