import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Lightbulb, Target, BookOpen, Film } from 'lucide-react-native';
import { useFilmStore } from '@/store/filmStore';
import EmptyState from '@/components/EmptyState';

export default function ConceptScreen() {
  const { filmPackage } = useFilmStore();

  if (!filmPackage) {
    return (
      <EmptyState
        icon={<Lightbulb size={48} color="#ffffff" />}
        title="No Concept Yet"
        description="Generate your film package first to see the concept, logline, synopsis, and themes."
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
                  <Film size={32} color="#ffffff" strokeWidth={1.5} />
                  <View style={styles.iconGlow} />
                </View>
                <Text style={styles.title}>CONCEPT & THEME</Text>
                <View style={styles.titleUnderline} />
                <Text style={styles.subtitle}>CORE STORY ELEMENTS AND THEMATIC FOUNDATION</Text>
              </View>

              <View style={styles.content}>
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Target size={20} color="#ffffff" strokeWidth={1.5} />
                    <Text style={styles.sectionTitle}>LOGLINE</Text>
                    <View style={styles.sectionLine} />
                  </View>
                  <View style={styles.card}>
                    <Text style={styles.logline}>{filmPackage.logline}</Text>
                    <View style={styles.cardGlow} />
                  </View>
                </View>

                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <BookOpen size={20} color="#ffffff" strokeWidth={1.5} />
                    <Text style={styles.sectionTitle}>SYNOPSIS</Text>
                    <View style={styles.sectionLine} />
                  </View>
                  <View style={styles.card}>
                    <Text style={styles.bodyText}>{filmPackage.synopsis}</Text>
                    <View style={styles.cardGlow} />
                  </View>
                </View>

                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Lightbulb size={20} color="#ffffff" strokeWidth={1.5} />
                    <Text style={styles.sectionTitle}>THEMES</Text>
                    <View style={styles.sectionLine} />
                  </View>
                  <View style={styles.card}>
                    <Text style={styles.bodyText}>{filmPackage.themes}</Text>
                    <View style={styles.cardGlow} />
                  </View>
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
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
    alignItems: 'center',
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
  section: {
    marginBottom: 36,
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
    marginLeft: 14,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginLeft: 18,
  },
  card: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 16,
    padding: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
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
  logline: {
    fontSize: 19,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
    fontStyle: 'italic',
    lineHeight: 30,
    position: 'relative',
    zIndex: 1,
  },
  bodyText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 26,
    position: 'relative',
    zIndex: 1,
  },
});