// /app/(tabs)/concept.tsx
import { exportFilmPackageAsPDF } from "@/services/exportService";
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useFilmStore } from '@/store/filmStore';
import { Lightbulb } from 'lucide-react-native';

export default function ConceptScreen() {
  const { filmPackage, updateFilmPackage } = useFilmStore();

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const handleGenerateConcept = async () => {
    if (!filmPackage?.script) {
      Alert.alert(
        "Missing Script",
        "Please generate a script before creating a concept."
      );
      return;
    }

    try {
      setLoading(true);
      setLoadingMessage("Generating concept...");

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          movieIdea: filmPackage.script,
          movieGenre: filmPackage.genre || "Drama",
          scriptLength: filmPackage.length || "short",
          step: "concept",
          provider: "openai",
        }),
      });

      if (!res.ok) {
        const errorResponse = await res.json().catch(() => ({}));
        const errorMsg = errorResponse?.error || "API error";
        throw new Error(errorMsg);
      }

      const data = await res.json();

      const concept = data.concept ?? undefined;

      if (concept) {
        updateFilmPackage({ concept });
        Alert.alert("Success", "Concept generated successfully!");
      } else {
        Alert.alert("No Concept", "The AI did not generate a concept. Try again.");
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error?.message || "Failed to generate concept.");
    } finally {
      setLoading(false);
      setLoadingMessage('');
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

  if (!filmPackage?.concept) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#021e1f',
          padding: 20,
        }}
      >
        <Lightbulb size={48} color="#FF6A00" />
        <Text
          style={{
            color: '#B2C8C9',
            fontSize: 18,
            marginVertical: 10,
            textAlign: 'center',
          }}
        >
          No Concept Yet
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: '#FF6A00',
            padding: 12,
            borderRadius: 8,
            marginTop: 10,
          }}
          onPress={handleGenerateConcept}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>
              Generate Concept
            </Text>
          )}
        </TouchableOpacity>

        {!!loadingMessage && (
          <Text
            style={{
              color: '#B2C8C9',
              marginTop: 10,
              textAlign: 'center',
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
        backgroundColor: '#021e1f',
        padding: 20,
      }}
    >
      <Text
        style={{
          color: '#FF6A00',
          fontSize: 20,
          marginBottom: 10,
          fontWeight: 'bold',
        }}
      >
        Film Concept
      </Text>
      <Text
        style={{
          color: '#B2C8C9',
          fontSize: 16,
          lineHeight: 22,
          marginBottom: 20,
        }}
      >
        {filmPackage.concept}
      </Text>

      <TouchableOpacity
        style={{
          backgroundColor: '#FF6A00',
          padding: 12,
          borderRadius: 8,
        }}
        onPress={handleExport}
      >
        <Text
          style={{
            color: '#FFFFFF',
            fontWeight: 'bold',
            textAlign: 'center',
          }}
        >
          Export Concept as PDF
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
