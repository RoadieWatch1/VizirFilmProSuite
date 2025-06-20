import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ImageBackground,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, CreditCard, ExternalLink, CircleAlert as AlertCircle } from 'lucide-react-native';

interface PaymentSetupModalProps {
  onClose: () => void;
}

export default function PaymentSetupModal({ onClose }: PaymentSetupModalProps) {
  const openRevenueCatDocs = () => {
    Linking.openURL('https://www.revenuecat.com/docs/getting-started/installation/expo');
  };

  const openRevenueCatDashboard = () => {
    Linking.openURL('https://app.revenuecat.com/');
  };

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
                  <CreditCard size={32} color="#ffffff" strokeWidth={1.5} />
                  <View style={styles.iconGlow} />
                </View>

                <Text style={styles.title}>PAYMENT SETUP</Text>
                <View style={styles.titleUnderline} />
                <Text style={styles.subtitle}>
                  INTEGRATE REVENUECAT FOR PROFESSIONAL SUBSCRIPTIONS
                </Text>

                <View style={styles.warningBox}>
                  <AlertCircle size={20} color="#f59e0b" strokeWidth={1.5} />
                  <Text style={styles.warningText}>
                    This app requires native code for payments. You'll need to export and run locally.
                  </Text>
                </View>

                <View style={styles.steps}>
                  <View style={styles.step}>
                    <Text style={styles.stepNumber}>1</Text>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepTitle}>CREATE REVENUECAT ACCOUNT</Text>
                      <Text style={styles.stepDescription}>
                        Sign up for RevenueCat and create your app project
                      </Text>
                      <TouchableOpacity style={styles.linkButton} onPress={openRevenueCatDashboard}>
                        <Text style={styles.linkText}>Open RevenueCat Dashboard</Text>
                        <ExternalLink size={16} color="#dc2626" strokeWidth={1.5} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.step}>
                    <Text style={styles.stepNumber}>2</Text>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepTitle}>EXPORT PROJECT</Text>
                      <Text style={styles.stepDescription}>
                        Export this Expo project to add native RevenueCat SDK
                      </Text>
                      <View style={styles.codeBlock}>
                        <Text style={styles.codeText}>npx expo export</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.step}>
                    <Text style={styles.stepNumber}>3</Text>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepTitle}>INSTALL REVENUECAT</Text>
                      <Text style={styles.stepDescription}>
                        Follow the official Expo integration guide
                      </Text>
                      <TouchableOpacity style={styles.linkButton} onPress={openRevenueCatDocs}>
                        <Text style={styles.linkText}>View Integration Guide</Text>
                        <ExternalLink size={16} color="#dc2626" strokeWidth={1.5} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.step}>
                    <Text style={styles.stepNumber}>4</Text>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepTitle}>CONFIGURE PRODUCTS</Text>
                      <Text style={styles.stepDescription}>
                        Set up your subscription products in App Store Connect and Google Play Console
                      </Text>
                      <View style={styles.productList}>
                        <Text style={styles.productItem}>• Pro Monthly: $2.99/month</Text>
                        <Text style={styles.productItem}>• Pro Yearly: $29.99/year</Text>
                        <Text style={styles.productItem}>• Lifetime Pro: $99.99</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <TouchableOpacity style={styles.continueButton} onPress={onClose}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.95)', 'rgba(240,240,240,0.9)', 'rgba(255,255,255,1)']}
                    style={styles.buttonGradient}
                  >
                    <Text style={styles.continueText}>GOT IT</Text>
                    <View style={styles.buttonGlow} />
                  </LinearGradient>
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
    maxWidth: 480,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    position: 'relative',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
    maxHeight: '90%',
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
    marginBottom: 24,
    lineHeight: 20,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
    width: '100%',
  },
  warningText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 12,
    flex: 1,
    lineHeight: 18,
  },
  steps: {
    width: '100%',
    marginBottom: 32,
  },
  step: {
    flexDirection: 'row',
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(220,38,38,0.2)',
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    lineHeight: 32,
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.3)',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  stepDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
    marginBottom: 8,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(220,38,38,0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.2)',
    alignSelf: 'flex-start',
  },
  linkText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#dc2626',
    marginRight: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  codeBlock: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  codeText: {
    fontSize: 13,
    fontFamily: 'RobotoMono-Regular',
    color: '#ffffff',
  },
  productList: {
    marginTop: 8,
  },
  productItem: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  continueButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
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
  continueText: {
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