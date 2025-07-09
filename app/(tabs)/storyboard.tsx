// /app/(tabs)/storyboard.tsx

import { exportStoryboardAsZip } from "@/services/exportService";
import { printStoryboard } from "@/services/printService";
import React, { useState } from "react";
import {
  ScrollView,
  Text,
  Image,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFilmStore } from "@/store/filmStore";
import { Camera } from "lucide-react-native";

/**
 * Map script length (in minutes) → number of storyboard shots
 */
function getShotsForLength(length: string): number {
  switch (length) {
    case "1":
      return 5;
    case "5":
      return 10;
    case "10":
      return 15;
    case "15":
      return 20;
    case "30":
      return 25;
    case "60":
      return 35;
    case "120":
      return 60;
    default:
      return 5;
  }
}

export default function StoryboardScreen() {
  const { filmPackage, updateFilmPackage } = useFilmStore();

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  const handleGenerateStoryboard = async () => {
    const idea = filmPackage?.script || "";
    const genre = filmPackage?.genre || "Drama";
    const length = filmPackage?.length || "1";

    if (!idea) {
      Alert.alert("Missing Script", "Please generate a script first.");
      return;
    }

    const totalShots = getShotsForLength(length);

    setLoading(true);
    setLoadingMessage(`Generating ${totalShots} storyboard images...`);

    try {
      const storyboard: any[] = [];

      for (let i = 0; i < totalShots; i++) {
        setLoadingMessage(`Generating image ${i + 1} of ${totalShots}...`);

        const response = await fetch("/api/storyboard", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sceneText: idea,
            genre,
            style:
              "professional storyboard pencil sketch, black-and-white, no text, no film crew, no film equipment, no watermarks, clear scene composition, simpler lines, avoid photorealism",
            resolution: "256x256", // ✅ lower resolution
            provider: "openai",
          }),
        });

        const data = await response.json();

        if (
          !response.ok ||
          !data.shots ||
          !Array.isArray(data.shots) ||
          !data.shots[0]?.image
        ) {
          console.warn(`Shot ${i + 1} failed`, data);
          continue;
        }

        const shot = data.shots[0];

        storyboard.push({
          sceneNumber: i + 1,
          imageUrl: shot.image,
          shot_type: shot.shot_type,
          description: shot.description,
          lens_angle: shot.lens_angle,
          movement: shot.movement,
          lighting_setup: shot.lighting_setup,
        });
      }

      if (storyboard.length === 0) {
        Alert.alert("No storyboard shots could be generated.");
        return;
      }

      updateFilmPackage({ storyboard });
      Alert.alert("Storyboard Generated!", "Check the storyboard tab.");
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Error",
        error?.message || "Failed to generate storyboard."
      );
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  const handleExportZip = async () => {
    try {
      if (!filmPackage?.storyboard?.length) {
        Alert.alert("Nothing to export yet!");
        return;
      }

      setLoading(true);
      setLoadingMessage("Preparing ZIP export...");

      await exportStoryboardAsZip(filmPackage.storyboard);

      Alert.alert(
        "Export Complete",
        "Storyboard ZIP exported successfully!"
      );
    } catch (e: any) {
      console.error(e);
      Alert.alert(
        "Export Failed",
        e?.message || "An error occurred during ZIP export."
      );
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  const handlePrintStoryboard = async () => {
    try {
      if (!filmPackage?.storyboard?.length) {
        Alert.alert("Nothing to print yet!");
        return;
      }

      setLoading(true);
      setLoadingMessage("Preparing storyboard for print...");

      await printStoryboard(filmPackage.storyboard);

    } catch (e: any) {
      console.error(e);
      Alert.alert(
        "Print Failed",
        e?.message || "An error occurred while preparing to print."
      );
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  if (!filmPackage?.storyboard?.length) {
    return (
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#021e1f",
          padding: 20,
        }}
      >
        <Camera size={48} color="#FF6A00" />

        <Text
          style={{
            color: "#B2C8C9",
            fontSize: 18,
            marginVertical: 10,
            textAlign: "center",
          }}
        >
          No Storyboard Yet
        </Text>

        <TouchableOpacity
          style={{
            backgroundColor: "#FF6A00",
            padding: 12,
            borderRadius: 8,
            marginTop: 10,
            width: "100%",
          }}
          onPress={handleGenerateStoryboard}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text
              style={{
                color: "#FFFFFF",
                fontWeight: "bold",
                textAlign: "center",
              }}
            >
              Generate Storyboard
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
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{
        backgroundColor: "#021e1f",
        padding: 20,
      }}
    >
      {filmPackage.storyboard.map((scene) => (
        <View key={scene.sceneNumber} style={{ marginBottom: 20 }}>
          <Text
            style={{
              color: "#FF6A00",
              fontSize: 18,
              marginBottom: 8,
              fontWeight: "bold",
            }}
          >
            Scene {scene.sceneNumber}
          </Text>
          {scene.imageUrl ? (
            <View
              style={{
                width: "100%",
                maxWidth: 600,
                alignSelf: "center",
              }}
            >
              <Image
                source={{ uri: scene.imageUrl }}
                style={{
                  width: "100%",
                  aspectRatio: 1,
                  borderRadius: 8,
                  marginBottom: 10,
                }}
              />
            </View>
          ) : (
            <View
              style={{
                width: "100%",
                height: 200,
                backgroundColor: "#032f30",
                borderRadius: 8,
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <Text style={{ color: "#B2C8C9" }}>No Image Available</Text>
            </View>
          )}

          {scene.shot_type && (
            <Text
              style={{
                color: "#B2C8C9",
                fontSize: 14,
                marginBottom: 4,
              }}
            >
              <Text style={{ color: "#FF6A00", fontWeight: "bold" }}>
                Shot Type:
              </Text>{" "}
              {scene.shot_type}
            </Text>
          )}

          {scene.description && (
            <Text
              style={{
                color: "#B2C8C9",
                fontSize: 14,
                marginBottom: 4,
              }}
            >
              <Text style={{ color: "#FF6A00", fontWeight: "bold" }}>
                Description:
              </Text>{" "}
              {scene.description}
            </Text>
          )}

          {scene.lens_angle && (
            <Text
              style={{
                color: "#B2C8C9",
                fontSize: 14,
                marginBottom: 4,
              }}
            >
              <Text style={{ color: "#FF6A00", fontWeight: "bold" }}>
                Lens Angle:
              </Text>{" "}
              {scene.lens_angle}
            </Text>
          )}

          {scene.movement && (
            <Text
              style={{
                color: "#B2C8C9",
                fontSize: 14,
                marginBottom: 4,
              }}
            >
              <Text style={{ color: "#FF6A00", fontWeight: "bold" }}>
                Movement:
              </Text>{" "}
              {scene.movement}
            </Text>
          )}

          {scene.lighting_setup && (
            <Text
              style={{
                color: "#B2C8C9",
                fontSize: 14,
              }}
            >
              <Text style={{ color: "#FF6A00", fontWeight: "bold" }}>
                Lighting:
              </Text>{" "}
              {scene.lighting_setup}
            </Text>
          )}
        </View>
      ))}

      <TouchableOpacity
        style={{
          backgroundColor: "#FF6A00",
          padding: 12,
          borderRadius: 8,
          marginTop: 20,
        }}
        onPress={handleExportZip}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text
            style={{
              color: "#FFFFFF",
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            Export Storyboard as ZIP
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={{
          backgroundColor: "#FF6A00",
          padding: 12,
          borderRadius: 8,
          marginTop: 10,
        }}
        onPress={handlePrintStoryboard}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text
            style={{
              color: "#FFFFFF",
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            Print Storyboard
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
    </ScrollView>
  );
}
