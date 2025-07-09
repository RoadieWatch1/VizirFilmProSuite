import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { startStripeCheckout } from "@/services/paymentService";

export default function UpgradeScreen() {
  const handleSubscribe = (priceId: string) => {
    startStripeCheckout(priceId);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Vizir Film Pro Suite</Text>
      <Text style={styles.subtitle}>Unlock Pro Features</Text>
      <Text style={styles.tagline}>
        Take your filmmaking to the next level.
      </Text>

      {/* Lifetime Pro Suite */}
      <View style={styles.lifetimeCard}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>BEST VALUE</Text>
        </View>
        <Text style={styles.planTitle}>Lifetime Pro Suite</Text>
        <Text style={styles.price}>$199 one-time</Text>
        <View style={styles.features}>
          <Text style={styles.featureItem}>
            ✅ All future upgrades free
          </Text>
          <Text style={styles.featureItem}>
            ✅ Full access to Pro Suite
          </Text>
          <Text style={styles.featureItem}>
            ✅ Priority support
          </Text>
          <Text style={styles.featureItem}>
            ✅ Exclusive tools
          </Text>
        </View>
        <TouchableOpacity
          style={styles.lifetimeButton}
          onPress={() => handleSubscribe('price_1RasBfIgN98dwGnNFbbrFxqo')}
        >
          <Text style={styles.lifetimeButtonText}>
            Unlock Lifetime Pro Suite
          </Text>
        </TouchableOpacity>
      </View>

      {/* Yearly Pro */}
      <View style={styles.planCard}>
        <Text style={styles.planTitle}>Yearly Pro</Text>
        <Text style={styles.price}>$38.30/year</Text>
        <View style={styles.features}>
          <Text style={styles.featureItem}>
            ✅ Full Pro features
          </Text>
          <Text style={styles.featureItem}>
            ✅ Save 20% vs monthly
          </Text>
        </View>
        <TouchableOpacity
          style={styles.planButton}
          onPress={() => handleSubscribe('price_1Ras6nIgN98dwGnNS4Zazdux')}
        >
          <Text style={styles.planButtonText}>
            Go Yearly Pro
          </Text>
        </TouchableOpacity>
      </View>

      {/* Monthly Pro */}
      <View style={styles.planCard}>
        <Text style={styles.planTitle}>Monthly Pro</Text>
        <Text style={styles.price}>$3.99/month</Text>
        <View style={styles.features}>
          <Text style={styles.featureItem}>
            ✅ Full Pro features
          </Text>
          <Text style={styles.featureItem}>
            ✅ Cancel anytime
          </Text>
        </View>
        <TouchableOpacity
          style={styles.planButton}
          onPress={() => handleSubscribe('price_1Ras0gIgN98dwGnNFn2dMyFO')}
        >
          <Text style={styles.planButtonText}>
            Go Monthly Pro
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.disclaimer}>
        All prices in USD. Your subscription unlocks premium features, faster
        tools, and cinematic upgrades in the Vizir Film Pro Suite.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0C10',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    color: '#008080',
    fontSize: 28,
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  tagline: {
    color: '#CCCCCC',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  lifetimeCard: {
    backgroundColor: '#012f2f',
    borderColor: '#FF7F50',
    borderWidth: 2,
    borderRadius: 10,
    padding: 20,
    marginBottom: 30,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#FF7F50',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  planTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  price: {
    color: '#FFFFFF',
    fontSize: 18,
    marginBottom: 15,
  },
  features: {
    marginBottom: 20,
  },
  featureItem: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 5,
  },
  lifetimeButton: {
    backgroundColor: '#FF7F50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  lifetimeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  planCard: {
    backgroundColor: '#022d2d',
    borderColor: '#008080',
    borderWidth: 2,
    borderRadius: 10,
    padding: 20,
    marginBottom: 30,
  },
  planButton: {
    backgroundColor: '#008080',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  planButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disclaimer: {
    color: '#CCCCCC',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
});
