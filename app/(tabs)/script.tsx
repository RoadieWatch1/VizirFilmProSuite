// /app/(tabs)/script.tsx

import { exportScriptAsTxt } from "@/services/exportService";
import React, { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useFilmStore } from "@/store/filmStore";
import { Video } from "lucide-react-native";

export default function ScriptScreen() {
  const { filmPackage, updateFilmPackage } = useFilmStore();

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("");

  const [idea, setIdea] = useState(filmPackage.idea || "");
  const [genre, setGenre] = useState(filmPackage.genre || "");
  const [length, setLength] = useState(filmPackage.length || "");

  const handleGenerateScript = async () => {
    if (!idea || !genre || !length) {
      Alert.alert(
        "Missing Data",
        "Please enter your film idea, genre, and length before generating a script."
      );
      return;
    }

    setLoading(true);
    setLoadingMessage("Generating script...");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          movieIdea: idea,
          movieGenre: genre,
          scriptLength: length,
          step: "script",
          provider: "openai",
        }),
      });

      if (!response.ok) {
        const errorResponse = await response.json().catch(() => ({}));
        const errorMsg = errorResponse?.error || "API error";
        throw new Error(errorMsg);
      }

      const data = await response.json();

      console.log("✅ API returned script data:", data);

      const scriptText =
        data?.script ||
        data?.result?.script ||
        "";

      updateFilmPackage({
        script: scriptText,
        idea,
        genre,
        length,
      });

      Alert.alert("Script Generated", "Your film script has been generated!");
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        "Error",
        error?.message || "Failed to generate script."
      );
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  const handleExport = async () => {
    try {
      if (!filmPackage?.script || filmPackage.script.trim() === "") {
        Alert.alert("Nothing to export yet!");
        return;
      }

      console.log("✅ Exporting script text:", filmPackage.script);

      await exportScriptAsTxt(
        filmPackage.script,
        "My_Film_Script.txt"
      );

      Alert.alert(
        "Export Complete",
        "Film script exported as TXT!"
      );
    } catch (e: any) {
      console.error(e);
      Alert.alert(
        "Export Failed",
        e?.message || "An error occurred during export."
      );
    }
  };

  if (!filmPackage?.script || filmPackage.script.trim() === "") {
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
        <Video size={48} color="#FF6A00" />
        <Text
          style={{
            color: "#B2C8C9",
            fontSize: 18,
            marginVertical: 10,
            textAlign: "center",
          }}
        >
          No Script Yet
        </Text>

        <TextInput
          placeholder="Film Idea"
          placeholderTextColor="#999"
          value={idea}
          onChangeText={setIdea}
          style={{
            backgroundColor: "#032f30",
            color: "#FFFFFF",
            width: "100%",
            padding: 10,
            marginBottom: 10,
            borderRadius: 8,
          }}
        />
        <TextInput
          placeholder="Genre"
          placeholderTextColor="#999"
          value={genre}
          onChangeText={setGenre}
          style={{
            backgroundColor: "#032f30",
            color: "#FFFFFF",
            width: "100%",
            padding: 10,
            marginBottom: 10,
            borderRadius: 8,
          }}
        />
        <TextInput
          placeholder="Script Length (short, medium, long)"
          placeholderTextColor="#999"
          value={length}
          onChangeText={setLength}
          style={{
            backgroundColor: "#032f30",
            color: "#FFFFFF",
            width: "100%",
            padding: 10,
            marginBottom: 10,
            borderRadius: 8,
          }}
        />

        <TouchableOpacity
          style={{
            backgroundColor: "#FF6A00",
            padding: 12,
            borderRadius: 8,
            marginTop: 10,
            width: "100%",
          }}
          onPress={handleGenerateScript}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "bold", textAlign: "center" }}>
              Generate Script
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
      <Text
        style={{
          color: "#FF6A00",
          fontSize: 20,
          marginBottom: 10,
          fontWeight: "bold",
        }}
      >
        Film Script
      </Text>
      <Text
        style={{
          color: "#FFFFFF",
          fontFamily: "Courier",
          fontSize: 16,
          lineHeight: 24,
        }}
      >
        {filmPackage.script}
      </Text>

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
          Export Script as TXT
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
