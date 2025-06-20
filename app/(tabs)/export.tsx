import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Share,
  ImageBackground,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Download, FileText, Share as ShareIcon } from 'lucide-react-native';
import { useFilmStore } from '@/store/filmStore';
import { exportFilmPackage } from '@/services/exportService';
import EmptyState from '@/components/EmptyState';

export default function ExportScreen() {
  const { filmPackage } = useFilmStore();

  const handleExport = async () => {
    if (!filmPackage) return;

    try {
      await exportFilmPackage(filmPackage);
      Alert.alert('Success!', 'Film package exported successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to export film package');
    }
  };

  const handleShare = async () => {
    if (!filmPackage) return;

    try {
      const content = await exportFilmPackage(filmPackage, true);

      if (!content) {
        Alert.alert('Error', 'No content to share or copy.');
        return;
      }

      if (Platform.OS === 'web') {
        try {
          await Clipboard.setStringAsync(content);
          Alert.alert('Copied!', 'Film package copied to clipboard');
        } catch {
          Alert.alert('Error', 'Clipboard not available');
        }
      } else {
        await Share.share({
          message: content,
          title: 'Film Pre-Production Package',
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to share film package');
    }
  };

  if (!filmPackage) {
    return (
      <EmptyState
        icon={<Download size={48} color="#ffffff" />}
        title="Nothing to Export"
        description="Generate your film package first to export and share your complete pre-production materials."
      />
    );
  }

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
                  <Download size={32} color="#ffffff" strokeWidth={1.5} />
                  <View style={styles.iconGlow} />
                </View>
                <Text style={styles.title}>EXPORT & SHARE</Text>
                <View style={styles.titleUnderline} />
                <Text style={styles.subtitle}>DOWNLOAD OR SHARE YOUR COMPLETE FILM PACKAGE</Text>
              </View>

              <View style={styles.content}>
                <View style={styles.packageInfo}>
                  <Text style={styles.packageTitle}>FILM PACKAGE READY</Text>
                  <Text style={styles.packageDescription}>
                    Your complete pre-production package includes concept, characters, sound design, 
                    outline, script, and storyboards.
                  </Text>
                  <View style={styles.cardGlow} />
                </View>

                <View style={styles.exportOptions}>
                  <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
                    <LinearGradient
                      colors={['rgba(40,40,40,0.9)', 'rgba(60,60,60,0.8)', 'rgba(30,30,30,0.95)']}
                      style={styles.buttonGradient}
                    >
                      <View style={styles.buttonContent}>
                        <FileText size={20} color="#ffffff" strokeWidth={1.5} />
                        <Text style={styles.buttonText}>DOWNLOAD PACKAGE</Text>
                      </View>
                      <View style={styles.buttonGlow} />
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.exportButton} onPress={handleShare}>
                    <LinearGradient
                      colors={['rgba(255,255,255,0.95)', 'rgba(240,240,240,0.9)', 'rgba(255,255,255,1)']}
                      style={styles.buttonGradient}
                    >
                      <View style={styles.buttonContent}>
                        <ShareIcon size={20} color="#000000" strokeWidth={2} />
                        <Text style={[styles.buttonText, styles.primaryButtonText]}>SHARE PACKAGE</Text>
                      </View>
                      <View style={styles.buttonGlow} />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                <View style={styles.packageContents}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.contentsTitle}>PACKAGE CONTENTS</Text>
                    <View style={styles.sectionLine} />
                  </View>
                  <View style={styles.contentsList}>
                    <View style={styles.contentItem}>
                      <Text style={styles.contentBullet}>•</Text>
                      <Text style={styles.contentText}>CONCEPT & LOGLINE</Text>
                    </View>
                    <View style={styles.contentItem}>
                      <Text style={styles.contentBullet}>•</Text>
                      <Text style={styles.contentText}>CHARACTER BREAKDOWNS</Text>
                    </View>
                    <View style={styles.contentItem}>
                      <Text style={styles.contentBullet}>•</Text>
                      <Text style={styles.contentText}>SOUND & MUSIC DESIGN</Text>
                    </View>
                    <View style={styles.contentItem}>
                      <Text style={styles.contentBullet}>•</Text>
                      <Text style={styles.contentText}>STRUCTURAL OUTLINE</Text>
                    </View>
                    <View style={styles.contentItem}>
                      <Text style={styles.contentBullet}>•</Text>
                      <Text style={styles.contentText}>COMPLETE SCREENPLAY</Text>
                    </View>
                    {filmPackage.storyboard && Object.keys(filmPackage.storyboard).length > 0 && (
                      <View style={styles.contentItem}>
                        <Text style={styles.contentBullet}>•</Text>
                        <Text style={styles.contentText}>VISUAL STORYBOARDS</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.cardGlow} />
                </View>
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
    paddingBottom: 130, // Extra padding to ensure content clears tab bar
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
    shadowColor: '#ffffff',
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
    backgroundColor: '#ffffff',
    marginBottom: 20,
    shadowColor: '#ffffff',
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
  packageInfo: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 36,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
  },
  packageTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  packageDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 26,
    position: 'relative',
    zIndex: 1,
  },
  exportOptions: {
    gap: 18,
    marginBottom: 36,
  },
  exportButton: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 26,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginLeft: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  primaryButtonText: {
    color: '#000000',
  },
  buttonGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.05)',
    opacity: 0.6,
  },
  packageContents: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  contentsTitle: {
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
  contentsList: {
    gap: 12,
    position: 'relative',
    zIndex: 1,
  },
  contentItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentBullet: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginRight: 14,
  },
  contentText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
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