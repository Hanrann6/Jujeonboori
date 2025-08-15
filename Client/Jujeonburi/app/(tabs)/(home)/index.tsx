// app/(tabs)/(home)/_layout.tsx

import {
    StyleSheet,
    Text,
    View
} from "react-native";

export default function Home() {

    return (
        <View style = {styles.container}>
            <Text style={{justifyContent:"center", alignItems:"center"}}>홈 메인화면입니다.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor:"white"
    }
  });