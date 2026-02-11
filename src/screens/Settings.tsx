import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';

import { useAuth } from '../contexts/AuthContext'; 

export default function Settings() {
  
  const  { signOut } = useAuth();

  return (

    <TouchableOpacity style={styles.botaoSair} onPress={signOut} activeOpacity={0.7}>
      <Text style={styles.botaoSairTexto}> Sair </Text>
    </TouchableOpacity>
    
  );
}

const styles = StyleSheet.create({

  botaoSair: {
    backgroundColor: '#d65858ff',
    padding: 5,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 30,
    width: '80%',
    marginLeft: 30,
    marginRight: 30
  },

  botaoSairTexto: {
    color: 'white',
    fontSize: 20,
  },

})