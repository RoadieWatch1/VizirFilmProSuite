// /app/(tabs)/characters.tsx
import { exportFilmPackageAsPDF } from "@/services/exportService";
import React, { useState } from 'react';
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFilmStore } from '@/store/filmStore';
import { User } from 'lucide-react-native';
import { Character } from '@/store/filmStore';

export default function CharactersScreen() {
  const { filmPackage, updateFilmPackage } = useFilmStore();

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const handleGenerateCharacters = async () => {
    const idea = filmPackage?.script || '';
    const genre = filmPackage?.genre || 'Drama';

    if (!idea) {
      Alert.alert(
        'No Script',
        'Please generate your film first before generating characters.'
      );
      return;
    }

    try {
      setLoading(true);
      setLoadingMessage('Generating characters...');

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          movieIdea: idea,
          movieGenre: genre,
          scriptLength: "short",
          step: "characters",
          provider: "openai",
        }),
      });

      if (!res.ok) {
        const errorResponse = await res.json().catch(() => ({}));
        const errorMsg = errorResponse?.error || "API error";
        throw new Error(errorMsg);
      }

      const data = await res.json();

      let parsedCharacters: Character[] | undefined = undefined;

      if (data?.characters && Array.isArray(data.characters)) {
        parsedCharacters = data.characters as Character[];
      }

      if (parsedCharacters?.length) {
        updateFilmPackage({ characters: parsedCharacters });
        Alert.alert('Characters generated successfully!');
      } else {
        Alert.alert('No characters found.', 'Try regenerating.');
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error?.message || 'Failed to generate characters.');
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

  if (!filmPackage?.characters || filmPackage.characters.length === 0) {
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
        <User size={48} color="#FF6A00" />
        <Text
          style={{
            color: '#B2C8C9',
            fontSize: 18,
            marginVertical: 10,
            textAlign: 'center',
          }}
        >
          No Characters Yet
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: '#FF6A00',
            padding: 12,
            borderRadius: 8,
            marginTop: 10,
          }}
          onPress={handleGenerateCharacters}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>
              Generate Characters
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
        Characters
      </Text>
      {filmPackage.characters.map((char, index) => (
        <View key={index} style={{ marginBottom: 20 }}>
          <Text
            style={{
              color: '#FF6A00',
              fontWeight: 'bold',
              fontSize: 16,
            }}
          >
            {char.name}
          </Text>
          <Text
            style={{
              color: '#B2C8C9',
              marginTop: 4,
              fontSize: 14,
              lineHeight: 20,
            }}
          >
            {char.description}
          </Text>
        </View>
      ))}

      <TouchableOpacity
        style={{
          backgroundColor: '#FF6A00',
          padding: 12,
          borderRadius: 8,
          marginTop: 20,
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
          Export Characters as PDF
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
