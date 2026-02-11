import React from 'react';
import { StyleSheet, Text }from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'; 

import Home from './Home';
import Transactions from './Transactions';
import Goals from './Goals';
import Settings from './Settings';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  
    return (
    
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarStyle: { backgroundColor: '#dadafa', borderTopColor: '#676565', borderTopWidth: 1,
    height: 60, paddingBottom: 5, }, tabBarActiveTintColor: '#0f248d', tabBarInactiveTintColor: '#8581FF', tabBarShowLabel: true, tabBarLabelStyle: {
    fontSize: 10, fontWeight: '500', }, }}>
      
      <Tab.Screen name="HomeTab" component={Home} options={{ tabBarLabel: 'Resumo', tabBarIcon: ({ color, size }) => (
        <Text style={[styles.menuIcon, { color }]}>📊</Text>
      ), }} />
      
      <Tab.Screen name="TransactionsTab" component={Transactions} options={{ tabBarLabel: 'Transações', tabBarIcon: ({ color, size }) => (
        <Text style={[styles.menuIcon, { color }]}>📝</Text>
      ), }} />
      
      <Tab.Screen name="GoalsTab" component={Goals} options={{ tabBarLabel: 'Metas', tabBarIcon: ({ color, size }) => (
        <Text style={[styles.menuIcon, { color }]}>🎯</Text>
      ), }} />

      <Tab.Screen name="SettingsTab" component={Settings} options={{ tabBarLabel: 'Configurações', tabBarIcon: ({ color, size }) => (
        <Text style={[styles.menuIcon, { color }]}>⚙️</Text>
      ), }} />

    </Tab.Navigator>

  );
}

const styles = StyleSheet.create({
  
  menuIcon: {
    fontSize: 20,
    color: '#0f248d',
    marginBottom: 3,
  },

})