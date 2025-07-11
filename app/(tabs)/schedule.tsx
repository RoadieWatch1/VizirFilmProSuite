// /app/(tabs)/schedule.tsx
import { exportFilmPackageAsPDF } from "@/services/exportService";
import React, { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useFilmStore } from "@/store/filmStore";
import { Calendar } from "lucide-react-native";

export default function ScheduleScreen() {
  const { filmPackage, updateFilmPackage } = useFilmStore();

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("");

  const handleGenerateSchedule = async () => {
    const idea = filmPackage?.script || "";
    const genre = filmPackage?.genre || "";
    const length = filmPackage?.length || "";

    if (!idea || !genre || !length) {
      Alert.alert(
        "Missing Data",
        "Please generate your film package first before creating a shooting schedule."
      );
      return;
    }

    setLoading(true);
    setLoadingMessage("Generating shooting schedule...");

    try {
      const response = await fetch("/api/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          movieIdea: idea,
          movieGenre: genre,
          scriptLength: length,
        }),
      });

      if (!response.ok) {
        const errorResponse = await response.json().catch(() => ({}));
        const errorMsg = errorResponse?.error || "API error";
        throw new Error(errorMsg);
      }

      const data = await response.json();

      const schedule =
        data.schedule?.map((item: any) => ({
          day: item.day,
          scenes: item.scenes,
          location: item.location,
        })) || [];

      updateFilmPackage({ schedule });
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Error",
        error?.message || "Failed to generate shooting schedule."
      );
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  const handleExport = async () => {
    try {
      if (!filmPackage || Object.keys(filmPackage).length === 0) {
        Alert.alert("Nothing to export yet!");
        return;
      }

      await exportFilmPackageAsPDF(filmPackage, "My_Film_Project.pdf");

      Alert.alert(
        "Export Complete",
        "Film package exported and opened for preview!"
      );
    } catch (e: any) {
      console.error(e);
      Alert.alert(
        "Export Failed",
        e?.message || "An error occurred during export."
      );
    }
  };

  if (!filmPackage?.schedule || filmPackage.schedule.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#021e1f",
          padding: 20,
        }}
      >
        <Calendar size={48} color="#FF6A00" />
        <Text
          style={{
            color: "#B2C8C9",
            fontSize: 18,
            marginVertical: 10,
            textAlign: "center",
          }}
        >
          No Schedule Yet
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: "#FF6A00",
            padding: 12,
            borderRadius: 8,
            marginTop: 10,
          }}
          onPress={handleGenerateSchedule}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              Generate Schedule
            </Text>
          )}
        </TouchableOpacity>

        {!!loadingMessage && (
          <Text
            style={{
              color: "#B2C8C9",
              marginTop: 10,
              textAlign: "center",
            }}
          >
            {loadingMessage}
          </Text>
        )}
      </View>
    );
  }

  return (
    <ScrollView
      style={{
        backgroundColor: "#021e1f",
        padding: 20,
      }}
    >
      <Text
        style={{
          color: "#FF6A00",
          fontSize: 20,
          marginBottom: 10,
          fontWeight: "bold",
        }}
      >
        Shooting Schedule
      </Text>

      {filmPackage.schedule.map((item, index) => (
        <View key={index} style={{ marginBottom: 20 }}>
          <Text
            style={{
              color: "#B2C8C9",
              fontWeight: "bold",
              fontSize: 16,
            }}
          >
            Day {item.day}
          </Text>
          <Text
            style={{
              color: "#B2C8C9",
              marginTop: 4,
            }}
          >
            Scenes: {item.scenes?.length > 0 ? item.scenes.join(", ") : "N/A"}
          </Text>
          <Text
            style={{
              color: "#B2C8C9",
            }}
          >
            Location: {item.location || "N/A"}
          </Text>
        </View>
      ))}

      {/* Export Button */}
      <TouchableOpacity
        style={{
          backgroundColor: "#FF6A00",
          padding: 12,
          borderRadius: 8,
          marginTop: 20,
        }}
        onPress={handleExport}
      >
        <Text
          style={{
            color: "#FFFFFF",
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          Export Schedule as PDF
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
