import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';

import { TimetableScreen } from '../screens/TimetableScreen';
import { ClassFormScreen } from '../screens/ClassFormScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { GradeListScreen } from '../screens/GradeListScreen';
import { ClassDetailScreen } from '../screens/ClassDetailScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

import { RootTabParamList, TimetableStackParamList, GradeStackParamList } from '../types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const TimetableStack = createNativeStackNavigator<TimetableStackParamList>();
const GradeStack = createNativeStackNavigator<GradeStackParamList>();

function TimetableNavigator() {
  return (
    <TimetableStack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#fff' }, headerTintColor: '#6366f1' }}>
      <TimetableStack.Screen name="TimetableMain" component={TimetableScreen} options={{ headerShown: false }} />
      <TimetableStack.Screen name="ClassForm" component={ClassFormScreen} options={{ title: '講義登録', presentation: 'modal' }} />
    </TimetableStack.Navigator>
  );
}

function GradeNavigator() {
  return (
    <GradeStack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#fff' }, headerTintColor: '#6366f1' }}>
      <GradeStack.Screen name="GradeList" component={GradeListScreen} options={{ headerShown: false }} />
      <GradeStack.Screen
        name="ClassDetail"
        component={ClassDetailScreen}
        options={({ route }) => ({ title: route.params.className })}
      />
    </GradeStack.Navigator>
  );
}

const TAB_ICONS: Record<string, string> = {
  Timetable: '📅',
  Calendar: '🗓',
  Grade: '📊',
  Settings: '⚙️',
};
const TAB_LABELS: Record<string, string> = {
  Timetable: '時間割',
  Calendar: 'カレンダー',
  Grade: '成績',
  Settings: '設定',
};

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>{TAB_ICONS[route.name]}</Text>,
          tabBarLabel: TAB_LABELS[route.name],
          tabBarActiveTintColor: '#6366f1',
          tabBarInactiveTintColor: '#94a3b8',
          tabBarStyle: {
            backgroundColor: '#fff',
            borderTopColor: '#e2e8f0',
            paddingBottom: 4,
          },
        })}
      >
        <Tab.Screen name="Timetable" component={TimetableNavigator} />
        <Tab.Screen name="Calendar" component={CalendarScreen} />
        <Tab.Screen name="Grade" component={GradeNavigator} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
