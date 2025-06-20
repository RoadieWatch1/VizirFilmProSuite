import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ImageBackground,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Star, Check, CreditCard, RefreshCw } from 'lucide-react-native';
import { paymentService, SubscriptionProduct } from '@/services/paymentService';

interface EnhancedSubscriptionModalProps {
  onClose: () => void;
  onSubscribe: () => void;
}

// Mock products for web/development
const mockProducts: SubscriptionProduct[] = [
  {
    identifier: 'pro_monthly',
    title: 'Pro Monthly',
    price: '$3.99',
    priceAmountMicros: 3990000, // 3.99 USD in micros
    priceCurrencyCode: 'USD',
    description: 'Billed monthly',
    period: 'monthly'
  },
  {
    identifier: 'pro_yearly',
    title: 'Pro Yearly',
    price: '$39.99',
    priceAmountMicros: 39990000, // 39.99 USD in micros
    priceCurrencyCode: 'USD',
    description: 'Billed annually',
    period: 'yearly'
  },
  {
    identifier: 'pro_lifetime',
    title: 'Pro Lifetime',
    price: '$199.99',
    priceAmountMicros: 199990000, // 199.99 USD in micros
    priceCurrencyCode: 'USD',
    description: 'One-time payment',
    period: 'lifetime'
  }
];

export default function EnhancedSubscriptionModal({ onClose, onSubscribe }: EnhancedSubscriptionModalProps) {
  const [products, setProducts] = useState<SubscriptionProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('pro_monthly');
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      // Check if we're on web platform
      if (Platform.OS === 'web') {
        // Use mock products for web development
        setProducts(mockProducts);
        return;
      }

      // For native platforms, configure RevenueCat
      // Note: Replace 'your_revenuecat_api_key' with your actual RevenueCat API key
      // await paymentService.configure('your_revenuecat_api_key');
      
      // For now, use mock products until RevenueCat is properly configured
      setProducts(mockProducts);
      
      // Uncomment the following lines once RevenueCat is configured:
      // const availableProducts = await paymentService.getProducts();
      // setProducts(availableProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
      // Fallback to mock products if there's an error
      setProducts(mockProducts);
      
      // Only show alert on native platforms where RevenueCat should work
      if (Platform.OS !== 'web') {
        Alert.alert('Error', 'Failed to load subscription options');
      }
    }
  };

  const handlePurchase = async () => {
    setLoading(true);
    try {
      // Check if we're on web platform
      if (Platform.OS === 'web') {
        // Mock successful purchase for web development
        setTimeout(() => {
          onSubscribe();
          Alert.alert('Success!', 'Welcome to Pro! All features are now unlocked. (This is a demo for web)');
          setLoading(false);
        }, 2000);
        return;
      }

      // For native platforms, use actual RevenueCat purchase
      const customerInfo = await paymentService.purchaseProduct(selectedProduct);
      if (customerInfo.entitlements.pro?.isActive) {
        onSubscribe();
        Alert.alert('Success!', 'Welcome to Pro! All features are now unlocked.');
      }
    } catch (error) {
      console.error('Purchase failed:', error);
      if (Platform.OS === 'web') {
        Alert.alert('Demo Mode', 'This is a demo. Actual purchases require a native build with RevenueCat configured.');
      } else {
        Alert.alert('Purchase Failed', 'Please try again or contact support.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      // Check if we're on web platform
      if (Platform.OS === 'web') {
        // Mock restore for web development
        setTimeout(() => {
          Alert.alert('Demo Mode', 'This is a demo. Actual purchase restoration requires a native build with RevenueCat configured.');
          setRestoring(false);
        }, 1500);
        return;
      }

      // For native platforms, use actual RevenueCat restore
      const customerInfo = await paymentService.restorePurchases();
      if (customerInfo.entitlements.pro?.isActive) {
        onSubscribe();
        Alert.alert('Restored!', 'Your Pro subscription has been restored.');
      } else {
        Alert.alert('No Purchases', 'No previous purchases found to restore.');
      }
    } catch (error) {
      console.error('Restore failed:', error);
      if (Platform.OS === 'web') {
        Alert.alert('Demo Mode', 'This is a demo. Actual purchase restoration requires a native build with RevenueCat configured.');
      } else {
        Alert.alert('Restore Failed', 'Please try again or contact support.');
      }
    } finally {
      setRestoring(false);
    }
  };

  const getSelectedProduct = () => {
    return products.find(p => p.identifier === selectedProduct);
  };

  const getSavingsText = (product: SubscriptionProduct) => {
    if (product.period === 'yearly') return 'SAVE 50%';
    if (product.period === 'lifetime') return 'BEST VALUE';
    return '';
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
                  <Star size={32} color="#ffffff" strokeWidth={1.5} />
                  <View style={styles.iconGlow} />
                </View>

                <Text style={styles.title}>UNLOCK PRO FEATURES</Text>
                <View style={styles.titleUnderline} />
                <Text style={styles.subtitle}>
                  GAIN FULL ACCESS TO ALL SCRIPT LENGTHS AND PROFESSIONAL TOOLS
                </Text>

                {Platform.OS === 'web' && (
                  <View style={styles.demoNotice}>
                    <Text style={styles.demoText}>
                      DEMO MODE - For actual purchases, export to native build
                    </Text>
                  </View>
                )}

                {/* Product Selection */}
                <View style={styles.productSelection}>
                  {products.map((product) => (
                    <TouchableOpacity
                      key={product.identifier}
                      style={[
                        styles.productOption,
                        selectedProduct === product.identifier && styles.productOptionSelected,
                      ]}
                      onPress={() => setSelectedProduct(product.identifier)}
                    >
                      <View style={styles.productHeader}>
                        <Text style={styles.productTitle}>{product.title}</Text>
                        {getSavingsText(product) && (
                          <View style={styles.savingsBadge}>
                            <Text style={styles.savingsText}>{getSavingsText(product)}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.productPrice}>{product.price}</Text>
                      <Text style={styles.productDescription}>{product.description}</Text>
                      {selectedProduct === product.identifier && (
                        <View style={styles.selectedIndicator}>
                          <Check size={16} color="#ffffff" strokeWidth={2} />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
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
                  <View style={styles.feature}>
                    <Check size={20} color="#ffffff" strokeWidth={1.5} />
                    <Text style={styles.featureText}>PRIORITY SUPPORT</Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={[styles.subscribeButton, loading && styles.buttonDisabled]} 
                  onPress={handlePurchase}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['rgba(255,255,255,0.95)', 'rgba(240,240,240,0.9)', 'rgba(255,255,255,1)']}
                    style={styles.buttonGradient}
                  >
                    {loading ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#000000" />
                        <Text style={styles.loadingText}>Processing...</Text>
                      </View>
                    ) : (
                      <>
                        <CreditCard size={20} color="#000000" strokeWidth={2} />
                        <Text style={styles.subscribeText}>
                          {Platform.OS === 'web' ? 'TRY DEMO FOR' : 'SUBSCRIBE FOR'} {getSelectedProduct()?.price || '$2.99'}
                        </Text>
                      </>
                    )}
                    <View style={styles.buttonGlow} />
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.restoreButton, restoring && styles.buttonDisabled]} 
                  onPress={handleRestore}
                  disabled={restoring}
                >
                  {restoring ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
                      <Text style={styles.restoreText}>Restoring...</Text>
                    </View>
                  ) : (
                    <>
                      <RefreshCw size={16} color="rgba(255,255,255,0.7)" strokeWidth={1.5} />
                      <Text style={styles.restoreText}>RESTORE PURCHASES</Text>
                    </>
                  )}
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

 content: {
  alignItems: 'center',
  paddingHorizontal: 24,  // 🔄 was 36 — too wide for small screens
  paddingTop: 32,
  paddingBottom: 24,
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
    marginBottom: 32,
    lineHeight: 20,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  demoNotice: {
    backgroundColor: 'rgba(255,193,7,0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,193,7,0.3)',
  },
  demoText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: '#ffc107',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productSelection: {
    width: '100%',
    marginBottom: 24,
    gap: 12,
  },
  productOption: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
  },
  productOptionSelected: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    borderColor: 'rgba(220,38,38,0.3)',
  },
    productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  productTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  savingsBadge: {
    backgroundColor: 'rgba(34,197,94,0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  savingsText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#22c55e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productPrice: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.7)',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  features: {
    width: '100%',
    marginBottom: 32,
    gap: 16,
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffffff',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
   },
 modal: {
  width: '100%',
  maxWidth: 420,
  marginHorizontal: 16,
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
  zIndex: 9,
  alignSelf: 'center', // ✅ centers modal on all screens
},

  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    padding: 10,
  },

  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 26,
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
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#000000',
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  restoreText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginLeft: 8,
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
