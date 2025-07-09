// /app/(tabs)/locations.tsx
import { exportFilmPackageAsPDF } from "@/services/exportService";
import React, { useState } from "react";
import { ScrollView, View, Text, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useFilmStore } from "@/store/filmStore";
import { MapPin } from "lucide-react-native";

export default function LocationsScreen() {
  const { filmPackage, updateFilmPackage } = useFilmStore();

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("");

  const handleGenerateLocations = async () => {
    const idea = filmPackage?.script || "";
    const genre = filmPackage?.genre || "";

    if (!idea || !genre) {
      Alert.alert(
        "Missing Info",
        "Please generate a script and genre first before creating locations."
      );
      return;
    }

    setLoading(true);
    setLoadingMessage("Generating locations...");

    try {
      const response = await fetch("/api/locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          movieIdea: idea,
          movieGenre: genre,
        }),
      });

      if (!response.ok) {
        const errorResponse = await response.json().catch(() => ({}));
        const errorMsg = errorResponse?.error || "API error";
        throw new Error(errorMsg);
      }

      const data = await response.json();

      const locations =
        data.locations?.map((loc: any) => ({
          name: loc.name,
          description: loc.description,
        })) || [];

      updateFilmPackage({ locations });
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error?.message || "Failed to generate locations.");
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

  if (!filmPackage?.locations || filmPackage.locations.length === 0) {
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
        <MapPin size={48} color="#FF6A00" />
        <Text
          style={{
            color: "#B2C8C9",
            fontSize: 18,
            marginVertical: 10,
            textAlign: "center",
          }}
        >
          No Locations Yet
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: "#FF6A00",
            padding: 12,
            borderRadius: 8,
            marginTop: 10,
          }}
          onPress={handleGenerateLocations}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              Generate Locations
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
        Filming Locations
      </Text>

      {filmPackage.locations.map((location, index) => (
        <View key={index} style={{ marginBottom: 20 }}>
          <Text
            style={{
              color: "#B2C8C9",
              fontWeight: "bold",
              fontSize: 16,
            }}
          >
            {location.name}
          </Text>
          <Text
            style={{
              color: "#B2C8C9",
              marginTop: 4,
              fontSize: 14,
            }}
          >
            {location.description}
          </Text>
        </View>
      ))}

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
          Export Locations as PDF
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
