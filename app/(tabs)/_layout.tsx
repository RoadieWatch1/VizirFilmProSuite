import { Tabs } from 'expo-router';
import { Film, FileText, Users, Music, Clapperboard, Download, Calendar, DollarSign, MapPin } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopColor: 'rgba(220,38,38,0.4)',
          borderTopWidth: 3,
          paddingBottom: 12,
          paddingTop: 12,
          height: 80,
          shadowColor: '#dc2626',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 15,
        },
        tabBarActiveTintColor: '#dc2626',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.7)',
        tabBarLabelStyle: {
          fontSize: 9,
          fontFamily: 'Inter-Bold',
          marginTop: 2,
          marginBottom: 2,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          lineHeight: 10,
        },
        tabBarIconStyle: {
          marginTop: 2,
          marginBottom: 1,
        },
        tabBarShowLabel: true,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Create',
          tabBarIcon: ({ size, color }) => (
            <Film size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="concept"
        options={{
          title: 'Concept',
          tabBarIcon: ({ size, color }) => (
            <FileText size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="characters"
        options={{
          title: 'Cast',
          tabBarIcon: ({ size, color }) => (
            <Users size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sound"
        options={{
          title: 'Audio',
          tabBarIcon: ({ size, color }) => (
            <Music size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="storyboard"
        options={{
          title: 'Visual',
          tabBarIcon: ({ size, color }) => (
            <Clapperboard size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ size, color }) => (
            <Calendar size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: 'Budget',
          tabBarIcon: ({ size, color }) => (
            <DollarSign size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="locations"
        options={{
          title: 'Locations',
          tabBarIcon: ({ size, color }) => (
            <MapPin size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="export"
        options={{
          title: 'Export',
          tabBarIcon: ({ size, color }) => (
            <Download size={20} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}