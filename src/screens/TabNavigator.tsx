import React from 'react';
import { StyleSheet, Image }from 'react-native';
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
      
      <Tab.Screen name="HomeTab" component={Home} options={{ tabBarLabel: 'Resumo', tabBarIcon: () => (
        <Image style={styles.menuIcon} source={require('../../assets/home.png')}/>
      ), }} />
      
      <Tab.Screen name="TransactionsTab" component={Transactions} options={{ tabBarLabel: 'Transações', tabBarIcon: () => (
        <Image style={styles.menuIcon} source={require('../../assets/administrative-transactions.png')}/>
      ), }} />
      
      <Tab.Screen name="GoalsTab" component={Goals} options={{ tabBarLabel: 'Metas', tabBarIcon: () => (
        <Image style={styles.menuIcon} source={require('../../assets/alvo.png')}/>
      ), }} />

      <Tab.Screen name="SettingsTab" component={Settings} options={{ tabBarLabel: 'Configurações', tabBarIcon: () => (
        <Image style={styles.menuIcon} source={require('../../assets/configuracoes.png')}/>
      ), }} />

    </Tab.Navigator>

  );
}

const styles = StyleSheet.create({
  
  menuIcon: {
    width: 20,
    height: 20
  },

})