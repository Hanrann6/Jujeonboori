// app/delete/index.tsx
import { deleteAccount } from "@/app/lib/auth";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function DeleteAccount() {
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const onSubmit = async () => {
    Alert.alert(
      "정말 탈퇴하시겠어요?",
      "탈퇴 즉시 모든 정보와 활동 내역이 삭제되며, 복구가 불가능합니다.",
      [
        { text: "취소", style: "cancel" },
        { text: "탈퇴", style: "destructive", onPress: handleDelete },
      ],
    );
  };

  const handleDelete = async () => {
    if (loading) return;
    try {
      setLoading(true);
      await deleteAccount();
      console.log("회원탈퇴 성공");
      router.dismissAll();
      router.replace("/(beforeLogin)");
    } catch (e: any) {
      Alert.alert("탈퇴 실패", e?.message ?? "잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.noticeTitle}>탈퇴하기 전,{"\n"}꼭 확인해주세요.</Text>

      <View style={styles.noticeCard}>
        <Text style={styles.noticeText}>
          회원 탈퇴 시, 모든 정보와 활동 내역이 사라져요.{"\n"}
          삭제된 정보는 다시 복구할 수 없어요.
        </Text>
      </View>

      <Pressable
        style={styles.agreeRow}
        onPress={() => setAgree((v) => !v)}
        android_ripple={{ color: "#eee" }}
      >
        <View style={[styles.checkbox, agree && styles.checkboxChecked]}>
          {agree && <View style={styles.checkboxDot} />}
        </View>
        <Text style={styles.agreeText}>
          안내사항을 모두 확인하였으며, 이에 동의합니다.
        </Text>
      </Pressable>

      <Pressable
        disabled={!agree || loading}
        onPress={onSubmit}
        style={({ pressed }) => [
          styles.submitBtn,
          (!agree || loading) ? styles.submitBtnDisabled : styles.submitBtnEnabled,
          pressed && !loading && agree && { opacity: 0.85 },
        ]}
      >
        {loading ? (
          <ActivityIndicator />
        ) : (
          <Text
            style={[
              styles.submitText,
              (!agree || loading) ? styles.submitTextDisabled : styles.submitTextEnabled,
            ]}
          >
            탈퇴하기
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
     flex: 1, 
     backgroundColor: "white" 
    },
  noticeCard: {
    backgroundColor: "#F7F8FA",
    padding:20,
    justifyContent: "center",
    alignItems: "center",
  },
  noticeTitle: { 
    fontSize: 22, 
    fontWeight: "800", 
    color: "#111827", 
    lineHeight: 28, 
    margin:40,
    marginTop: 80
},
  noticeText: {
    margin: 20,
    fontSize: 14,
    lineHeight: 20,
    color: "dark-gray",
  },
  agreeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 12,
    marginTop:0,
    margin:20,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#B0B8C1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  checkboxChecked: {
    borderColor: "#111827",
  },
  checkboxDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#111827",
  },
  agreeText: { flex: 1, color: "#111827", fontSize: 14 },

  submitBtn: {
    marginHorizontal: 40,
    height: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnEnabled: {
    backgroundColor: "#383742",
  },
  submitBtnDisabled: {
    backgroundColor: "#E5E7EB",
  },
  submitText: { fontSize: 14 },
  submitTextEnabled: { color: "#fff" },
  submitTextDisabled: { color: "#9CA3AF" },
});
