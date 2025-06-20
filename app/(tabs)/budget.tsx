import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { DollarSign, TrendingUp, Users, Camera, Music, Wand as Wand2 } from 'lucide-react-native';
import { useFilmStore } from '@/store/filmStore';
import EmptyState from '@/components/EmptyState';

interface BudgetCategory {
  name: string;
  amount: number;
  percentage: number;
  icon: React.ReactNode;
  items: { name: string; cost: number }[];
}

export default function BudgetScreen() {
  const { filmPackage, updateBudget } = useFilmStore();
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(0);

  const generateBudget = async () => {
    if (!filmPackage?.script) return;

    setLoading(true);
    try {
      // Determine budget scale based on script length
      const scriptLength = filmPackage.scriptLength || '1 min (Short)';
      let baseBudget = 5000; // Default for short films
      
      if (scriptLength.includes('30 min')) baseBudget = 50000;
      else if (scriptLength.includes('1 hour')) baseBudget = 150000;
      else if (scriptLength.includes('2 hours')) baseBudget = 500000;
      else if (scriptLength.includes('10 min')) baseBudget = 15000;
      else if (scriptLength.includes('5 min')) baseBudget = 8000;

      const budget: BudgetCategory[] = [
        {
          name: 'Cast & Crew',
          amount: Math.round(baseBudget * 0.35),
          percentage: 35,
          icon: <Users size={20} color="#dc2626" />,
          items: [
            { name: 'Director', cost: Math.round(baseBudget * 0.08) },
            { name: 'Lead Actors', cost: Math.round(baseBudget * 0.15) },
            { name: 'Supporting Cast', cost: Math.round(baseBudget * 0.07) },
            { name: 'Crew', cost: Math.round(baseBudget * 0.05) },
          ]
        },
        {
          name: 'Equipment',
          amount: Math.round(baseBudget * 0.25),
          percentage: 25,
          icon: <Camera size={20} color="#dc2626" />,
          items: [
            { name: 'Camera Package', cost: Math.round(baseBudget * 0.12) },
            { name: 'Lighting Equipment', cost: Math.round(baseBudget * 0.08) },
            { name: 'Audio Equipment', cost: Math.round(baseBudget * 0.05) },
          ]
        },
        {
          name: 'Production',
          amount: Math.round(baseBudget * 0.20),
          percentage: 20,
          icon: <TrendingUp size={20} color="#dc2626" />,
          items: [
            { name: 'Location Fees', cost: Math.round(baseBudget * 0.08) },
            { name: 'Catering', cost: Math.round(baseBudget * 0.06) },
            { name: 'Transportation', cost: Math.round(baseBudget * 0.04) },
            { name: 'Insurance', cost: Math.round(baseBudget * 0.02) },
          ]
        },
        {
          name: 'Post-Production',
          amount: Math.round(baseBudget * 0.15),
          percentage: 15,
          icon: <Music size={20} color="#dc2626" />,
          items: [
            { name: 'Editing', cost: Math.round(baseBudget * 0.08) },
            { name: 'Color Grading', cost: Math.round(baseBudget * 0.03) },
            { name: 'Sound Design', cost: Math.round(baseBudget * 0.02) },
            { name: 'Music Licensing', cost: Math.round(baseBudget * 0.02) },
          ]
        },
        {
          name: 'Contingency',
          amount: Math.round(baseBudget * 0.05),
          percentage: 5,
          icon: <DollarSign size={20} color="#dc2626" />,
          items: [
            { name: 'Emergency Fund', cost: Math.round(baseBudget * 0.05) },
          ]
        }
      ];

      updateBudget({ categories: budget, total: baseBudget });
      Alert.alert('Success!', 'Production budget generated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to generate budget');
    } finally {
      setLoading(false);
    }
  };

  if (!filmPackage) {
    return (
      <EmptyState
        icon={<DollarSign size={48} color="#ffffff" />}
        title="No Budget Yet"
        description="Generate your film package first to create a detailed production budget breakdown."
      />
    );
  }

  const budget = filmPackage.budget;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

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
                  <DollarSign size={32} color="#ffffff" strokeWidth={1.5} />
                  <View style={styles.iconGlow} />
                </View>
                <Text style={styles.title}>PRODUCTION BUDGET</Text>
                <View style={styles.titleUnderline} />
                <Text style={styles.subtitle}>COMPREHENSIVE FINANCIAL BREAKDOWN AND COST ANALYSIS</Text>
              </View>

              <View style={styles.content}>
                {!budget ? (
                  <TouchableOpacity
                    style={[styles.generateButton, loading && styles.generateButtonDisabled]}
                    onPress={generateBudget}
                    disabled={loading}
                  >
                    <LinearGradient
                      colors={loading ? 
                        ['rgba(40,40,40,0.6)', 'rgba(60,60,60,0.4)', 'rgba(30,30,30,0.7)'] :
                        ['rgba(220,38,38,0.98)', 'rgba(185,28,28,0.95)', 'rgba(220,38,38,1)']
                      }
                      style={styles.buttonGradient}
                    >
                      {loading ? (
                        <View style={styles.loadingContainer}>
                          <ActivityIndicator size="small" color="#ffffff" />
                          <Text style={styles.loadingText}>Generating Budget...</Text>
                        </View>
                      ) : (
                        <View style={styles.buttonContent}>
                          <Wand2 size={20} color="#ffffff" strokeWidth={2} />
                          <Text style={styles.buttonText}>Generate Production Budget</Text>
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <>
                    <View style={styles.totalBudget}>
                      <Text style={styles.totalLabel}>TOTAL PRODUCTION BUDGET</Text>
                      <Text style={styles.totalAmount}>{formatCurrency(budget.total)}</Text>
                    </View>

                    <View style={styles.categoriesGrid}>
                      {budget.categories.map((category, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.categoryCard,
                            selectedCategory === index && styles.categoryCardActive,
                          ]}
                          onPress={() => setSelectedCategory(index)}
                        >
                          <View style={styles.categoryHeader}>
                            {category.icon}
                            <Text style={styles.categoryName}>{category.name}</Text>
                          </View>
                          <Text style={styles.categoryAmount}>{formatCurrency(category.amount)}</Text>
                          <Text style={styles.categoryPercentage}>{category.percentage}%</Text>
                          <View style={[styles.progressBar, { width: `${category.percentage}%` }]} />
                        </TouchableOpacity>
                      ))}
                    </View>

                    {budget.categories[selectedCategory] && (
                      <View style={styles.categoryDetails}>
                        <View style={styles.detailsHeader}>
                          {budget.categories[selectedCategory].icon}
                          <Text style={styles.detailsTitle}>
                            {budget.categories[selectedCategory].name.toUpperCase()} BREAKDOWN
                          </Text>
                        </View>
                        
                        <View style={styles.itemsList}>
                          {budget.categories[selectedCategory].items.map((item, index) => (
                            <View key={index} style={styles.budgetItem}>
                              <Text style={styles.itemName}>{item.name}</Text>
                              <Text style={styles.itemCost}>{formatCurrency(item.cost)}</Text>
                            </View>
                          ))}
                        </View>

                        <View style={styles.categoryTotal}>
                          <Text style={styles.categoryTotalLabel}>CATEGORY TOTAL</Text>
                          <Text style={styles.categoryTotalAmount}>
                            {formatCurrency(budget.categories[selectedCategory].amount)}
                          </Text>
                        </View>
                      </View>
                    )}

                    <View style={styles.budgetNotes}>
                      <Text style={styles.notesTitle}>BUDGET NOTES</Text>
                      <Text style={styles.notesText}>
                        • All costs are estimates based on industry standards{'\n'}
                        • Actual costs may vary by location and market conditions{'\n'}
                        • 5% contingency fund included for unexpected expenses{'\n'}
                        • Consider additional costs for permits and legal requirements
                      </Text>
                    </View>
                  </>
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
  generateButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 36,
    borderWidth: 1,
    borderColor: '#dc2626',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  generateButtonDisabled: {
    opacity: 0.4,
    borderColor: 'rgba(220,38,38,0.2)',
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
    color: '#ffffff',
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
  totalBudget: {
    backgroundColor: 'rgba(220,38,38,0.15)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.3)',
  },
  totalLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#dc2626',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 36,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
  },
  categoryCardActive: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    borderColor: 'rgba(220,38,38,0.3)',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  categoryAmount: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  categoryPercentage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  progressBar: {
    height: 3,
    backgroundColor: '#dc2626',
    borderRadius: 2,
  },
  categoryDetails: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(220,38,38,0.2)',
  },
  detailsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginLeft: 12,
    letterSpacing: 1.2,
  },
  itemsList: {
    marginBottom: 20,
  },
  budgetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    marginBottom: 8,
  },
  itemName: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.9)',
    flex: 1,
  },
  itemCost: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  categoryTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(220,38,38,0.2)',
  },
  categoryTotalLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#dc2626',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  categoryTotalAmount: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  budgetNotes: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.2)',
  },
  notesTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#dc2626',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  notesText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 22,
  },
});