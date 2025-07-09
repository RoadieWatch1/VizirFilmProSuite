import React from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description: string;
}

export default function EmptyState({ icon, title = 'No Content', description }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <ImageBackground
        source={{
          uri: 'https://images.pexels.com/photos/1983032/pexels-photo-1983032.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
        }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.75)']}
          style={styles.overlay}
        >
          {icon && <View style={styles.iconWrapper}>{icon}</View>}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  backgroundImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: '100%',
    height: '100%',
  },
  iconWrapper: {
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    color: '#FF6B00',
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
});