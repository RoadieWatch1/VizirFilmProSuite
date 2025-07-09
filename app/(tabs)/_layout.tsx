// /app/_layout.tsx
import { Lightbulb } from 'lucide-react-native';
import { Tabs } from 'expo-router';
import { Film, BookOpen, User, Camera, DollarSign, Calendar, MapPin, Volume2, Upload } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF6A00',
        tabBarStyle: { backgroundColor: '#000000' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Create',
          tabBarIcon: ({ color, size }) => <Film color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="script"
        options={{
          title: 'Script',
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="concept"
        options={{
          title: 'Concept',
          tabBarIcon: ({ color, size }) => <Lightbulb color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="characters"
        options={{
          title: 'Characters',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="storyboard"
        options={{
          title: 'Storyboard',
          tabBarIcon: ({ color, size }) => <Camera color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: 'Budget',
          tabBarIcon: ({ color, size }) => <DollarSign color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="locations"
        options={{
          title: 'Locations',
          tabBarIcon: ({ color, size }) => <MapPin color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="sound"
        options={{
          title: 'Sound',
          tabBarIcon: ({ color, size }) => <Volume2 color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="export"
        options={{
          title: 'Export',
          tabBarIcon: ({ color, size }) => <Upload color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
