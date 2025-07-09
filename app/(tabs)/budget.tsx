// /app/(tabs)/budget.tsx
import { exportFilmPackageAsPDF } from "@/services/exportService";
import React, { useState } from 'react';
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFilmStore } from '@/store/filmStore';
import { DollarSign } from 'lucide-react-native';
import { BudgetCategory, BudgetItem } from '@/store/filmStore';

export default function BudgetScreen() {
  const { filmPackage, updateFilmPackage } = useFilmStore();

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const handleGenerateBudget = async () => {
    const genre = filmPackage?.genre || 'Drama';
    const length = filmPackage?.length || 'feature-length';

    try {
      setLoading(true);
      setLoadingMessage('Generating budget...');

      const res = await fetch('/api/budget', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          genre,
          scriptLength: length,
        }),
      });

      if (!res.ok) {
        const errorResponse = await res.json().catch(() => ({}));
        const errorMsg = errorResponse?.error || 'API error';
        throw new Error(errorMsg);
      }

      const data = await res.json();

      const budget: BudgetCategory[] = data.categories || [];

      updateFilmPackage({ budget });

      Alert.alert('Budget generated successfully!');
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error?.message || 'Failed to generate budget.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleExport = async () => {
    try {
      if (!filmPackage || Object.keys(filmPackage).length === 0) {
        Alert.alert("Nothing to export yet!");
        return;
      }

      await exportFilmPackageAsPDF(filmPackage, "My_Film_Project.pdf");

      Alert.alert(
        "Export Complete",
        "Film package exported and opened for preview!"
      );
    } catch (e: any) {
      console.error(e);
      Alert.alert(
        "Export Failed",
        e?.message || "An error occurred during export."
      );
    }
  };

  if (
    !filmPackage?.budget ||
    (Array.isArray(filmPackage.budget) && filmPackage.budget.length === 0)
  ) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#021e1f',
          padding: 20,
        }}
      >
        <DollarSign size={48} color="#FF6A00" />
        <Text
          style={{
            color: '#B2C8C9',
            fontSize: 18,
            marginVertical: 10,
            textAlign: 'center',
          }}
        >
          No Budget Yet
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: '#FF6A00',
            padding: 12,
            borderRadius: 8,
            marginTop: 10,
          }}
          onPress={handleGenerateBudget}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>
              Generate Budget
            </Text>
          )}
        </TouchableOpacity>

        {!!loadingMessage && (
          <Text
            style={{
              color: '#B2C8C9',
              marginTop: 10,
              textAlign: 'center',
            }}
          >
            {loadingMessage}
          </Text>
        )}
      </View>
    );
  }

  if (typeof filmPackage.budget === 'string') {
    return (
      <ScrollView
        style={{
          backgroundColor: '#021e1f',
          padding: 20,
        }}
      >
        <Text
          style={{
            color: '#FF6A00',
            fontSize: 20,
            marginBottom: 10,
            fontWeight: 'bold',
          }}
        >
          Budget Breakdown
        </Text>
        <Text
          style={{
            color: '#B2C8C9',
            fontSize: 16,
            lineHeight: 22,
          }}
        >
          {filmPackage.budget}
        </Text>

        <TouchableOpacity
          style={{
            backgroundColor: '#FF6A00',
            padding: 12,
            borderRadius: 8,
            marginTop: 20,
          }}
          onPress={handleExport}
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontWeight: 'bold',
              textAlign: 'center',
            }}
          >
            Export Budget as PDF
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const budgetArray = filmPackage.budget as BudgetCategory[];

  return (
    <ScrollView
      style={{
        backgroundColor: '#021e1f',
        padding: 20,
      }}
    >
      <Text
        style={{
          color: '#FF6A00',
          fontSize: 20,
          marginBottom: 16,
          fontWeight: 'bold',
        }}
      >
        Budget Breakdown
      </Text>
      {budgetArray.map((category, index) => (
        <View key={index} style={{ marginBottom: 20 }}>
          <Text
            style={{
              color: '#FF6A00',
              fontWeight: 'bold',
              fontSize: 16,
              marginBottom: 4,
            }}
          >
            {category.name} - ${category.amount.toLocaleString()} (
            {category.percentage}%)
          </Text>

          {category.items?.length > 0 && (
            <View style={{ marginLeft: 8 }}>
              {category.items.map((item, idx) => {
                if (typeof item === 'string') {
                  return (
                    <Text
                      key={idx}
                      style={{
                        color: '#B2C8C9',
                        fontSize: 14,
                        marginBottom: 2,
                      }}
                    >
                      - {item}
                    </Text>
                  );
                } else if (
                  typeof item === 'object' &&
                  item !== null &&
                  'name' in item &&
                  'cost' in item
                ) {
                  const obj = item as BudgetItem;
                  return (
                    <Text
                      key={idx}
                      style={{
                        color: '#B2C8C9',
                        fontSize: 14,
                        marginBottom: 2,
                      }}
                    >
                      - {obj.name || 'Unknown'} ($
                      {obj.cost?.toLocaleString() ?? '0'})
                    </Text>
                  );
                }
                return null;
              })}
            </View>
          )}
        </View>
      ))}

      <TouchableOpacity
        style={{
          backgroundColor: '#FF6A00',
          padding: 12,
          borderRadius: 8,
          marginTop: 20,
        }}
        onPress={handleExport}
      >
        <Text
          style={{
            color: '#FFFFFF',
            fontWeight: 'bold',
            textAlign: 'center',
          }}
        >
          Export Budget as PDF
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
