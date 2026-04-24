import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AppNavigator } from './src/navigation';
import { supabase } from './src/lib/supabase';

SplashScreen.preventAutoHideAsync();

const MIN_SPLASH_MS = 1800;

export default function App() {
  const [ready, setReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    const authPromise = supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) await supabase.auth.signInAnonymously();
    });
    const minDelay = new Promise<void>(resolve => setTimeout(resolve, MIN_SPLASH_MS));

    Promise.all([authPromise, minDelay]).then(() => setReady(true));
  }, []);

  const handleLayout = async () => {
    await SplashScreen.hideAsync();
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    if (!ready) return;
    Animated.timing(opacity, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true,
    }).start(() => setSplashDone(true));
  }, [ready]);

  return (
    <>
      <StatusBar style="dark" />
      {splashDone && <AppNavigator />}
      {!splashDone && (
        <View style={styles.container} onLayout={handleLayout}>
          <Animated.View style={[styles.content, { opacity, transform: [{ translateY }] }]}>
            <View style={styles.row}>
              <Image source={require('./assets/icon.png')} style={styles.icon} />
              <View style={styles.divider} />
              <View style={styles.nameBlock}>
                <Text style={styles.katakana}>ユニトラ</Text>
                <Text style={styles.official}>Unit-Tracker</Text>
              </View>
            </View>
            <Text style={styles.tagline}>単位を、もっとシンプルに。</Text>
          </Animated.View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 28,
  },
  icon: {
    width: 96,
    height: 96,
    borderRadius: 22,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E5EA',
  },
  nameBlock: {
    gap: 3,
  },
  katakana: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: 2,
  },
  official: {
    fontSize: 12,
    fontWeight: '400',
    color: '#AEAEB2',
    letterSpacing: 1.5,
  },
  tagline: {
    fontSize: 12,
    color: '#C7C7CC',
    letterSpacing: 0.5,
    marginTop: 20,
  },
});
