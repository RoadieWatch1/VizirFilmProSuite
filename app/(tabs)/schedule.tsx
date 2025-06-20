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
import { Calendar, Clock, MapPin, Users, Camera, Wand as Wand2 } from 'lucide-react-native';
import { useFilmStore } from '@/store/filmStore';
import EmptyState from '@/components/EmptyState';

interface ScheduleDay {
  day: number;
  date: string;
  scenes: string[];
  location: string;
  callTime: string;
  wrapTime: string;
  crew: string[];
  equipment: string[];
  notes: string;
}

export default function ScheduleScreen() {
  const { filmPackage, updateSchedule } = useFilmStore();
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);

  const generateSchedule = async () => {
    if (!filmPackage?.script) return;

    setLoading(true);
    try {
      // Extract scenes from script
      const sceneMatches = [...filmPackage.script.matchAll(/(?:INT\.|EXT\.)\s+([^-]+)\s+-\s+([^\n]+)/g)];
      const scenes = sceneMatches.map((match, index) => `Scene ${index + 1}: ${match[1]} - ${match[2]}`);
      
      // Generate a realistic shooting schedule
      const schedule: ScheduleDay[] = [];
      const totalDays = Math.ceil(scenes.length / 3); // Roughly 3 scenes per day
      
      for (let day = 0; day < totalDays; day++) {
        const dayScenes = scenes.slice(day * 3, (day + 1) * 3);
        const date = new Date();
        date.setDate(date.getDate() + day);
        
        schedule.push({
          day: day + 1,
          date: date.toLocaleDateString(),
          scenes: dayScenes,
          location: day % 2 === 0 ? 'Studio A' : 'Location',
          callTime: '7:00 AM',
          wrapTime: '7:00 PM',
          crew: ['Director', 'DP', 'Gaffer', 'Sound Recordist', 'Script Supervisor'],
          equipment: ['Camera Package', 'Lighting Kit', 'Audio Equipment', 'Monitors'],
          notes: `Day ${day + 1} shooting notes - Weather contingency plan in place.`
        });
      }
      
      updateSchedule(schedule);
      Alert.alert('Success!', 'Shooting schedule generated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to generate schedule');
    } finally {
      setLoading(false);
    }
  };

  if (!filmPackage) {
    return (
      <EmptyState
        icon={<Calendar size={48} color="#ffffff" />}
        title="No Schedule Yet"
        description="Generate your film package first to create a detailed shooting schedule."
      />
    );
  }

  const schedule = filmPackage.schedule || [];

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
                  <Calendar size={32} color="#ffffff" strokeWidth={1.5} />
                  <View style={styles.iconGlow} />
                </View>
                <Text style={styles.title}>SHOOTING SCHEDULE</Text>
                <View style={styles.titleUnderline} />
                <Text style={styles.subtitle}>PRODUCTION TIMELINE AND DAILY CALL SHEETS</Text>
              </View>

              <View style={styles.content}>
                {schedule.length === 0 ? (
                  <TouchableOpacity
                    style={[styles.generateButton, loading && styles.generateButtonDisabled]}
                    onPress={generateSchedule}
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
                          <Text style={styles.loadingText}>Generating Schedule...</Text>
                        </View>
                      ) : (
                        <View style={styles.buttonContent}>
                          <Wand2 size={20} color="#ffffff" strokeWidth={2} />
                          <Text style={styles.buttonText}>Generate Shooting Schedule</Text>
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <>
                    <View style={styles.daySelector}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {schedule.map((day, index) => (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.dayButton,
                              selectedDay === index && styles.dayButtonActive,
                            ]}
                            onPress={() => setSelectedDay(index)}
                          >
                            <Text style={[
                              styles.dayButtonText,
                              selectedDay === index && styles.dayButtonTextActive,
                            ]}>
                              Day {day.day}
                            </Text>
                            <Text style={[
                              styles.dayButtonDate,
                              selectedDay === index && styles.dayButtonDateActive,
                            ]}>
                              {day.date}
                            </Text>
                            {selectedDay === index && <View style={styles.activeIndicator} />}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    {schedule[selectedDay] && (
                      <View style={styles.dayDetails}>
                        <View style={styles.dayHeader}>
                          <Text style={styles.dayTitle}>DAY {schedule[selectedDay].day}</Text>
                          <Text style={styles.dayDate}>{schedule[selectedDay].date}</Text>
                        </View>

                        <View style={styles.timeSection}>
                          <View style={styles.timeItem}>
                            <Clock size={16} color="#dc2626" />
                            <Text style={styles.timeLabel}>CALL TIME</Text>
                            <Text style={styles.timeValue}>{schedule[selectedDay].callTime}</Text>
                          </View>
                          <View style={styles.timeItem}>
                            <Clock size={16} color="#dc2626" />
                            <Text style={styles.timeLabel}>WRAP TIME</Text>
                            <Text style={styles.timeValue}>{schedule[selectedDay].wrapTime}</Text>
                          </View>
                        </View>

                        <View style={styles.locationSection}>
                          <View style={styles.sectionHeader}>
                            <MapPin size={18} color="#ffffff" />
                            <Text style={styles.sectionTitle}>LOCATION</Text>
                          </View>
                          <Text style={styles.locationText}>{schedule[selectedDay].location}</Text>
                        </View>

                        <View style={styles.scenesSection}>
                          <View style={styles.sectionHeader}>
                            <Camera size={18} color="#ffffff" />
                            <Text style={styles.sectionTitle}>SCENES TO SHOOT</Text>
                          </View>
                          {schedule[selectedDay].scenes.map((scene, index) => (
                            <View key={index} style={styles.sceneItem}>
                              <Text style={styles.sceneText}>{scene}</Text>
                            </View>
                          ))}
                        </View>

                        <View style={styles.crewSection}>
                          <View style={styles.sectionHeader}>
                            <Users size={18} color="#ffffff" />
                            <Text style={styles.sectionTitle}>CREW CALL</Text>
                          </View>
                          <View style={styles.crewList}>
                            {schedule[selectedDay].crew.map((member, index) => (
                              <Text key={index} style={styles.crewMember}>• {member}</Text>
                            ))}
                          </View>
                        </View>

                        <View style={styles.notesSection}>
                          <Text style={styles.notesTitle}>PRODUCTION NOTES</Text>
                          <Text style={styles.notesText}>{schedule[selectedDay].notes}</Text>
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
  daySelector: {
    marginBottom: 28,
  },
  dayButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
    alignItems: 'center',
  },
  dayButtonActive: {
    backgroundColor: 'rgba(220,38,38,0.2)',
    borderColor: 'rgba(220,38,38,0.4)',
  },
  dayButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  dayButtonTextActive: {
    color: '#ffffff',
  },
  dayButtonDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
  },
  dayButtonDateActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#dc2626',
  },
  dayDetails: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dayHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(220,38,38,0.2)',
  },
  dayTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  dayDate: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  timeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  timeItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(220,38,38,0.1)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 6,
  },
  timeLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#dc2626',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 8,
  },
  timeValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginTop: 4,
  },
  locationSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  locationText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.9)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 8,
  },
  scenesSection: {
    marginBottom: 24,
  },
  sceneItem: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  sceneText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.9)',
  },
  crewSection: {
    marginBottom: 24,
  },
  crewList: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 16,
  },
  crewMember: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  notesSection: {
    backgroundColor: 'rgba(220,38,38,0.1)',
    borderRadius: 12,
    padding: 16,
  },
  notesTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#dc2626',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
  },
});