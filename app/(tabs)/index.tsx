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
  Platform,
  ImageBackground,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Wand as Wand2, ChevronRight, ChevronDown, CreditCard } from 'lucide-react-native';
import { useFilmStore } from '@/store/filmStore';
import { generateFilmPackage } from '@/services/aiService';
import SubscriptionModal from '@/components/SubscriptionModal';
import EnhancedSubscriptionModal from '@/components/EnhancedSubscriptionModal';
import PaymentSetupModal from '@/components/PaymentSetupModal';
import PaymentGatewaySetupModal from '@/components/PaymentGatewaySetupModal';

const scriptLengthOptions = [
  { label: "1 min (Short)", isPro: false },
  { label: "5 min (Short)", isPro: false },
  { label: "10 min (Short)", isPro: true },
  { label: "30 min (TV Pilot)", isPro: true },
  { label: "1 hour (TV Drama)", isPro: true },
  { label: "2 hours (Feature Film)", isPro: true }
];

const genreOptions = [
  "Action",
  "Adventure", 
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Fantasy",
  "Horror",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Thriller",
  "Western",
  "Musical",
  "War",
  "Biography",
  "Family",
  "Sport",
  "Noir"
];

export default function CreateScreen() {
  const [movieIdea, setMovieIdea] = useState('');
  const [movieGenre, setMovieGenre] = useState('');
  const [scriptLength, setScriptLength] = useState('1 min (Short)');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showPaymentSetupModal, setShowPaymentSetupModal] = useState(false);
  const [showPaymentGatewayModal, setShowPaymentGatewayModal] = useState(false);
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [showLengthDropdown, setShowLengthDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isSubscribed, setFilmPackage } = useFilmStore();

  const handleGenerate = async () => {
    if (!movieIdea.trim() || !movieGenre.trim()) {
      setError('Please provide both movie idea and genre.');
      return;
    }

    const selectedOption = scriptLengthOptions.find(opt => opt.label === scriptLength);
    if (selectedOption?.isPro && !isSubscribed) {
      setShowSubscriptionModal(true);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('🎬 Starting generation with:', { movieIdea, movieGenre, scriptLength });
      
      const filmPackage = await generateFilmPackage(
        movieIdea,
        movieGenre,
        scriptLength,
        setLoadingMessage
      );
      
      setFilmPackage(filmPackage);
      Alert.alert('Success!', 'Your film package has been generated. Check the other tabs to explore your content.');
    } catch (error) {
      console.error('Generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate film package';
      setError(errorMessage);
      Alert.alert('Generation Error', errorMessage);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const GenreDropdown = () => (
    <Modal
      visible={showGenreDropdown}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowGenreDropdown(false)}
    >
      <TouchableOpacity 
        style={styles.dropdownOverlay} 
        activeOpacity={1} 
        onPress={() => setShowGenreDropdown(false)}
      >
        <View style={styles.dropdownContainer}>
          <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator={false}>
            {genreOptions.map((genre) => (
              <TouchableOpacity
                key={genre}
                style={[
                  styles.dropdownItem,
                  movieGenre === genre && styles.dropdownItemSelected
                ]}
                onPress={() => {
                  setMovieGenre(genre);
                  setShowGenreDropdown(false);
                  if (error) setError(null);
                }}
              >
                <Text style={[
                  styles.dropdownItemText,
                  movieGenre === genre && styles.dropdownItemTextSelected
                ]}>
                  {genre}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const LengthDropdown = () => (
    <Modal
      visible={showLengthDropdown}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowLengthDropdown(false)}
    >
      <TouchableOpacity 
        style={styles.dropdownOverlay} 
        activeOpacity={1} 
        onPress={() => setShowLengthDropdown(false)}
      >
        <View style={styles.dropdownContainer}>
          <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator={false}>
            {scriptLengthOptions.map((option) => (
              <TouchableOpacity
                key={option.label}
                style={[
                  styles.dropdownItem,
                  scriptLength === option.label && styles.dropdownItemSelected,
                  option.isPro && !isSubscribed && styles.dropdownItemDisabled,
                ]}
                onPress={() => {
                  if (option.isPro && !isSubscribed) {
                    setShowLengthDropdown(false);
                    setShowSubscriptionModal(true);
                  } else {
                    setScriptLength(option.label);
                    setShowLengthDropdown(false);
                  }
                }}
              >
                <Text style={[
                  styles.dropdownItemText,
                  scriptLength === option.label && styles.dropdownItemTextSelected,
                  option.isPro && !isSubscribed && styles.dropdownItemTextDisabled,
                ]}>
                  {option.label}
                  {option.isPro && !isSubscribed && ' ⭐'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://images.pexels.com/photos/1983032/pexels-photo-1983032.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Vintage film camera silhouette overlay */}
        <View style={styles.cameraOverlay}>
          <View style={styles.vintageFilmCamera}>
            {/* Main camera body - rectangular */}
            <View style={styles.cameraMainBody} />
            
            {/* Top film reels */}
            <View style={styles.topFilmReel1} />
            <View style={styles.topFilmReel2} />
            
            {/* Camera lens assembly */}
            <View style={styles.lensAssembly} />
            <View style={styles.mainLens} />
            
            {/* Viewfinder */}
            <View style={styles.viewfinder} />
            
            {/* Film magazine */}
            <View style={styles.filmMagazine} />
            
            {/* Tripod mount and legs */}
            <View style={styles.tripodMount} />
            <View style={styles.tripodLeg1} />
            <View style={styles.tripodLeg2} />
            <View style={styles.tripodLeg3} />
            
            {/* Film strip details */}
            <View style={styles.filmStripTop} />
            <View style={styles.filmStripBottom} />
            
            {/* Camera handle */}
            <View style={styles.cameraHandle} />
          </View>
        </View>
        
        {/* Enhanced atmospheric smoke layers with glow */}
        <View style={styles.smokeLayer1} />
        <View style={styles.smokeLayer2} />
        <View style={styles.smokeLayer3} />
        <View style={styles.smokeLayer4} />
        <View style={styles.smokeGlow1} />
        <View style={styles.smokeGlow2} />
        <View style={styles.smokeGlow3} />
        
        <LinearGradient
          colors={[
            'rgba(0,0,0,0.05)',
            'rgba(15,15,15,0.25)',
            'rgba(8,8,8,0.55)',
            'rgba(0,0,0,0.8)',
            'rgba(0,0,0,0.92)',
            'rgba(0,0,0,0.98)'
          ]}
          locations={[0, 0.1, 0.25, 0.5, 0.75, 1]}
          style={styles.overlay}
        >
          <SafeAreaView style={styles.safeArea}>
            <ScrollView 
              style={styles.scrollView} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.header}>
                <Text style={styles.mainTitle}>FILM PRE-PRODUCTION SUITE</Text>
                <View style={styles.titleUnderline} />
                <Text style={styles.subtitle}>
                  YOUR AI-POWERED DEVELOPMENT PARTNER:{'\n'}
                  FROM CONCEPT TO STORYBOARD
                </Text>
              </View>

              <View style={styles.formContainer}>
                {error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Movie Concept - Full Width */}
                <View style={styles.conceptContainer}>
                  <View style={styles.inputLabel}>
                    <Text style={styles.labelText}>MOVIE CONCEPT</Text>
                    <View style={styles.labelLine} />
                  </View>
                  <TextInput
                    style={styles.conceptInput}
                    placeholder="Enter movie idea or title..."
                    placeholderTextColor="rgba(156,163,175,0.4)"
                    value={movieIdea}
                    onChangeText={(text) => {
                      setMovieIdea(text);
                      if (error) setError(null);
                    }}
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                  />
                  <View style={styles.inputGlow} />
                </View>

                {/* Genre - Half Width */}
                <View style={styles.genreContainer}>
                  <View style={styles.inputLabel}>
                    <Text style={styles.labelText}>GENRE</Text>
                    <View style={styles.labelLine} />
                  </View>
                  <TouchableOpacity 
                    style={styles.genreInputWrapper}
                    onPress={() => setShowGenreDropdown(true)}
                  >
                    <View style={styles.genreInput}>
                      <Text style={[
                        styles.genreInputText,
                        !movieGenre && styles.genreInputPlaceholder
                      ]}>
                        {movieGenre || 'Select Genre'}
                      </Text>
                      <ChevronDown size={20} color="rgba(220,38,38,0.6)" style={styles.chevron} />
                      <View style={styles.inputGlow} />
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={styles.lengthSection}>
                  <View style={styles.inputLabel}>
                    <Text style={styles.labelText}>SCRIPT LENGTH</Text>
                    <View style={styles.labelLine} />
                  </View>
                  <TouchableOpacity 
                    style={styles.lengthDropdownButton}
                    onPress={() => setShowLengthDropdown(true)}
                  >
                    <Text style={styles.lengthDropdownText}>
                      {scriptLength}
                    </Text>
                    <ChevronDown size={20} color="rgba(220,38,38,0.6)" />
                    <View style={styles.inputGlow} />
                  </TouchableOpacity>
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.unlockButton, !isSubscribed && styles.unlockButtonActive]}
                    onPress={() => setShowPaymentGatewayModal(true)}
                  >
                    <LinearGradient
                      colors={['rgba(20,20,20,0.95)', 'rgba(40,40,40,0.9)', 'rgba(15,15,15,0.98)']}
                      style={styles.buttonGradient}
                    >
                      <CreditCard size={16} color="#ffffff" strokeWidth={1.5} />
                      <Text style={styles.unlockButtonText}>PAYMENT SETUP</Text>
                      <View style={styles.buttonGlow} />
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.generateButton, loading && styles.generateButtonDisabled]}
                    onPress={handleGenerate}
                    disabled={loading}
                  >
                    <LinearGradient
                      colors={loading ? 
                        ['rgba(30,30,30,0.7)', 'rgba(50,50,50,0.5)', 'rgba(20,20,20,0.8)'] :
                        ['rgba(220,38,38,0.98)', 'rgba(185,28,28,0.95)', 'rgba(220,38,38,1)']
                      }
                      style={styles.buttonGradient}
                    >
                      {loading ? (
                        <View style={styles.loadingContainer}>
                          <ActivityIndicator size="small" color="#ffffff" />
                          <Text style={styles.loadingText}>{loadingMessage || 'Generating...'}</Text>
                        </View>
                      ) : (
                        <>
                          <Text style={styles.generateButtonText}>GENERATE FULL FILM</Text>
                          <View style={styles.buttonGlow} />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      </ImageBackground>

      <GenreDropdown />
      <LengthDropdown />

      {showSubscriptionModal && (
        <EnhancedSubscriptionModal
          onClose={() => setShowSubscriptionModal(false)}
          onSubscribe={() => {
            useFilmStore.getState().setSubscribed(true);
            setShowSubscriptionModal(false);
          }}
        />
      )}

      {showPaymentSetupModal && (
        <PaymentSetupModal
          onClose={() => setShowPaymentSetupModal(false)}
        />
      )}

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
    backgroundColor: '#000000',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  cameraOverlay: {
    position: 'absolute',
    top: '8%',
    right: '-10%',
    width: 500,
    height: 350,
    opacity: 0.12,
    transform: [{ rotate: '20deg' }],
  },
  vintageFilmCamera: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  // Main camera body - large rectangular body
  cameraMainBody: {
    position: 'absolute',
    top: '35%',
    left: '20%',
    width: 180,
    height: 100,
    backgroundColor: 'rgba(220,38,38,0.4)',
    borderRadius: 6,
  },
  // Top film reels - classic dual reel setup
  topFilmReel1: {
    position: 'absolute',
    top: '10%',
    left: '15%',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(220,38,38,0.3)',
    borderWidth: 4,
    borderColor: 'rgba(220,38,38,0.4)',
  },
  topFilmReel2: {
    position: 'absolute',
    top: '10%',
    right: '15%',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(220,38,38,0.3)',
    borderWidth: 4,
    borderColor: 'rgba(220,38,38,0.4)',
  },
  // Lens assembly - protruding lens mount
  lensAssembly: {
    position: 'absolute',
    top: '40%',
    left: '5%',
    width: 60,
    height: 60,
    backgroundColor: 'rgba(220,38,38,0.35)',
    borderRadius: 30,
  },
  mainLens: {
    position: 'absolute',
    top: '45%',
    left: '8%',
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: 'rgba(220,38,38,0.5)',
    borderWidth: 3,
    borderColor: 'rgba(220,38,38,0.6)',
  },
  // Viewfinder on top
  viewfinder: {
    position: 'absolute',
    top: '25%',
    left: '35%',
    width: 40,
    height: 25,
    backgroundColor: 'rgba(220,38,38,0.3)',
    borderRadius: 4,
  },
  // Film magazine on side
  filmMagazine: {
    position: 'absolute',
    top: '30%',
    right: '10%',
    width: 50,
    height: 80,
    backgroundColor: 'rgba(220,38,38,0.35)',
    borderRadius: 8,
  },
  // Tripod mount
  tripodMount: {
    position: 'absolute',
    bottom: '35%',
    left: '40%',
    width: 20,
    height: 15,
    backgroundColor: 'rgba(220,38,38,0.4)',
    borderRadius: 3,
  },
  // Tripod legs - three legs extending down
  tripodLeg1: {
    position: 'absolute',
    bottom: '5%',
    left: '35%',
    width: 4,
    height: 120,
    backgroundColor: 'rgba(220,38,38,0.4)',
    transform: [{ rotate: '-20deg' }],
  },
  tripodLeg2: {
    position: 'absolute',
    bottom: '5%',
    left: '45%',
    width: 4,
    height: 120,
    backgroundColor: 'rgba(220,38,38,0.4)',
    transform: [{ rotate: '20deg' }],
  },
  tripodLeg3: {
    position: 'absolute',
    bottom: '5%',
    left: '55%',
    width: 4,
    height: 120,
    backgroundColor: 'rgba(220,38,38,0.4)',
    transform: [{ rotate: '0deg' }],
  },
  // Film strips connecting reels
  filmStripTop: {
    position: 'absolute',
    top: '18%',
    left: '25%',
    right: '25%',
    height: 6,
    backgroundColor: 'rgba(220,38,38,0.25)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(220,38,38,0.3)',
  },
  filmStripBottom: {
    position: 'absolute',
    top: '22%',
    left: '25%',
    right: '25%',
    height: 6,
    backgroundColor: 'rgba(220,38,38,0.25)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(220,38,38,0.3)',
  },
  // Camera handle
  cameraHandle: {
    position: 'absolute',
    top: '20%',
    right: '5%',
    width: 15,
    height: 60,
    backgroundColor: 'rgba(220,38,38,0.3)',
    borderRadius: 8,
  },
  smokeLayer1: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.15)',
    opacity: 0.9,
  },
  smokeLayer2: {
    position: 'absolute',
    top: '15%',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(8,8,8,0.25)',
    opacity: 0.8,
  },
  smokeLayer3: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5,5,5,0.4)',
    opacity: 0.9,
  },
  smokeLayer4: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    opacity: 0.95,
  },
  // New smoke glow layers for brightness
  smokeGlow1: {
    position: 'absolute',
    top: '10%',
    left: '10%',
    right: '10%',
    height: '20%',
    backgroundColor: 'rgba(255,255,255,0.02)',
    opacity: 0.6,
    borderRadius: 100,
    shadowColor: 'rgba(255,255,255,0.1)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
  },
  smokeGlow2: {
    position: 'absolute',
    top: '25%',
    left: '20%',
    right: '20%',
    height: '15%',
    backgroundColor: 'rgba(220,38,38,0.015)',
    opacity: 0.4,
    borderRadius: 80,
    shadowColor: 'rgba(220,38,38,0.05)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
  },
  smokeGlow3: {
    position: 'absolute',
    top: '40%',
    left: '15%',
    right: '15%',
    height: '25%',
    backgroundColor: 'rgba(255,255,255,0.008)',
    opacity: 0.5,
    borderRadius: 120,
    shadowColor: 'rgba(255,255,255,0.03)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
  },
  overlay: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 160, // Adjusted for new tab bar height
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 50,
  },
  mainTitle: {
    fontSize: 40,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 4,
    lineHeight: 48,
    marginBottom: 20,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 15,
  },
  titleUnderline: {
    width: 140,
    height: 4,
    backgroundColor: '#dc2626',
    marginBottom: 24,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(209,213,219,0.9)',
    textAlign: 'center',
    letterSpacing: 1.4,
    lineHeight: 24,
    textTransform: 'uppercase',
  },
  formContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  errorContainer: {
    backgroundColor: 'rgba(220,38,38,0.08)',
    borderRadius: 14,
    padding: 18,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.15)',
  },
  errorText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  conceptContainer: {
    marginBottom: 24,
    position: 'relative',
  },
  inputLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  labelText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    marginRight: 14,
  },
  labelLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(220,38,38,0.15)',
  },
  conceptInput: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    padding: 18,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#dc2626',
    minHeight: 70,
    textAlignVertical: 'top',
    position: 'relative',
    zIndex: 1,
  },
  inputGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(220,38,38,0.01)',
    borderRadius: 8,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  genreContainer: {
    width: '50%',
    marginBottom: 24,
  },
  genreInputWrapper: {
    position: 'relative',
  },
  genreInput: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    padding: 18,
    paddingRight: 50,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#dc2626',
    height: 60,
    position: 'relative',
    zIndex: 1,
    justifyContent: 'center',
  },
  genreInputText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
  },
  genreInputPlaceholder: {
    color: 'rgba(156,163,175,0.4)',
  },
  chevron: {
    position: 'absolute',
    right: 18,
    top: '50%',
    marginTop: -10,
    zIndex: 2,
  },
  lengthSection: {
    marginBottom: 34,
  },
  lengthDropdownButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    padding: 18,
    paddingRight: 50,
    borderWidth: 1,
    borderColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    height: 60,
  },
  lengthDropdownText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
    flex: 1,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  dropdownContainer: {
    backgroundColor: 'rgba(0,0,0,0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.3)',
    maxHeight: 300,
    width: '100%',
    maxWidth: 300,
  },
  dropdownScroll: {
    maxHeight: 300,
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(220,38,38,0.1)',
  },
  dropdownItemSelected: {
    backgroundColor: 'rgba(220,38,38,0.2)',
  },
  dropdownItemDisabled: {
    opacity: 0.5,
  },
  dropdownItemText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
  },
  dropdownItemTextSelected: {
    fontFamily: 'Inter-Bold',
    color: '#dc2626',
  },
  dropdownItemTextDisabled: {
    color: 'rgba(156,163,175,0.5)',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 18,
  },
  unlockButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.15)',
  },
  unlockButtonActive: {
    borderColor: 'rgba(220,38,38,0.25)',
  },
  generateButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dc2626',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  generateButtonDisabled: {
    opacity: 0.3,
    borderColor: 'rgba(220,38,38,0.15)',
    shadowOpacity: 0,
  },
  buttonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flexDirection: 'row',
  },
  buttonGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(220,38,38,0.03)',
    opacity: 0.7,
  },
  unlockButtonText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    position: 'relative',
    zIndex: 1,
    marginLeft: 8,
  },
  generateButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    position: 'relative',
    zIndex: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
  },
  loadingText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
    marginLeft: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});