import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../services/firebase';

type RootStackParamList = {
  Login: undefined;
  EsqueciSenha: undefined;
  VerificarCodigo: { usuarioId: string; email: string };
};

type NavigationProps = NativeStackNavigationProp<RootStackParamList, 'EsqueciSenha'>;

export default function EsqueciSenha() {

  const navigation = useNavigation<NavigationProps>();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validarEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleEnviarLink = async () => {

    if (!email.trim()) {
      setError('Digite seu email');
      return;
    }

    if (!validarEmail(email)) {
      setError('Digite um email válido');
      return;
    }

    setLoading(true);
    setError('');

    try {
      
      await sendPasswordResetEmail(auth, email);
      Alert.alert('Email enviado!', 'Verifique sua caixa de entrada e spam para redefinir sua senha.',
      [{ text: 'OK', onPress: () => navigation.navigate('Login')}]);
   
    } catch (error: any) {
      
      console.error('Erro:', error);
      
      if (error.code === 'auth/user-not-found') {
        setError('Este email não está cadastrado');
      } else if (error.code === 'auth/invalid-email') {
        setError('Email inválido');
      } else {
        setError('Erro ao enviar email. Tente novamente.');
      }

    } finally {
      setLoading(false);
    }

  };

    return (
    
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          
          <Text style={styles.title}>Esqueci senha</Text>
          <View style={{ width: 40 }} />

        </View>

        <View style={styles.content}>
          
          <Text style={styles.subtitle}> Digite seu email cadastrado para receber um link para redefinir sua senha. </Text>

          <View style={styles.inputGroup}>
            
            <Text style={styles.label}>Email</Text>
            
            <TextInput style={[styles.input, error ? styles.inputError : null]} placeholder="seu@email.com" placeholderTextColor="#8581FF"
            value={email} onChangeText={(text) => { setEmail(text); setError(''); }} keyboardType="email-address" autoCapitalize="none" />
            
            {error ?
            <Text style={styles.errorText}>{error}</Text>
            : null}

          </View>

          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleEnviarLink} disabled={loading}>
            
            <Text style={styles.buttonText}>
              {loading ? 'Enviando...' : 'Enviar link de recuperação'}
            </Text>

          </TouchableOpacity>

          <View style={styles.infoBox}>     
            <Text style={styles.infoIcon}>💡</Text>
            <Text style={styles.infoText}> O link expira em 1 hora. Verifique também sua caixa de spam! </Text>
          </View>

          <TouchableOpacity style={styles.linkContainer} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}> Redefiniu a sua senha? <Text style={styles.linkBold}>Faça login</Text> </Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  
  container: {
    flex: 1,
    backgroundColor: '#dadafa'
  },

  scrollContent: {
    flexGrow: 1
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
    backgroundColor: '#0f248d',
  },

  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },

  backButtonText: {
    color: '#FFF',
    fontSize: 24,
    fontFamily: 'Alatsi_400Regular'
  },

  title: {
    color: '#FFF',
    fontSize: 22,
    fontFamily: 'Alatsi_400Regular'
  },

  content: {
    flex: 1,
    padding: 20
  },

  subtitle: {
    fontSize: 16,
    color: '#0f248d',
    fontFamily: 'Cabin_400Regular',
    marginBottom: 30,
    lineHeight: 22,
  },

  inputGroup: {
    marginBottom: 20
  },
  
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontFamily: 'Cabin_700Bold'
  },

  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#aab3ff',
    fontFamily: 'Inter_400Regular',
  },

  inputError: {
    borderColor: '#F44336',
    borderWidth: 2
  },

  errorText: {
    color: '#F44336',
    fontSize: 14,
    marginTop: 5,
    fontFamily: 'Inter_400Regular'
  },

  button: {
    backgroundColor: '#0f248d',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
  },

  buttonDisabled: {
    backgroundColor: '#A5A2E8'
  },

  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Cabin_700Bold'
  },

  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 36, 141, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 30,
    alignItems: 'center',
  },

  infoIcon: {
    fontSize: 20,
    marginRight: 10
  },

  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#0f248d',
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },

  linkContainer: {
    marginTop: 25,
    alignItems: 'center',
  },

  linkText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Inter_400Regular',
  },

  linkBold: {
    color: '#0f248d',
    fontFamily: 'Cabin_700Bold',
    textDecorationLine: 'underline',
  },
});