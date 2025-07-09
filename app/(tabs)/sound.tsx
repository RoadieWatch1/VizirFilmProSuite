// /app/(tabs)/sound.tsx
import { exportFilmPackageAsPDF } from "@/services/exportService";
import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFilmStore } from '@/store/filmStore';
import { generateSoundDesign } from '@/services/aiService';
import { Volume2 } from 'lucide-react-native';
import { SoundPlan } from '@/store/filmStore';

export default function SoundScreen() {
  const { filmPackage, updateFilmPackage } = useFilmStore();

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("");

  const handleGenerateSoundDesign = async () => {
    try {
      setLoading(true);
      setLoadingMessage("Generating sound design...");

      const result = await generateSoundDesign(
        filmPackage?.script || "",
        filmPackage?.genre || "",
        setLoadingMessage
      );

      if (result) {
        updateFilmPackage({
          soundDesign:
            typeof result === "string"
              ? result
              : { ...result }
        });
      } else {
        Alert.alert("Error", "Failed to generate sound design.");
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", e?.message || "An error occurred.");
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

  const soundPlan = filmPackage.soundDesign;

  if (!soundPlan) {
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
        <Volume2 size={48} color="#FF6A00" />
        <Text
          style={{
            color: '#B2C8C9',
            fontSize: 18,
            marginVertical: 10,
            textAlign: 'center',
          }}
        >
          No Sound Design Yet
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: '#FF6A00',
            padding: 12,
            borderRadius: 8,
            marginTop: 10,
          }}
          onPress={handleGenerateSoundDesign}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>
              Generate Sound Design
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

  const isSoundPlan = (val: unknown): val is SoundPlan =>
    !!val &&
    typeof val === 'object' &&
    'overallStyle' in val;

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
        Sound Design Plan
      </Text>

      {!isSoundPlan(soundPlan) && (
        <Text
          style={{
            color: '#B2C8C9',
            fontSize: 16,
            lineHeight: 22,
          }}
        >
          {soundPlan}
        </Text>
      )}

      {isSoundPlan(soundPlan) && (
        <>
          {soundPlan.overallStyle && (
            <>
              <Text
                style={{
                  color: '#FF6A00',
                  fontSize: 16,
                  fontWeight: 'bold',
                  marginBottom: 4,
                }}
              >
                Overall Style
              </Text>
              <Text
                style={{
                  color: '#B2C8C9',
                  fontSize: 14,
                  marginBottom: 10,
                  lineHeight: 20,
                }}
              >
                {soundPlan.overallStyle}
              </Text>
            </>
          )}

          {soundPlan.musicGenres?.length > 0 && (
            <>
              <Text
                style={{
                  color: '#FF6A00',
                  fontSize: 16,
                  fontWeight: 'bold',
                  marginBottom: 4,
                }}
              >
                Music Genres
              </Text>
              {soundPlan.musicGenres.map((genre, index) => (
                <Text
                  key={index}
                  style={{
                    color: '#B2C8C9',
                    fontSize: 14,
                    marginBottom: 2,
                  }}
                >
                  • {genre}
                </Text>
              ))}
              <View style={{ marginBottom: 10 }} />
            </>
          )}

          {soundPlan.keyEffects?.length > 0 && (
            <>
              <Text
                style={{
                  color: '#FF6A00',
                  fontSize: 16,
                  fontWeight: 'bold',
                  marginBottom: 4,
                }}
              >
                Key Sound Effects
              </Text>
              {soundPlan.keyEffects.map((effect, index) => (
                <Text
                  key={index}
                  style={{
                    color: '#B2C8C9',
                    fontSize: 14,
                    marginBottom: 2,
                  }}
                >
                  • {effect}
                </Text>
              ))}
              <View style={{ marginBottom: 10 }} />
            </>
          )}

          {soundPlan.notableMoments?.length > 0 && (
            <>
              <Text
                style={{
                  color: '#FF6A00',
                  fontSize: 16,
                  fontWeight: 'bold',
                  marginBottom: 4,
                }}
              >
                Notable Moments
              </Text>
              {soundPlan.notableMoments.map((moment, index) => (
                <View key={index} style={{ marginBottom: 12 }}>
                  <Text
                    style={{
                      color: '#FF6A00',
                      fontSize: 14,
                      fontWeight: 'bold',
                    }}
                  >
                    Scene:
                  </Text>
                  <Text
                    style={{
                      color: '#B2C8C9',
                      fontSize: 14,
                      marginBottom: 4,
                    }}
                  >
                    {moment.scene}
                  </Text>

                  <Text
                    style={{
                      color: '#FF6A00',
                      fontSize: 14,
                      fontWeight: 'bold',
                    }}
                  >
                    Sound Design:
                  </Text>
                  <Text
                    style={{
                      color: '#B2C8C9',
                      fontSize: 14,
                    }}
                  >
                    {moment.soundDesign}
                  </Text>
                </View>
              ))}
            </>
          )}
        </>
      )}

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
          Export Sound Design as PDF
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
