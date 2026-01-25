import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { SignInData} from '../types/auth';

import { useAuth } from '../contexts/AuthContext';

type RootStackParamList = {
  Login: undefined;
  Cadastro: undefined;
  Home: undefined;
};

type NavigationProps = NativeStackNavigationProp<RootStackParamList>;

export default function Login() {
  
  const navigation = useNavigation<NavigationProps>();

  const { signIn, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormdata] = useState<SignInData>({
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState({
    email: '',
    password: ''
  });

  const validateField = (field: keyof SignInData, value: string) => { //verifica se um cmapo esta valido

    let error = '';

    switch (field) {

      case 'email':
       
        if (!value.trim()) error = 'Email é obrigatório';
        else if (!/\S+@\S+\.\S+/.test(value)) error = 'Email inválido';
        break;

      case 'password':

        if (!value) error = 'Senha é obrigatória';
        break;
    }

    setErrors(prev => ({ ...prev, [field]: error }));
    return error === '';
  
  };

  const handleChange = (field: keyof SignInData, value: string) => { //gerencia as mudanças em tempo real
    
    setFormdata(prev => ({ ...prev, [field]: value }));

    if (value.trim()) { //se tem conteudo valida
      validateField(field, value);
    } else { //senao remove qualquer erro anterior (feedback imediato: erro some assim q usuario começa a digitar)
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  
  };

  const validateForm = (): boolean => { //valida todos os campos antes do envio

    const validations = [
      validateField('email', formData.email),
      validateField('password', formData.password)
    ];

    return validations.every(v => v === true);

  };

  const handleLogin = async () => {
    
    if (!validateForm()) {
      Alert.alert('Atenção!', 'Preencha todos os campos corretamente.');
      return;
    }

    try {
      await signIn(formData.email, formData.password);
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    }

  };

  return (
    
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={styles.title}> FinanceRS </Text>
        </View>

        <View style={styles.form}>
         
          <View style={styles.inputGroup}>
          
            <Text style={styles.label}> Email </Text>
           
            <TextInput style={[ styles.input, errors.email ? styles.inputError : null ]} placeholder='seu@wmail.com' value={formData.email}
            onChangeText={(text) => handleChange('email', text)} onBlur={() => validateField('email', formData.email)} keyboardType='email-address'
            autoCapitalize='none' autoComplete='email' />

            {errors.email ?
                <Text style={styles.errorText}> {errors.email} </Text>
            : null }

          </View>

          <View style={styles.inputGroup}>

            <Text style={styles.label}> Senha </Text>
            
            <View style={styles.passwordContainer}>
              
              <TextInput style={[ styles.input, styles.passwordInput, errors.password ? styles.inputError : null ]} placeholder='Digite sua senha'
              value={formData.password} onChangeText={(text) => handleChange('password', text)} onBlur={() => validateField('password', formData
              .password)} secureTextEntry={!showPassword} autoComplete='password' />

              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.eyeText}> {showPassword ? '👁️' : '👁️‍🗨️'} </Text>
              </TouchableOpacity>

            </View>

            {errors.password ?
                <Text style={styles.errorText}> {errors.password} </Text>
            : null }

          </View>

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[ styles.button, isLoading ? styles.buttonDisabled : null ]} onPress={handleLogin} disabled={isLoading}>
           
            {isLoading ? (
              <ActivityIndicator color='#fff' />
            ) : (
              <Text style={styles.buttonText}> Entrar </Text>
            )}

          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Cadastro')}>
            <Text style={styles.secondaryButtonText}> Criar nova conta </Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
 
  container: {
    flex: 1,
    backgroundColor: '#dadafa',
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 100,
    paddingBottom: 30,
  },

  header: {
    alignItems: 'center',
    marginBottom: 50,
  },

  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#0f248d',
    marginBottom: 10,
  },

  form: {
    width: '100%',
  },

  inputGroup: {
    marginBottom: 20,
  },

  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f248d',
    marginBottom: 8,
  },

  input: {
    backgroundColor: '#b9c4f7',
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#aab3ff',
  },

  inputError: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFE6E6',
  },

  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    marginTop: 4,
    marginLeft: 5,
  },

  passwordContainer: {
    position: 'relative',
  },

  passwordInput: {
    paddingRight: 50,
  },

  eyeButton: {
    position: 'absolute',
    right: 15,
    top: 12,
  },

  eyeText: {
    fontSize: 20,
  },

  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 25,
  },

  forgotPasswordText: {
    color: '#0f248d',
    fontSize: 14,
  },

  button: {
    backgroundColor: '#0f248d',
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 20,
  },

  buttonDisabled: {
    backgroundColor: '#4b5ff5',
    opacity: 0.7,
  },

  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#0f248d',
  },

  dividerText: {
    color: '#0f248d',
    marginHorizontal: 15,
    fontSize: 14,
  },

  secondaryButton: {
    borderRadius: 10,
    alignItems: 'center',
  },

  secondaryButtonText: {
    color: '#0f248d',
    fontSize: 16,
    fontWeight: 'bold',
  },

});