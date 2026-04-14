import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { TimetableScreen } from '../screens/TimetableScreen';
import { TimetableSettingsScreen } from '../screens/TimetableSettingsScreen';
import { ClassFormScreen } from '../screens/ClassFormScreen';
import { AssignmentListScreen } from '../screens/AssignmentListScreen';
import { GradeListScreen } from '../screens/GradeListScreen';
import { ClassDetailScreen } from '../screens/ClassDetailScreen';
import { AttendanceListScreen } from '../screens/AttendanceListScreen';
import { ClassAssignmentListScreen } from '../screens/ClassAssignmentListScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

import { RootTabParamList, TimetableStackParamList, GradeStackParamList } from '../types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const TimetableStack = createNativeStackNavigator<TimetableStackParamList>();
const GradeStack = createNativeStackNavigator<GradeStackParamList>();

function TimetableNavigator() {
  return (
    <TimetableStack.Navigator>
      <TimetableStack.Screen name="TimetableMain" component={TimetableScreen} options={{ headerShown: false }} />
      <TimetableStack.Screen
        name="TimetableSettings"
        component={TimetableSettingsScreen}
        options={{
          title: '時間割の設定',
          headerTintColor: '#007AFF',
          headerStyle: { backgroundColor: '#F2F2F7' },
          headerShadowVisible: false,
        }}
      />
      <TimetableStack.Screen name="ClassForm" component={ClassFormScreen} options={{ title: '講義登録', presentation: 'modal', headerTintColor: '#007AFF' }} />
      <TimetableStack.Screen name="ClassDetail" component={ClassDetailScreen} options={{ headerShown: false }} />
    </TimetableStack.Navigator>
  );
}

function GradeNavigator() {
  return (
    <GradeStack.Navigator>
      <GradeStack.Screen name="GradeList" component={GradeListScreen} options={{ headerShown: false }} />
      <GradeStack.Screen
        name="ClassDetail"
        component={ClassDetailScreen}
        options={{ headerShown: false }}
      />
      <GradeStack.Screen
        name="AttendanceList"
        component={AttendanceListScreen}
        options={{
          title: '出席一覧',
          headerTintColor: '#007AFF',
          headerStyle: { backgroundColor: '#F2F2F7' },
        }}
      />
      <GradeStack.Screen
        name="AssignmentList"
        component={ClassAssignmentListScreen}
        options={{
          title: '課題一覧',
          headerTintColor: '#007AFF',
          headerStyle: { backgroundColor: '#F2F2F7' },
        }}
      />
    </GradeStack.Navigator>
  );
}

type TabConfig = {
  icon: keyof typeof Ionicons.glyphMap;
  iconOutline: keyof typeof Ionicons.glyphMap;
  label: string;
};

const TAB_CONFIG: Record<keyof RootTabParamList, TabConfig> = {
  Timetable:   { icon: 'calendar',          iconOutline: 'calendar-outline',          label: '時間割'   },
  Assignments: { icon: 'document-text',     iconOutline: 'document-text-outline',     label: '課題'     },
  Grade:       { icon: 'bar-chart',         iconOutline: 'bar-chart-outline',         label: '成績'     },
  Settings:    { icon: 'person-circle',     iconOutline: 'person-circle-outline',     label: '設定'     },
};

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => {
          const cfg = TAB_CONFIG[route.name];
          return {
            headerShown: false,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? cfg.icon : cfg.iconOutline}
                size={size}
                color={color}
              />
            ),
            tabBarLabel: cfg.label,
            tabBarActiveTintColor: '#007AFF',
            tabBarInactiveTintColor: '#8E8E93',
            tabBarStyle: {
              backgroundColor: '#FFFFFF',
              borderTopColor: '#E5E5EA',
              borderTopWidth: 0.5,
            },
            tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
          };
        }}
      >
        <Tab.Screen name="Timetable"   component={TimetableNavigator} />
        <Tab.Screen name="Assignments" component={AssignmentListScreen} />
        <Tab.Screen name="Grade"       component={GradeNavigator} />
        <Tab.Screen name="Settings"    component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
