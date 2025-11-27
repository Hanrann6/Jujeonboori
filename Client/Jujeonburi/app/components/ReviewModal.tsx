// components/Review.tsx
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView, Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ReviewModalProps = {
  alcoholName: string;
  onSubmit: (p: {
    rating: number;
    content: string;
    images?: { uri: string }[]
  }) => void | Promise<void>;
  onRequestClose: () => void;
  mode?: "create" | "edit";
  defaultRating?: number;
  defaultContent?: string;
  defaultImages?: { uri: string }[];
};

const MAX_IMAGES = 5;

export default function ReviewModal({
  alcoholName,
  onSubmit,
  onRequestClose,
  mode = "create",
  defaultRating = 0,
  defaultContent = "",
  defaultImages = [],
}: ReviewModalProps) {
  const router = useRouter();
  const [images, setImages] = useState(defaultImages);
  const [content, setContent] = useState(defaultContent);
  const [rating, setRating] = useState(defaultRating);

  const openPickerSheet = () => {
    const pickFromCamera = async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("권한 필요", "카메라 권한을 허용해주세요.");
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.7,
      });
      if (!res.canceled) addImages(res.assets);
    };

    const pickFromLibrary = async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("권한 필요", "앨범 접근 권한을 허용해주세요.");
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: Math.min(MAX_IMAGES - images.length),
        quality: 0.7,
      });
      if (!res.canceled) addImages(res.assets);
    };
    Alert.alert("이미지 첨부", "어디에서 가져올까요?", [
      { text: "취소", style: "cancel" },
      { text: "카메라", onPress: pickFromCamera },
      { text: "앨범", onPress: pickFromLibrary },
    ]);
  };

  const addImages = (assets: ImagePicker.ImagePickerAsset[]) => {
    const rest = MAX_IMAGES - images.length;
    const next = assets.slice(0, rest).map((a) => ({ uri: a.uri }));
    setImages((prev) => [...prev, ...next]);
  };

  const removeAt = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    if (!rating) {
      Alert.alert("별점 선택", "만족도를 1점 이상 선택해주세요.");
      return;
    }
    if (!content.trim()) {
      Alert.alert("내용 입력", "리뷰 내용을 입력해주세요.");
      return;
    }

    const payload = {
      rating,
      content: content.trim(),
      images,
    };

    await onSubmit?.(payload);
    exit();
  };


  const exit = () => {
    if (onRequestClose) {
      onRequestClose();    // 모달 닫기(상위에서 setOpenReview(false))
    } else {
      router.back();       // 라우트로 열었을 때만
    }
  };

  const handleBackPress = () => {
    if (content.trim() || images.length > 0) {
      Alert.alert("리뷰 작성 취소", "작성 중인 리뷰가 있습니다. 나가시겠습니까?", [
        { text: "취소", style: "cancel" },
        { text: "나가기", onPress: () => exit() },
      ]);
    } else {
      exit();
    }

  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: "padding" })}>
      <SafeAreaView style={styles.safe}>
        {/* 헤더 */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
            <TouchableOpacity onPress={handleBackPress} style={{ position: "absolute", left: 0, width: 28, height: 28, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="arrow-back" size={24} color="black" />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: "800" }}>리뷰 작성</Text>
          </View>
          <View style={{ height: 1, backgroundColor: "#F3F4F6", marginTop: 8 }} />
        </View>

        <View style={styles.card}>
          {/* 업로드 + 미리보기 */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <TouchableOpacity style={styles.uploadTile} onPress={openPickerSheet}>
              <Ionicons name="image-outline" size={28} color="#6B7280" />
              <Text style={{ fontSize: 14, color: "#6B7280" }}>업로드</Text>
            </TouchableOpacity>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {images.map((img, idx) => (
                  <View key={img.uri} style={styles.thumbWrap}>
                    <Image source={{ uri: img.uri }} style={styles.thumb} />
                    <TouchableOpacity style={styles.removeBadge} onPress={() => removeAt(idx)}>
                      <Text style={{ color: "white", fontWeight: "700" }}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
          <View style={styles.divider} />
          <Text style={styles.alcoholName}>{alcoholName}</Text>
          <View style={styles.divider} />

          {/* 리뷰 입력 */}
          <TextInput
            style={styles.textArea}
            multiline
            value={content}
            onChangeText={setContent}
            placeholder={`"${alcoholName}"에 대한 리뷰를 작성해주세요.`}
            placeholderTextColor="#9CA3AF"
            textAlignVertical="top"
          />

          {/* 별점 */}
          <View style={styles.ratingBlock}>
            <Text style={{ fontSize: 16 }}>만족도를 기록해주세요</Text>
            <View style={{ flexDirection: "row", alignItems: "baseline" }}>
              {Array.from({ length: 5 }).map((_, i) => {
                const filled = i < rating;
                return (
                  <TouchableOpacity key={i} onPress={() => setRating(i + 1)} >
                    <Text style={[styles.star, filled && styles.starFilled]}>★</Text>
                  </TouchableOpacity>
                );
              })}
              <Text style={{ fontSize: 16, marginLeft: 8, color: "#111827" }}>{rating}.0</Text>
            </View>
          </View>

          {/* 등록 버튼 */}
          <TouchableOpacity
            style={[styles.submitBtn, { opacity: content.trim() ? 1 : 0.6 }]}
            onPress={submit}
            disabled={!content.trim() || !rating}>
            <Text style={{ fontWeight: "700", color: "#111827" }}>등록하기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "white"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8
  },
  backBtn: {
    position: "absolute", left: 0, width: 28, height: 28,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827"
  },

  card: {
    backgroundColor: "white",
    borderWidth: 1, borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16, gap: 12,
  },

  uploadTile: {
    width: 80, height: 80, borderRadius: 8,
    borderWidth: 2, borderColor: "#828282",
    alignItems: "center", justifyContent: "center", backgroundColor: "#F9FAFB",
  },
  thumbWrap: { width: 80, height: 80, borderRadius: 8, overflow: "hidden", position: "relative" },
  thumb: { width: "100%", height: "100%" },
  removeBadge: {
    position: "absolute", top: 4, right: 4,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center",
  },
  alcoholName: {
    fontSize: 18,
    textAlign: "center",
    fontWeight: "600",
    color: "#111827"
  },

  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    marginHorizontal: 15,
  },
  textArea: {
    minHeight: 140,
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8,
    padding: 12, color: "#111827", lineHeight: 20,
  },

  ratingBlock: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12
  },

  star: { fontSize: 35, color: "#D1D5DB" },
  starFilled: { color: "#F59E0B" },

  submitBtn: {
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, paddingVertical: 12,
    backgroundColor: "#F9FAFB",
  },
});
