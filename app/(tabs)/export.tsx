// /app/(tabs)/export.tsx

import React from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useFilmStore } from "@/store/filmStore";
import { exportFilmPackageAsPDF } from "@/services/exportService";

export default function ExportScreen() {
  const { filmPackage } = useFilmStore();

  const handleExport = async () => {
    try {
      if (!filmPackage || Object.keys(filmPackage).length === 0) {
        Alert.alert("Nothing to export yet!");
        return;
      }

      const res = await fetch("/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          movieIdea: filmPackage.idea,
          movieGenre: filmPackage.genre,
          scriptLength: filmPackage.length,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error?.error || "Failed to generate export package.");
      }

      const data = await res.json();

      if (!data.exportPackage) {
        throw new Error("Export package missing from API response.");
      }

      console.log("✅ Export package received:", data.exportPackage);

      // ✅ create a combined object to pass to PDF
      const pdfData = {
        ...filmPackage,
        exportPackage: data.exportPackage,
      };

      await exportFilmPackageAsPDF(pdfData, "My_Film_Project.pdf");

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

  if (!filmPackage || Object.keys(filmPackage).length === 0) {
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
        <Text
          style={{
            color: "#B2C8C9",
            fontSize: 18,
            textAlign: "center",
          }}
        >
          Nothing to export yet. Generate your film package first!
        </Text>
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
        }}
      >
        Export Overview
      </Text>
      <Text
        style={{
          color: "#B2C8C9",
          fontSize: 16,
          lineHeight: 22,
          marginBottom: 10,
        }}
      >
        Your film package is ready! Tap below to export as a PDF file.
      </Text>

      <TouchableOpacity
        style={{
          backgroundColor: "#FF6A00",
          padding: 12,
          borderRadius: 8,
          marginBottom: 20,
        }}
        onPress={handleExport}
      >
        <Text
          style={{
            color: "#fff",
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          Export Film Package
        </Text>
      </TouchableOpacity>

      {!!filmPackage.concept && (
        <Text
          style={{
            color: "#B2C8C9",
            fontSize: 14,
            marginTop: 5,
          }}
        >
          Concept: {filmPackage.concept}
        </Text>
      )}

      {!!filmPackage.script && (
        <Text
          style={{
            color: "#B2C8C9",
            fontSize: 14,
            marginTop: 5,
          }}
        >
          Script snippet: {filmPackage.script.substring(0, 200)}...
        </Text>
      )}

      <Text
        style={{
          color: "#B2C8C9",
          fontSize: 14,
          marginTop: 5,
        }}
      >
        Characters: {filmPackage.characters?.length || 0}
      </Text>

      <Text
        style={{
          color: "#B2C8C9",
          fontSize: 14,
          marginTop: 5,
        }}
      >
        Storyboard scenes: {filmPackage.storyboard?.length || 0}
      </Text>

      <Text
        style={{
          color: "#B2C8C9",
          fontSize: 14,
          marginTop: 5,
        }}
      >
        Locations: {filmPackage.locations?.length || 0}
      </Text>

      <Text
        style={{
          color: "#B2C8C9",
          fontSize: 14,
          marginTop: 5,
        }}
      >
        Budget categories:{" "}
        {filmPackage.budget
          ? Array.isArray(filmPackage.budget)
            ? filmPackage.budget.length
            : 1
          : 0}
      </Text>

      <Text
        style={{
          color: "#B2C8C9",
          fontSize: 14,
          marginTop: 5,
        }}
      >
        Schedule days: {filmPackage.schedule?.length || 0}
      </Text>
    </ScrollView>
  );
}
