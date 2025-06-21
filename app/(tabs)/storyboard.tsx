import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Clapperboard, Camera, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import { useFilmStore } from '@/store/filmStore';
import { generateStoryboard } from '@/services/aiService';
import EmptyState from '@/components/EmptyState';

export default function StoryboardScreen() {
  const { filmPackage, updateStoryboard } = useFilmStore();
  const [selectedSceneIndex, setSelectedSceneIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const keyVisualScenes = React.useMemo(() => {
    if (!filmPackage?.script) return [];
    const matches = [...filmPackage.script.matchAll(/\[SCENE START\]([\s\S]*?)\[SCENE END\]/g)];
    return matches.map(match => match[1].trim());
  }, [filmPackage?.script]);

  const handleGenerateStoryboard = async () => {
    if (!filmPackage || !keyVisualScenes[selectedSceneIndex]) return;

    setLoading(true);
    try {
      const storyboardData = await generateStoryboard(
        keyVisualScenes[selectedSceneIndex],
        filmPackage.genre || 'Drama'
      );
      updateStoryboard(selectedSceneIndex, storyboardData);
      Alert.alert('Success!', 'Storyboard generated successfully!');
    } catch (error) {
    Alert.alert('Error', 'Something went wrong', [{ text: 'OK' }]);

    } finally {
      setLoading(false);
    }
  };

  if (!filmPackage) {
    return (
      <EmptyState
        icon={<Clapperboard size={48} color="#ffffff" />}
        title="No Storyboard Yet"
        description="Generate your film package first to create visual storyboards for key scenes."
      />
    );
  }

  if (keyVisualScenes.length === 0) {
    return (
      <EmptyState
        icon={<AlertTriangle size={48} color="#ffffff" />}
        title="No Visual Scenes Found"
        description="No scenes marked for storyboarding were found in your script. Try regenerating your film package."
      />
    );
  }

  const currentStoryboard = filmPackage.storyboard?.[selectedSceneIndex];

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://images.pexels.com/photos/1983032/pexels-photo-1983032.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.smokeOverlay1} />
        <View style={styles.smokeOverlay2} />
        <View style={styles.smokeOverlay3} />
        
        <LinearGradient
          colors={[
            'rgba(0,0,0,0.2)',
            'rgba(20,20,20,0.4)',
            'rgba(10,10,10,0.7)',
            'rgba(0,0,0,0.85)',
            'rgba(0,0,0,0.95)',
            'rgba(0,0,0,1)'
          ]}
          locations={[0, 0.15, 0.35, 0.6, 0.8, 1]}
          style={styles.overlay}
        >
          <SafeAreaView style={styles.safeArea}>
            <ScrollView 
              style={styles.scrollView} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <Clapperboard size={32} color="#ffffff" strokeWidth={1.5} />
                  <View style={styles.iconGlow} />
                </View>
                <Text style={styles.title}>STORYBOARD</Text>
                <View style={styles.titleUnderline} />
                <Text style={styles.subtitle}>VISUAL SHOT PLANNING AND COMPOSITION</Text>
              </View>

              <View style={styles.content}>
                <View style={styles.sceneSelector}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>SELECT SCENE</Text>
                    <View style={styles.sectionLine} />
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {keyVisualScenes.map((scene, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.sceneButton,
                          selectedSceneIndex === index && styles.sceneButtonActive,
                        ]}
                        onPress={() => setSelectedSceneIndex(index)}
                      >
                        <Text
                          style={[
                            styles.sceneButtonText,
                            selectedSceneIndex === index && styles.sceneButtonTextActive,
                          ]}
                        >
                          Scene {index + 1}
                        </Text>
                        {selectedSceneIndex === index && <View style={styles.activeIndicator} />}
                        <View style={styles.sceneButtonGlow} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.scenePreview}>
                  <Text style={styles.sceneText}>
                    {keyVisualScenes[selectedSceneIndex]?.substring(0, 200)}...
                  </Text>
                  <View style={styles.cardGlow} />
                </View>

                <TouchableOpacity
                  style={[styles.generateButton, loading && styles.generateButtonDisabled]}
                  onPress={handleGenerateStoryboard}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={loading ? 
                      ['rgba(40,40,40,0.6)', 'rgba(60,60,60,0.4)', 'rgba(30,30,30,0.7)'] :
                      ['rgba(255,255,255,0.95)', 'rgba(240,240,240,0.9)', 'rgba(255,255,255,1)']
                    }
                    style={styles.buttonGradient}
                  >
                    {loading ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#ffffff" />
                        <Text style={styles.loadingText}>Generating Storyboard...</Text>
                      </View>
                    ) : (
                      <View style={styles.buttonContent}>
                        <Camera size={20} color="#000000" strokeWidth={2} />
                        <Text style={styles.buttonText}>Generate Storyboard</Text>
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {currentStoryboard && (
                  <View style={styles.storyboardContainer}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>STORYBOARD SHOTS</Text>
                      <View style={styles.sectionLine} />
                    </View>
                    {currentStoryboard.shots.map((shot: any, index: number) => (
                      <View key={index} style={styles.shotCard}>
                        <View style={styles.shotHeader}>
                          <Text style={styles.shotTitle}>
                            Shot {selectedSceneIndex + 1}.{index + 1}: {shot.shot_type}
                          </Text>
                        </View>
                        
                        <View style={styles.shotContent}>
                          <View style={styles.imageContainer}>
                            {shot.image ? (
                              <Image source={{ uri: shot.image }} style={styles.shotImage} />
                            ) : (
                              <View style={styles.imagePlaceholder}>
                                <AlertTriangle size={24} color="#ffffff" />
                                <Text style={styles.placeholderText}>Image Failed</Text>
                              </View>
                            )}
                          </View>
                          
                          <View style={styles.shotDetails}>
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>Action:</Text>
                              <Text style={styles.detailText}>{shot.description}</Text>
                            </View>
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>Camera:</Text>
                              <Text style={styles.detailText}>{shot.lens_angle}, {shot.movement}</Text>
                            </View>
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>Lighting:</Text>
                              <Text style={styles.detailText}>{shot.lighting_setup}</Text>
                            </View>
                          </View>
                        </View>
                        <View style={styles.cardGlow} />
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      </ImageBackground>
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
  smokeOverlay1: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    opacity: 0.8,
  },
  smokeOverlay2: {
    position: 'absolute',
    top: '20%',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10,10,10,0.4)',
    opacity: 0.7,
  },
  smokeOverlay3: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5,5,5,0.6)',
    opacity: 0.9,
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
    paddingBottom: 130,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    position: 'relative',
  },
  iconGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 40,
    shadowColor: '#00BFA6', // teal glow
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  title: {
    fontSize: 34,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  titleUnderline: {
    width: 100,
    height: 3,
    backgroundColor: '#00BFA6', // teal
    marginBottom: 20,
    shadowColor: '#00BFA6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  sceneSelector: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginLeft: 18,
  },
  sceneButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
  },
  sceneButtonActive: {
    backgroundColor: '#FF6F3C', // orange
    borderColor: '#FFA533',
    shadowColor: '#FF6F3C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  sceneButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    position: 'relative',
    zIndex: 1,
  },
  sceneButtonTextActive: {
    color: '#ffffff',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#FFA533', // orange accent
    shadowColor: '#FFA533',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  sceneButtonGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 10,
  },
  scenePreview: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
  },
  sceneText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 22,
    position: 'relative',
    zIndex: 1,
  },
  generateButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 36,
    borderWidth: 1,
    borderColor: '#FFA533', // orange
    shadowColor: '#FFA533',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  generateButtonDisabled: {
    opacity: 0.4,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowOpacity: 0,
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#000000',
    marginLeft: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
    marginLeft: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  storyboardContainer: {
    marginTop: 10,
  },
  shotCard: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
  },
  shotHeader: {
    marginBottom: 16,
  },
  shotTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  shotContent: {
    flexDirection: 'column',
  },
  imageContainer: {
    marginBottom: 18,
  },
  shotImage: {
    width: '100%',
    aspectRatio: 2, // 2:1 cinematic ratio
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  imagePlaceholder: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  placeholderText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
    marginTop: 10,
    textTransform: 'uppercase',
  },
  shotDetails: {
    gap: 10,
    position: 'relative',
    zIndex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    width: 85,
    marginRight: 10,
    textTransform: 'uppercase',
  },
  detailText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.9)',
    flex: 1,
    lineHeight: 22,
  },
  cardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
  },
});
