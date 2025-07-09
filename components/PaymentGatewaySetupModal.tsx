import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ImageBackground,
  Linking,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  CreditCard,
  ExternalLink,
  CircleAlert as AlertCircle,
  DollarSign,
  Building2,
  Smartphone,
} from 'lucide-react-native';

interface PaymentGatewaySetupModalProps {
  onClose: () => void;
}

export default function PaymentGatewaySetupModal({
  onClose,
}: PaymentGatewaySetupModalProps) {
  const [selectedStep, setSelectedStep] = useState(0);

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  const handleClose = () => {
    onClose();
  };

  const steps = [
    {
      title: 'REVENUECAT',
      icon: <CreditCard size={8} color="#dc2626" />,
      description: 'Configure RevenueCat for subscription management',
      content: (
        <View style={styles.stepContent}>
          <Text style={styles.stepDescription}>
            RevenueCat handles subscription logic, but you need payment gateways to receive money.
          </Text>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => openLink('https://app.revenuecat.com/')}
          >
            <Text style={styles.linkText}>Create Account</Text>
            <ExternalLink size={6} color="#dc2626" />
          </TouchableOpacity>
        </View>
      ),
    },
    {
      title: 'APPLE STORE',
      icon: <Smartphone size={8} color="#dc2626" />,
      description: 'Set up iOS payments through Apple',
      content: (
        <View style={styles.stepContent}>
          <Text style={styles.stepDescription}>
            For iOS users, Apple handles payments and takes 30% commission. You receive 70%.
          </Text>
          <View style={styles.requirementsList}>
            <Text style={styles.requirementTitle}>Requirements:</Text>
            <Text style={styles.requirementItem}>• Apple Developer Account ($99/year)</Text>
            <Text style={styles.requirementItem}>• Bank account for payouts</Text>
            <Text style={styles.requirementItem}>• Tax information</Text>
          </View>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => openLink('https://developer.apple.com/app-store-connect/')}
          >
            <Text style={styles.linkText}>App Store Connect</Text>
            <ExternalLink size={6} color="#dc2626" />
          </TouchableOpacity>
        </View>
      ),
    },
    {
      title: 'GOOGLE PLAY',
      icon: <Smartphone size={8} color="#dc2626" />,
      description: 'Set up Android payments through Google',
      content: (
        <View style={styles.stepContent}>
          <Text style={styles.stepDescription}>
            For Android users, Google handles payments and takes 30% commission. You receive 70%.
          </Text>
          <View style={styles.requirementsList}>
            <Text style={styles.requirementTitle}>Requirements:</Text>
            <Text style={styles.requirementItem}>• Google Play Developer Account ($25 one-time)</Text>
            <Text style={styles.requirementItem}>• Google Payments Merchant Account</Text>
            <Text style={styles.requirementItem}>• Bank account for payouts</Text>
          </View>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => openLink('https://play.google.com/console/')}
          >
            <Text style={styles.linkText}>Google Play Console</Text>
            <ExternalLink size={6} color="#dc2626" />
          </TouchableOpacity>
        </View>
      ),
    },
    {
      title: 'PROCESSING',
      icon: <Building2 size={8} color="#dc2626" />,
      description: 'How money flows to your bank account',
      content: (
        <View style={styles.stepContent}>
          <Text style={styles.stepDescription}>
            Here's how payments work in your film production app:
          </Text>
          <View style={styles.flowDiagram}>
            {[
              'User subscribes in your app',
              'Apple/Google processes payment',
              'RevenueCat receives webhook',
              'Your app unlocks Pro features',
              'Money deposited to your bank (monthly)',
            ].map((text, index) => (
              <React.Fragment key={index}>
                <View style={styles.flowStep}>
                  <Text style={styles.flowNumber}>{index + 1}</Text>
                  <Text style={styles.flowText}>{text}</Text>
                </View>
                {index < 4 && (
                  <View style={styles.flowArrow}>
                    <Text style={styles.arrowText}>↓</Text>
                  </View>
                )}
              </React.Fragment>
            ))}
          </View>
        </View>
      ),
    },
    {
      title: 'BANK SETUP',
      icon: <DollarSign size={8} color="#dc2626" />,
      description: 'Configure bank accounts for payouts',
      content: (
        <View style={styles.stepContent}>
          <Text style={styles.stepDescription}>
            Set up bank accounts to receive your subscription revenue:
          </Text>
          <View style={styles.bankSetupList}>
            <View style={styles.bankItem}>
              <Text style={styles.bankTitle}>Apple Payouts</Text>
              <Text style={styles.bankDescription}>
                Configure in App Store Connect → Agreements, Tax, and Banking
              </Text>
              <Text style={styles.bankNote}>
                Pays monthly, 45 days after month end
              </Text>
            </View>
            <View style={styles.bankItem}>
              <Text style={styles.bankTitle}>Google Payouts</Text>
              <Text style={styles.bankDescription}>
                Configure in Google Play Console → Financial reports
              </Text>
              <Text style={styles.bankNote}>
                Pays monthly, around 15th of following month
              </Text>
            </View>
          </View>
          <View style={styles.warningBox}>
            <AlertCircle size={6} color="#f59e0b" />
            <Text style={styles.warningText}>
              You'll need business bank accounts and tax documentation for both platforms.
            </Text>
          </View>
        </View>
      ),
    },
  ];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleClose}
      >
        <ImageBackground
          source={{
            uri:
              'https://images.pexels.com/photos/1983032/pexels-photo-1983032.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
          }}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <View style={{ ...styles.smokeOverlay1, pointerEvents: 'none' }} />
          <View style={{ ...styles.smokeOverlay2, pointerEvents: 'none' }} />
          <View style={{ ...styles.smokeOverlay3, pointerEvents: 'none' }} />
          <View
            style={{
              ...styles.smokeGlow1,
              pointerEvents: 'none',
              boxShadow: '0 0 30px rgba(255,255,255,0.06)',
            }}
          />
          <View
            style={{
              ...styles.smokeGlow2,
              pointerEvents: 'none',
              boxShadow: '0 0 25px rgba(220,38,38,0.03)',
            }}
          />

          <LinearGradient
            colors={[
              'rgba(0,0,0,0.15)',
              'rgba(20,20,20,0.35)',
              'rgba(10,10,10,0.65)',
              'rgba(0,0,0,0.88)',
              'rgba(0,0,0,0.96)',
            ]}
            style={styles.gradientOverlay}
          >
            <TouchableOpacity
              style={styles.modal}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                <View style={styles.closeButtonBackground}>
                  <X size={12} color="#ffffff" strokeWidth={2} />
                </View>
              </TouchableOpacity>

              <ScrollView
                style={styles.modalScrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                <View style={styles.content}>
                  <View style={styles.iconContainer}>
                    <DollarSign size={16} color="#ffffff" strokeWidth={1.5} />
                    <View style={styles.iconGlow} />
                  </View>

                  <Text style={styles.title}>
                    PAYMENT GATEWAY SETUP
                  </Text>
                  <View
                    style={{
                      ...styles.titleUnderline,
                      boxShadow: '0 0 10px #ffffff99',
                    }}
                  />
                  <Text style={styles.subtitle}>
                    COMPLETE GUIDE TO RECEIVING SUBSCRIPTION PAYMENTS
                  </Text>

                  <View style={styles.pricingDisplay}>
                    <Text style={styles.pricingTitle}>YOUR NEW PRICING STRUCTURE</Text>
                    <View style={styles.pricingGrid}>
                      <View style={styles.priceCard}>
                        <Text style={styles.priceAmount}>$3.99</Text>
                        <Text style={styles.pricePeriod}>Monthly</Text>
                      </View>
                      <View style={styles.priceCard}>
                        <Text style={styles.priceAmount}>$39.00</Text>
                        <Text style={styles.pricePeriod}>Yearly</Text>
                        <View style={styles.savingsBadge}>
                          <Text style={styles.savingsText}>50% OFF</Text>
                        </View>
                      </View>
                      <View style={styles.priceCard}>
                        <Text style={styles.priceAmount}>$199.99</Text>
                        <Text style={styles.pricePeriod}>Lifetime</Text>
                        <View style={styles.bestValueBadge}>
                          <Text style={styles.bestValueText}>BEST VALUE</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={styles.stepNavigation}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.stepScrollContainer}
                    >
                      {steps.map((step, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.stepTab,
                            selectedStep === index && styles.stepTabActive,
                          ]}
                          onPress={() => setSelectedStep(index)}
                        >
                          {step.icon}
                          <Text
                            style={[
                              styles.stepTabText,
                              selectedStep === index && styles.stepTabTextActive,
                            ]}
                          >
                            {step.title}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  <View style={styles.stepContainer}>
                    <Text style={styles.stepTitle}>{steps[selectedStep].title}</Text>
                    <Text style={styles.stepSubtitle}>{steps[selectedStep].description}</Text>
                    <ScrollView
                      style={styles.stepContentScrollView}
                      showsVerticalScrollIndicator={false}
                    >
                      {steps[selectedStep].content}
                    </ScrollView>
                  </View>

                  <TouchableOpacity style={styles.continueButton} onPress={handleClose}>
                    <LinearGradient
                      colors={['rgba(255,255,255,0.95)', 'rgba(240,240,240,0.9)', 'rgba(255,255,255,1)']}
                      style={styles.buttonGradient}
                    >
                      <Text style={styles.continueText}>GOT IT</Text>
                      <View style={styles.buttonGlow} />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </ScrollView>
              <View style={styles.cardGlow} />
            </TouchableOpacity>
          </LinearGradient>
        </ImageBackground>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(220,38,38,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  iconGlow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 26,
    backgroundColor: 'rgba(220,38,38,0.15)',
    opacity: 0.7,
    zIndex: -1,
  },
  content: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  modalScrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 50,
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
    boxShadow: '0px 0px 30px rgba(255,255,255,0.06)',
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
    boxShadow: '0px 0px 25px rgba(220,38,38,0.03)',
  },
  gradientOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 50,
  },
  modal: {
    width: '100%',
    maxWidth: 200,
    backgroundColor: 'rgba(0,0,0,0.92)',
    borderRadius: 8,
    position: 'relative',
    boxShadow: '0px 0px 25px #ffffff33',
    maxHeight: '70%',
    minHeight: '50%',
  },
  title: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 5,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  titleUnderline: {
    width: 30,
    height: 2,
    backgroundColor: '#ffffff',
    marginBottom: 8,
    boxShadow: '0px 0px 10px #ffffff99',
  },
  // ... (rest of styles remain unchanged unless further changes needed)
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    padding: 5,
  },
  closeButtonBackground: {
    backgroundColor: 'rgba(220,38,38,0.85)',
    borderRadius: 20,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },


  subtitle: {
    fontSize: 7,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 9,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  pricingDisplay: {
    width: '100%',
    backgroundColor: 'rgba(220,38,38,0.1)',
    borderRadius: 5,
    padding: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.2)',
  },
  pricingTitle: {
    fontSize: 7,
    fontFamily: 'Inter-Bold',
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  pricingGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 3,
  },
  priceCard: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 3,
    padding: 5,
    alignItems: 'center',
    position: 'relative',
    minHeight: 30,
    justifyContent: 'center',
  },
  priceAmount: {
    fontSize: 8,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: 1,
  },
  pricePeriod: {
    fontSize: 5,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  savingsBadge: {
    position: 'absolute',
    top: -1,
    right: -1,
    backgroundColor: '#22c55e',
    borderRadius: 2,
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  savingsText: {
    fontSize: 4,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  bestValueBadge: {
    position: 'absolute',
    top: -1,
    right: -1,
    backgroundColor: '#f59e0b',
    borderRadius: 2,
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  bestValueText: {
    fontSize: 4,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  stepNavigation: {
    width: '100%',
    marginBottom: 10,
  },
  stepScrollContainer: {
    paddingHorizontal: 2,
  },
  stepTab: {
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 3,
    marginRight: 3,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    minWidth: 28,
  },
  stepTabActive: {
    backgroundColor: 'rgba(220,38,38,0.2)',
    borderColor: 'rgba(220,38,38,0.3)',
  },
  stepTabText: {
    fontSize: 5,
    fontFamily: 'Inter-Bold',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    lineHeight: 6,
  },
  stepTabTextActive: {
    color: '#ffffff',
  },
  stepContainer: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 5,
    padding: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    height: 90,
  },
  stepTitle: {
    fontSize: 8,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  stepSubtitle: {
    fontSize: 6,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 5,
    lineHeight: 8,
  },
  stepContentScrollView: {
    flex: 1,
  },
  stepContent: {
    width: '100%',
    paddingBottom: 3,
  },
  stepDescription: {
    fontSize: 6,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 8,
    marginBottom: 5,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 5,
    backgroundColor: 'rgba(220,38,38,0.1)',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.2)',
    alignSelf: 'flex-start',
  },
  linkText: {
    fontSize: 5,
    fontFamily: 'Inter-Medium',
    color: '#dc2626',
    marginRight: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  requirementsList: {
    marginBottom: 5,
  },
  requirementTitle: {
    fontSize: 6,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  requirementItem: {
    fontSize: 5,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 1,
  },
  flowDiagram: {
    alignItems: 'center',
    marginTop: 3,
    width: '100%',
  },
  flowStep: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 2,
    padding: 2,
    marginVertical: 1,
    width: '100%',
  },
  flowNumber: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#dc2626',
    color: '#ffffff',
    fontSize: 5,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    lineHeight: 10,
    marginRight: 3,
  },
  flowText: {
    fontSize: 5,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.9)',
    flex: 1,
  },
  flowArrow: {
    alignItems: 'center',
    marginVertical: 1,
  },
  arrowText: {
    fontSize: 5,
    color: '#dc2626',
    fontWeight: 'bold',
  },
  bankSetupList: {
    marginTop: 3,
    gap: 3,
  },
  bankItem: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 2,
    padding: 3,
  },
  bankTitle: {
    fontSize: 5,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: 1,
  },
  bankDescription: {
    fontSize: 4,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 1,
  },
  bankNote: {
    fontSize: 4,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.6)',
    fontStyle: 'italic',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: 2,
    padding: 3,
    marginTop: 3,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
  },
  warningText: {
    fontSize: 4,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 3,
    flex: 1,
    lineHeight: 6,
  },
  continueButton: {
    width: '100%',
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ffffff',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  buttonGradient: {
    paddingVertical: 7,
    paddingHorizontal: 10,
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
    fontSize: 7,
    fontFamily: 'Inter-Bold',
    color: '#000000',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    position: 'relative',
    zIndex: 1,
  },
  cardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 8,
  },
});