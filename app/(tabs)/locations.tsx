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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Camera, Clock, Users, Wand as Wand2, Star } from 'lucide-react-native';
import { useFilmStore } from '@/store/filmStore';
import EmptyState from '@/components/EmptyState';

interface Location {
  name: string;
  type: string;
  description: string;
  suitableFor: string[];
  logistics: {
    accessibility: string;
    parking: string;
    permits: string;
    powerAccess: string;
  };
  pros: string[];
  cons: string[];
  estimatedCost: string;
  image: string;
  rating: number;
}

export default function LocationsScreen() {
  const { filmPackage, updateLocations } = useFilmStore();
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(0);

  const generateLocations = async () => {
    if (!filmPackage?.script) return;

    setLoading(true);
    try {
      // Extract location types from script
      const locationMatches = [...filmPackage.script.matchAll(/(?:INT\.|EXT\.)\s+([^-]+)/g)];
      const uniqueLocations = [...new Set(locationMatches.map(match => match[1].trim()))];
      
      // Generate location suggestions based on script requirements
      const locations: Location[] = [
        {
          name: 'Downtown Loft Studio',
          type: 'Interior',
          description: 'Modern industrial loft with exposed brick walls, large windows, and flexible lighting setup. Perfect for contemporary drama scenes.',
          suitableFor: ['Interior Dialogue', 'Character Development', 'Intimate Scenes'],
          logistics: {
            accessibility: 'Elevator access, wheelchair accessible',
            parking: 'Street parking available, 2-hour limit',
            permits: 'Location release required',
            powerAccess: '220V available, multiple outlets'
          },
          pros: ['Controlled environment', 'Great acoustics', 'Flexible lighting'],
          cons: ['Limited natural light', 'Noise from street'],
          estimatedCost: '$500-800/day',
          image: 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=800',
          rating: 4.5
        },
        {
          name: 'City Park Pavilion',
          type: 'Exterior',
          description: 'Scenic outdoor pavilion surrounded by trees and walking paths. Natural lighting with beautiful background options.',
          suitableFor: ['Outdoor Dialogue', 'Walking Scenes', 'Establishing Shots'],
          logistics: {
            accessibility: 'Paved paths, accessible restrooms nearby',
            parking: 'Free parking lot, 50 spaces',
            permits: 'City filming permit required ($150)',
            powerAccess: 'Generator required for equipment'
          },
          pros: ['Natural lighting', 'Beautiful scenery', 'Free location'],
          cons: ['Weather dependent', 'Public access', 'Noise from traffic'],
          estimatedCost: '$150 (permit only)',
          image: 'https://images.pexels.com/photos/1105766/pexels-photo-1105766.jpeg?auto=compress&cs=tinysrgb&w=800',
          rating: 4.2
        },
        {
          name: 'Vintage Diner',
          type: 'Interior',
          description: 'Authentic 1950s-style diner with red vinyl booths, chrome fixtures, and classic neon signage. Perfect for period pieces or nostalgic scenes.',
          suitableFor: ['Dialogue Scenes', 'Character Meetings', 'Period Drama'],
          logistics: {
            accessibility: 'Ground level, narrow aisles',
            parking: 'Small lot, street parking',
            permits: 'Business agreement required',
            powerAccess: 'Standard outlets, may need extension cords'
          },
          pros: ['Authentic atmosphere', 'Built-in props', 'Interesting lighting'],
          cons: ['Limited space', 'Customer interruptions', 'Licensing music'],
          estimatedCost: '$300-500/day + revenue loss',
          image: 'https://images.pexels.com/photos/1307698/pexels-photo-1307698.jpeg?auto=compress&cs=tinysrgb&w=800',
          rating: 4.7
        },
        {
          name: 'Rooftop Terrace',
          type: 'Exterior',
          description: 'Urban rooftop with city skyline views. Modern architecture with glass railings and contemporary furniture.',
          suitableFor: ['Dramatic Scenes', 'Sunset/Sunrise Shots', 'Action Sequences'],
          logistics: {
            accessibility: 'Elevator to roof, safety barriers required',
            parking: 'Building garage, $20/day',
            permits: 'Building management approval',
            powerAccess: 'Rooftop electrical access available'
          },
          pros: ['Stunning views', 'Golden hour lighting', 'Modern aesthetic'],
          cons: ['Wind noise', 'Weather exposure', 'Safety concerns'],
          estimatedCost: '$400-600/day',
          image: 'https://images.pexels.com/photos/1105766/pexels-photo-1105766.jpeg?auto=compress&cs=tinysrgb&w=800',
          rating: 4.3
        }
      ];

      updateLocations(locations);
      Alert.alert('Success!', 'Location scouting report generated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to generate locations');
    } finally {
      setLoading(false);
    }
  };

  if (!filmPackage) {
    return (
      <EmptyState
        icon={<MapPin size={48} color="#ffffff" />}
        title="No Locations Yet"
        description="Generate your film package first to get location scouting recommendations and logistics."
      />
    );
  }

  const locations = filmPackage.locations || [];

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} size={12} color="#dc2626" fill="#dc2626" />);
    }
    if (hasHalfStar) {
      stars.push(<Star key="half" size={12} color="#dc2626" fill="rgba(220,38,38,0.5)" />);
    }
    for (let i = stars.length; i < 5; i++) {
      stars.push(<Star key={i} size={12} color="rgba(255,255,255,0.3)" />);
    }
    return stars;
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
                  <MapPin size={32} color="#ffffff" strokeWidth={1.5} />
                  <View style={styles.iconGlow} />
                </View>
                <Text style={styles.title}>LOCATION SCOUTING</Text>
                <View style={styles.titleUnderline} />
                <Text style={styles.subtitle}>FILMING LOCATIONS AND PRODUCTION LOGISTICS</Text>
              </View>

              <View style={styles.content}>
                {locations.length === 0 ? (
                  <TouchableOpacity
                    style={[styles.generateButton, loading && styles.generateButtonDisabled]}
                    onPress={generateLocations}
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
                          <Text style={styles.loadingText}>Scouting Locations...</Text>
                        </View>
                      ) : (
                        <View style={styles.buttonContent}>
                          <Wand2 size={20} color="#ffffff" strokeWidth={2} />
                          <Text style={styles.buttonText}>Generate Location Report</Text>
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <>
                    <View style={styles.locationSelector}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {locations.map((location, index) => (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.locationButton,
                              selectedLocation === index && styles.locationButtonActive,
                            ]}
                            onPress={() => setSelectedLocation(index)}
                          >
                            <Image source={{ uri: location.image }} style={styles.locationThumbnail} />
                            <Text style={[
                              styles.locationButtonText,
                              selectedLocation === index && styles.locationButtonTextActive,
                            ]}>
                              {location.name}
                            </Text>
                            <Text style={styles.locationButtonType}>{location.type}</Text>
                            {selectedLocation === index && <View style={styles.activeIndicator} />}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    {locations[selectedLocation] && (
                      <View style={styles.locationDetails}>
                        <View style={styles.locationHeader}>
                          <Image 
                            source={{ uri: locations[selectedLocation].image }} 
                            style={styles.locationImage} 
                          />
                          <View style={styles.locationInfo}>
                            <Text style={styles.locationName}>{locations[selectedLocation].name}</Text>
                            <Text style={styles.locationType}>{locations[selectedLocation].type}</Text>
                            <View style={styles.ratingContainer}>
                              <View style={styles.stars}>
                                {renderStars(locations[selectedLocation].rating)}
                              </View>
                              <Text style={styles.ratingText}>{locations[selectedLocation].rating}/5</Text>
                            </View>
                            <Text style={styles.estimatedCost}>{locations[selectedLocation].estimatedCost}</Text>
                          </View>
                        </View>

                        <Text style={styles.locationDescription}>
                          {locations[selectedLocation].description}
                        </Text>

                        <View style={styles.suitableForSection}>
                          <Text style={styles.sectionTitle}>SUITABLE FOR</Text>
                          <View style={styles.tagContainer}>
                            {locations[selectedLocation].suitableFor.map((item, index) => (
                              <View key={index} style={styles.tag}>
                                <Text style={styles.tagText}>{item}</Text>
                              </View>
                            ))}
                          </View>
                        </View>

                        <View style={styles.logisticsSection}>
                          <Text style={styles.sectionTitle}>LOGISTICS</Text>
                          <View style={styles.logisticsGrid}>
                            <View style={styles.logisticsItem}>
                              <Text style={styles.logisticsLabel}>Accessibility</Text>
                              <Text style={styles.logisticsValue}>{locations[selectedLocation].logistics.accessibility}</Text>
                            </View>
                            <View style={styles.logisticsItem}>
                              <Text style={styles.logisticsLabel}>Parking</Text>
                              <Text style={styles.logisticsValue}>{locations[selectedLocation].logistics.parking}</Text>
                            </View>
                            <View style={styles.logisticsItem}>
                              <Text style={styles.logisticsLabel}>Permits</Text>
                              <Text style={styles.logisticsValue}>{locations[selectedLocation].logistics.permits}</Text>
                            </View>
                            <View style={styles.logisticsItem}>
                              <Text style={styles.logisticsLabel}>Power Access</Text>
                              <Text style={styles.logisticsValue}>{locations[selectedLocation].logistics.powerAccess}</Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.prosConsSection}>
                          <View style={styles.prosSection}>
                            <Text style={styles.prosConsTitle}>PROS</Text>
                            {locations[selectedLocation].pros.map((pro, index) => (
                              <Text key={index} style={styles.prosText}>✓ {pro}</Text>
                            ))}
                          </View>
                          <View style={styles.consSection}>
                            <Text style={styles.prosConsTitle}>CONS</Text>
                            {locations[selectedLocation].cons.map((con, index) => (
                              <Text key={index} style={styles.consText}>✗ {con}</Text>
                            ))}
                          </View>
                        </View>
                      </View>
                    )}
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
  locationSelector: {
    marginBottom: 28,
  },
  locationButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    padding: 12,
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
    alignItems: 'center',
    width: 120,
  },
  locationButtonActive: {
    backgroundColor: 'rgba(220,38,38,0.2)',
    borderColor: 'rgba(220,38,38,0.4)',
  },
  locationThumbnail: {
    width: 80,
    height: 60,
    borderRadius: 8,
    marginBottom: 8,
  },
  locationButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  locationButtonTextActive: {
    color: '#ffffff',
  },
  locationButtonType: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#dc2626',
  },
  locationDetails: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  locationHeader: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  locationImage: {
    width: 120,
    height: 90,
    borderRadius: 12,
    marginRight: 16,
  },
  locationInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  locationName: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  locationType: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.7)',
  },
  estimatedCost: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#dc2626',
  },
  locationDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 22,
    marginBottom: 20,
  },
  suitableForSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: 'rgba(220,38,38,0.2)',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
  },
  logisticsSection: {
    marginBottom: 20,
  },
  logisticsGrid: {
    gap: 12,
  },
  logisticsItem: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 12,
  },
  logisticsLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#dc2626',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  logisticsValue: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.9)',
  },
  prosConsSection: {
    flexDirection: 'row',
    gap: 16,
  },
  prosSection: {
    flex: 1,
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: 8,
    padding: 16,
  },
  consSection: {
    flex: 1,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 8,
    padding: 16,
  },
  prosConsTitle: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  prosText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(34,197,94,0.9)',
    marginBottom: 6,
  },
  consText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(239,68,68,0.9)',
    marginBottom: 6,
  },
});