import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../contexts/AuthContext'; 

type RootStackParamList = {
  Home: undefined;
  Login: undefined;
};

type NavigationProps = NativeStackNavigationProp<RootStackParamList>;

export default function Home() { 
 
  const navigation = useNavigation<NavigationProps>();

  const  { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigation.navigate('Login');
  };

  if (!user) {
    
    return (
    
    <View style={styles.container}>
      <Text style={styles.title}> Carregando... </Text>
    </View>

    )

  }

  return (
   
   <View style={styles.container}>
  
      <Text style={styles.title}>Olá, {user.name || user.email || 'Usuário'}! 👋</Text>
      <Text style={styles.subtitle}>Bem-vindo ao FinanceRS</Text>
      
      <View style={styles.card}>
       
        <Text style={styles.cardTitle}>Setup Inicial</Text>
        <Text style={styles.cardText}> Para começar, configure sua renda mensal e categorias de gastos. </Text>
        
        <TouchableOpacity style={styles.cardButton}>
          <Text style={styles.cardButtonText}>Configurar agora</Text>
        </TouchableOpacity>

      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Sair</Text>
      </TouchableOpacity>
      
    </View>
  );
}


const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#221377',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#8581FF',
    marginBottom: 40,
  },
  card: {
    backgroundColor: '#4D48C8',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 10,
  },
  cardText: {
    fontSize: 16,
    color: '#D0CEFF',
    marginBottom: 20,
    lineHeight: 22,
  },
  cardButton: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cardButtonText: {
    color: '#221377',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  logoutButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
  },
});