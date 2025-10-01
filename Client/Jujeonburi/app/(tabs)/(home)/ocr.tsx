// app/(tabs)/(home)/ocr.tsx
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://13.209.223.34:3000";

type OCRResponse = {
  이름: string;
  도수: string;
  단맛: string;
  신맛: string;
  쓴맛: string;
  "어울리는 음식": string;
  "구성 원재료": string;
};

export default function OCRScreen() {
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<OCRResponse | null>(null);

  const pickFromLibrary = async () => {
    setResult(null);
    let { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission to access camera roll is required!",
        "Please allow access to your camera roll to select images.",
        [ // 두가지 옵션을 줌. open settings 또는 cancel
          {
            text: "Open settings",
            onPress: () => { Linking.openSettings(); }, //설정앱을 열어주는 linking
          },
          { text: "Cancel", },
        ]
      );
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      quality: 1,
    });
    if (!res.canceled) {
      setAsset(res.assets[0]);
    }
  };


  const takePhoto = async () => {
    setResult(null);
    let { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission to access camera is required!",
        "Please allow access to your camera to take photos.",
        [ // 두가지 옵션을 줌. open settings 또는 cancel
          {
            text: "Open settings",
            onPress: () => { Linking.openSettings(); },
          },
          { text: "Cancel", },
        ]
      );
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      quality: 1,
    });
    if (!res.canceled) {
      setAsset(res.assets[0]);
    }
  };

  // 간단 MIME 추정(파일 확장자/플랫폼이 알려주는 mimeType 우선)
  const guessMime = (a: ImagePicker.ImagePickerAsset): string => {
    if (a.mimeType) return a.mimeType;
    const lower = (a.fileName || a.uri).toLowerCase();
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
    return "image/jpeg";
  };
  const guessName = (a: ImagePicker.ImagePickerAsset): string => {
    if (a.fileName) return a.fileName;
    //확장자
    const ext = guessMime(a) === "image/png" ? "png" : "jpg";
    return `photo.${ext}`;
  };

  const submit = async () => {
    if (!asset) {
      Alert.alert("이미지 없음", "먼저 이미지를 선택(또는 촬영)해주세요.");
      return;
    }
    try {
      setUploading(true);
      setResult(null);

      const form = new FormData();
      form.append("image" as any, {
        uri: asset.uri,
        name: guessName(asset),
        type: guessMime(asset),
      } as any);

      const res = await fetch(`${API_BASE}/ocr`, {
        method: "POST",
        //mutipart/form-data는 헤더에 boundary가 들어가야 해서, fetch가 자동으로 넣도록 빈칸으로 둠
        body: form,
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`OCR 실패 (${res.status}) ${txt}`);
      }

      const json = (await res.json()) as OCRResponse;
      setResult(json);
      console.log(json);;

    } catch (e: any) {
      Alert.alert("업로드 실패", e?.message ?? "잠시 후 다시 시도해주세요.");
    } finally {
      setUploading(false);
    }
  };
  /*
    const gotoDetail = () => {
      if (!result?.이름) return;
      // 상세 화면은 id가  또는 이름 fallback 지원 → 이름을 인코딩해서 보냄
      router.push({
        pathname: "/(tabs)/(home)/[id]",
        params: { id: encodeURIComponent(result.이름), alcoholName: result.이름 },
      });
    };
  */
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.textContainer}>
          <Text style={styles.title}><Text style={{ color: "#F59E0B"}}>전통주의 라벨</Text>을 찍어주세요. </Text>
          <Text style={styles.hint}>원활한 검색을 위해 라벨이 잘 보이는 사진을 이용해주세요. {"\n"}가능하다면, 라벨 부분만 크롭해주세요. </Text>
        </View>
        {/* 선택/촬영 버튼 */}
        <View style={styles.row}>
          <Pressable style={styles.btn} onPress={pickFromLibrary}>
            <Text style={styles.btnText}>앨범에서 선택</Text>
          </Pressable>
          <Pressable style={styles.btn} onPress={takePhoto}>
            <Text style={styles.btnText}>카메라 촬영</Text>
          </Pressable>
        </View>

        {/* 미리보기 */}
        <View style={{ flex: 1, gap: 12}}>
        {asset && (
          <View style={styles.previewWrap}>
            <Image source={{ uri: asset.uri }} style={styles.preview} resizeMode="contain" />
          </View>
        )}

        {/* 업로드 버튼 */}
        <Pressable
          style={[styles.uploadBtn, (!asset || uploading) && styles.btnDisabled]}
          onPress={submit}
          disabled={!asset || uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#111827" />
          ) : (
            <Text style={styles.uploadText}>이 사진으로 검색하기</Text>
          )}
        </Pressable>

        </View>
        {/* 결과 */}
        {result && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>인식 결과</Text>
            <Row k="이름" v={result.이름} />
            {/*TODO: result.단맛, 신맛, 청량감 바디감을 5단계 도트로 표시*/}
            <Row k="단맛" v={result.단맛} />
            <Row k="신맛" v={result.신맛} />
            <Row k="쓴맛" v={result.쓴맛} />
            <Row k="도수" v={result.도수} />
            <Row k="어울리는 음식" v={result["어울리는 음식"]} />
            <Row k="구성 원재료" v={result["구성 원재료"]} />
            {/*
            <Pressable style={styles.detailBtn} onPress={gotoDetail}>
              <Text style={styles.detailText}>상세 페이지로 이동</Text>
            </Pressable>
            */}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ k, v }: { k: string; v?: string }) {
  return (
    <View style={styles.rowKV}>
      <Text style={styles.k}>{k}</Text>
      <Text style={styles.v}>{v ?? "-"}</Text>
    </View>
  );
}
function Dots({ label, value }: { label: string; value: number }) {
    return (
        <View style={{ flexDirection: "row", marginVertical: 3, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 15, width: 60, color: "#111827", fontWeight: "800", marginRight: 20, }}>{label}</Text>
            {Array.from({ length: 5 }).map((_, i) => {
                const filled = i < Math.round(value);
                return (
                    <View
                        key={i}
                        style={{
                            width: 20, height: 20, borderRadius: 999, marginRight: 8,
                            borderWidth: 1, borderColor: "lightgray",
                            backgroundColor: filled ? "#FFBF60" : "#FAFAFA",
                        }}
                    />
                );
            })}
        </View>
    );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, padding: 20, gap: 16 },
  textContainer: {
    alignItems: "flex-start",
    justifyContent:"center",
    marginTop:30,
    paddingHorizontal: 20
  },
  title: {
    textAlign: "left",
    fontSize: 24,
    fontWeight: "800",
    color: "#111827"
  },
  hint: { 
    marginTop: 4,
    fontSize: 13, 
    color: "#6B7280",
    marginBottom: 20 },
  row: { 
    marginTop:-10,
    marginBottom:10,
    paddingHorizontal: 20,
    flexDirection: "row", 
    gap: 10 },
  btn: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { 
    color: "#111827", 
    fontWeight: "700" 
  },
  previewWrap: {
    height: 240,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal:10,
  },
  preview: { 
    width: "100%", 
    height: "100%", 
    borderRadius: 8 },
  uploadBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: "#FFBF60",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal:20,
  },
  btnDisabled: { opacity: 0.5 },
  uploadText: { 
    fontSize: 15,
    color: "#111827", 
    fontWeight: "800" 
  },
  // 결과 카드
  card: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#FAFAFA",
    gap: 8,
  },
  cardTitle: { 
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800", 
    color: "#111827", 
    marginBottom: 4 
  },

  rowKV: { flexDirection: "row", alignItems: "center", gap: 8 , paddingHorizontal:40},
  k: {
    flex: 1, 
    textAlign: "left",
    color: "#374151", 
    fontWeight: "700", 
  },
  v: {
    textAlign: "center",
    flex: 1, 
    color: "#111827" },

  detailBtn: {
    marginTop: 8,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  detailText: { color: "#fff", fontWeight: "700" },
});
