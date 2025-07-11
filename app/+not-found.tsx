
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Chrome as Home, TriangleAlert as AlertTriangle } from 'lucide-react-native';

export default function NotFoundScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#003840', '#FF6A00']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <AlertTriangle size={48} color="#f59e0b" />
          </View>

          <Text style={styles.title}>Page Not Found</Text>
          <Text style={styles.description}>
            The screen you're looking for doesn't exist.
          </Text>

          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => router.replace('/')}
          >
            <LinearGradient
              colors={['#FF6A00', '#003840']}
              style={styles.buttonGradient}
            >
              <Home size={20} color="#ffffff" />
              <Text style={styles.buttonText}>Go Home</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  homeButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginLeft: 8,
  },
});
