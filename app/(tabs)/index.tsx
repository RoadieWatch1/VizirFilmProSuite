// /app/(tabs)/index.tsx
import { exportFilmPackageAsPDF } from "@/services/exportService";
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFilmStore } from '@/store/filmStore';
import PaymentGatewaySetupModal from '@/components/PaymentGatewaySetupModal';
import { Video, ChevronDown } from 'lucide-react-native';
import { router } from 'expo-router';

export default function IndexScreen() {
  const { updateFilmPackage } = useFilmStore();

  const [movieIdea, setMovieIdea] = useState('');
  const [movieGenre, setMovieGenre] = useState('');
  const [scriptLength, setScriptLength] = useState('1 min (Short)');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [showPaymentGatewayModal, setShowPaymentGatewayModal] = useState(false);

  const [showLengthDropdown, setShowLengthDropdown] = useState(false);
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);

  const isSubscribed = false;

  const scriptLengthOptions = [
    { label: '1 min (Short)', value: '1 min', isPro: false },
    { label: '5 min (Short)', value: '5 min', isPro: false },
    { label: '10 min (Short)', value: '10 min', isPro: true },
    { label: '15 min (Medium)', value: '15 min', isPro: true },
    { label: '30 min (Medium)', value: '30 min', isPro: true },
    { label: '60 min (Full Feature)', value: '60 min', isPro: true },
    { label: '120 min (Full Feature)', value: '120 min', isPro: true },
  ];

  const genreList: string[] = [
    'Action',
    'Drama',
    'Sci-Fi',
    'Romance',
    'Horror',
    'Fantasy',
    'Comedy',
    'Thriller',
    'Documentary',
    'Mystery',
    'Western',
  ];

  const handleGenerate = async () => {
    if (!movieIdea.trim() || !movieGenre.trim()) {
      setError('Please provide both a movie idea and genre.');
      return;
    }

    const selectedOption = scriptLengthOptions.find(
      (opt) => opt.label === scriptLength
    );

    if (selectedOption?.isPro && !isSubscribed) {
      router.push('/upgrade');
      return;
    }

    setLoading(true);
    setError(null);
    setLoadingMessage('Generating your film package...');

    try {
      console.log('🎬 Sending to API:', {
        movieIdea,
        movieGenre,
        scriptLength,
      });

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          movieIdea,
          movieGenre,
          scriptLength,
          provider: 'openai',
        }),
      });

      if (!res.ok) {
        const errorResponse = await res.json();
        throw new Error(errorResponse?.error || 'API error');
      }

      const data = await res.json();

      // ✅ Store every piece of data for export
      updateFilmPackage({
        script: data.script ?? '',
        logline: data.logline ?? '',
        synopsis: data.synopsis ?? '',
        themes: data.themes ?? [],
        characters: data.characters ?? [],
        genre: movieGenre,
        length: scriptLength,
        idea: movieIdea,
        // if your API returns storyboard or budget in this initial step:
        storyboard: data.storyboard ?? [],
        locations: data.locations ?? [],
        budget: data.budget ?? '',
        soundDesign: data.soundDesign ?? '',
        schedule: data.schedule ?? [],
      });

      Alert.alert(
        'Success!',
        'Film package generated. Check other tabs for your content.'
      );
    } catch (err: any) {
      console.error(err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to generate film package.';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#021e1f' }}>
      <LinearGradient
        colors={['#021e1f', '#032f30', '#042a2b']}
        style={{ ...StyleSheet.absoluteFillObject, opacity: 0.6 }}
      />

      <View
        style={{
          position: 'absolute',
          top: 100,
          left: 50,
          opacity: 0.04,
        }}
      >
        <Video size={500} color="#FF6A00" />
      </View>

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <Text
          style={{
            color: '#FF6A00',
            fontSize: 28,
            fontWeight: 'bold',
            marginBottom: 16,
          }}
        >
          Create Your Film
        </Text>

        <TextInput
          placeholder="Describe your film idea..."
          placeholderTextColor="#B2C8C9"
          value={movieIdea}
          onChangeText={setMovieIdea}
          style={{
            backgroundColor: '#032f30',
            color: '#FFFFFF',
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
          }}
        />

        <View style={{ marginBottom: 16 }}>
          <TextInput
            placeholder="Genre (e.g. Sci-Fi, Thriller)"
            placeholderTextColor="#B2C8C9"
            value={movieGenre}
            onChangeText={setMovieGenre}
            style={{
              backgroundColor: '#032f30',
              color: '#FFFFFF',
              borderRadius: 8,
              padding: 12,
            }}
          />

          <TouchableOpacity
            onPress={() => setShowGenreDropdown(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#FF6A00',
              padding: 10,
              borderRadius: 8,
              marginTop: 8,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>
              Browse Genres
            </Text>
            <ChevronDown color="#FFFFFF" size={16} />
          </TouchableOpacity>
        </View>

        {/* Genre Dropdown Modal */}
        <Modal
          visible={showGenreDropdown}
          transparent
          animationType="fade"
          onRequestClose={() => setShowGenreDropdown(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.7)',
              justifyContent: 'center',
              padding: 20,
            }}
            onPress={() => setShowGenreDropdown(false)}
          >
            <View
              style={{
                backgroundColor: '#032f30',
                borderRadius: 10,
                padding: 20,
                maxHeight: '70%',
              }}
            >
              <ScrollView>
                {genreList.map((genre) => (
                  <TouchableOpacity
                    key={genre}
                    onPress={() => {
                      setMovieGenre(genre);
                      setShowGenreDropdown(false);
                    }}
                    style={{
                      paddingVertical: 10,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 16 }}>
                      {genre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Script Length Dropdown Modal */}
        <Modal
          visible={showLengthDropdown}
          transparent
          animationType="fade"
          onRequestClose={() => setShowLengthDropdown(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.7)',
              justifyContent: 'center',
              padding: 20,
            }}
            onPress={() => setShowLengthDropdown(false)}
          >
            <View
              style={{
                backgroundColor: '#032f30',
                borderRadius: 10,
                padding: 20,
                maxHeight: '70%',
              }}
            >
              <ScrollView>
                {scriptLengthOptions.map((option) => (
                  <TouchableOpacity
                    key={option.label}
                    onPress={() => {
                      if (option.isPro && !isSubscribed) {
                        setShowLengthDropdown(false);
                        router.push('/upgrade');
                      } else {
                        setScriptLength(option.label);
                        setShowLengthDropdown(false);
                      }
                    }}
                    style={{
                      paddingVertical: 10,
                      opacity: option.isPro && !isSubscribed ? 0.5 : 1,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 16 }}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        <TouchableOpacity
          onPress={() => setShowLengthDropdown(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FF6A00',
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontWeight: 'bold',
            }}
          >
            Script Length: {scriptLength}
          </Text>
          <ChevronDown color="#FFFFFF" size={16} />
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: '#FF6A00',
            borderRadius: 8,
            padding: 16,
            shadowColor: '#FF6A00',
            shadowOpacity: 0.5,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 10,
            marginBottom: 16,
          }}
          onPress={handleGenerate}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: 'bold',
                textAlign: 'center',
              }}
            >
              Generate Film Package
            </Text>
          )}
        </TouchableOpacity>

        {error && (
          <Text
            style={{
              color: '#FF4C4C',
              textAlign: 'center',
              marginTop: 10,
            }}
          >
            {error}
          </Text>
        )}

        {loading && loadingMessage ? (
          <Text
            style={{
              color: '#B2C8C9',
              textAlign: 'center',
              marginTop: 10,
            }}
          >
            {loadingMessage}
          </Text>
        ) : null}

        <TouchableOpacity
          style={{
            backgroundColor: '#FF6A00',
            padding: 16,
            borderRadius: 8,
            alignItems: 'center',
            marginTop: 30,
          }}
          onPress={() => router.push('/upgrade')}
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: 'bold',
            }}
          >
            Unlock Pro Features
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {showPaymentGatewayModal && (
        <PaymentGatewaySetupModal
          onClose={() => setShowPaymentGatewayModal(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#021e1f',
    padding: 20,
  },
  input: {
    backgroundColor: '#032f30',
    color: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#FF6A00',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
});
