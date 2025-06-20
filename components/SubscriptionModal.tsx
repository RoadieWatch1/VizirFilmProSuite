import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Star, Check } from 'lucide-react-native';

interface SubscriptionModalProps {
  onClose: () => void;
  onSubscribe: () => void;
}

export default function SubscriptionModal({ onClose, onSubscribe }: SubscriptionModalProps) {
  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <ImageBackground
          source={{ uri: 'https://images.pexels.com/photos/1983032/pexels-photo-1983032.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2' }}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <View style={styles.smokeOverlay1} />
          <View style={styles.smokeOverlay2} />
          <View style={styles.smokeOverlay3} />
          <View style={styles.smokeGlow1} />
          <View style={styles.smokeGlow2} />
          
          <LinearGradient
            colors={[
              'rgba(0,0,0,0.15)',
              'rgba(20,20,20,0.35)',
              'rgba(10,10,10,0.65)',
              'rgba(0,0,0,0.88)',
              'rgba(0,0,0,0.96)'
            ]}
            locations={[0, 0.15, 0.35, 0.7, 1]}
            style={styles.gradientOverlay}
          >
            <View style={styles.modal}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X size={24} color="#ffffff" strokeWidth={1.5} />
              </TouchableOpacity>

              <View style={styles.content}>
                <View style={styles.iconContainer}>
                  <Star size={32} color="#ffffff" strokeWidth={1.5} />
                  <View style={styles.iconGlow} />
                </View>

                <Text style={styles.title}>UNLOCK PRO FEATURES</Text>
                <View style={styles.titleUnderline} />
                <Text style={styles.subtitle}>
                  GAIN FULL ACCESS TO ALL SCRIPT LENGTHS AND PROFESSIONAL TOOLS
                </Text>

                <View style={styles.pricing}>
                  <Text style={styles.price}>$2.99</Text>
                  <Text style={styles.period}>/month</Text>
                </View>

                <View style={styles.features}>
                  <View style={styles.feature}>
                    <Check size={20} color="#ffffff" strokeWidth={1.5} />
                    <Text style={styles.featureText}>ALL SCRIPT LENGTHS (UP TO 2 HOURS)</Text>
                  </View>
                  <View style={styles.feature}>
                    <Check size={20} color="#ffffff" strokeWidth={1.5} />
                    <Text style={styles.featureText}>UNLIMITED GENERATIONS</Text>
                  </View>
                  <View style={styles.feature}>
                    <Check size={20} color="#ffffff" strokeWidth={1.5} />
                    <Text style={styles.featureText}>FULL PRE-PRODUCTION PACKAGE DOWNLOADS</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.subscribeButton} onPress={onSubscribe}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.95)', 'rgba(240,240,240,0.9)', 'rgba(255,255,255,1)']}
                    style={styles.buttonGradient}
                  >
                    <Text style={styles.subscribeText}>SUBSCRIBE NOW</Text>
                    <View style={styles.buttonGlow} />
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.laterButton} onPress={onClose}>
                  <Text style={styles.laterText}>MAYBE LATER</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.cardGlow} />
            </View>
          </LinearGradient>
        </ImageBackground>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  smokeOverlay1: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
    opacity: 0.8,
  },
  smokeOverlay2: {
    position: 'absolute',
    top: '20%',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10,10,10,0.35)',
    opacity: 0.7,
  },
  smokeOverlay3: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5,5,5,0.55)',
    opacity: 0.9,
  },
  // Smoke glow layers for brightness
  smokeGlow1: {
    position: 'absolute',
    top: '20%',
    left: '10%',
    right: '10%',
    height: '30%',
    backgroundColor: 'rgba(255,255,255,0.012)',
    opacity: 0.6,
    borderRadius: 100,
    shadowColor: 'rgba(255,255,255,0.06)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
  },
  smokeGlow2: {
    position: 'absolute',
    top: '40%',
    left: '15%',
    right: '15%',
    height: '25%',
    backgroundColor: 'rgba(220,38,38,0.008)',
    opacity: 0.4,
    borderRadius: 80,
    shadowColor: 'rgba(220,38,38,0.03)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
  },
  gradientOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modal: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    position: 'relative',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
    padding: 10,
  },
  content: {
    alignItems: 'center',
    padding: 36,
    position: 'relative',
    zIndex: 1,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
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
    fontSize: 26,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  titleUnderline: {
    width: 80,
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
    marginBottom: 36,
    lineHeight: 20,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  pricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 36,
  },
  price: {
    fontSize: 52,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  period: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.75)',
    marginLeft: 6,
  },
  features: {
    width: '100%',
    marginBottom: 36,
    gap: 18,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 14,
    flex: 1,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  subscribeButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ffffff',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 26,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
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
  subscribeText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#000000',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    position: 'relative',
    zIndex: 1,
    textShadowColor: 'rgba(255,255,255,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  laterButton: {
    paddingVertical: 14,
  },
  laterText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.5)',
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
    borderRadius: 20,
  },
});