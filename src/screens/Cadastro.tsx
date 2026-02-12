import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../contexts/AuthContext';
import { SignUpData } from '../types/auth';

type RootStackParamList = {
  Login: undefined;
  Cadastro: undefined;
  Home: undefined;
};

type NavigationProps = NativeStackNavigationProp<RootStackParamList>;

export default function Cadastro() {
 
  const navigation = useNavigation<NavigationProps>();

  const { signUp, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [ showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState<SignUpData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const validateField = (field: keyof SignUpData, value: string) => { //validaçao de campos

    let error = '';

    switch (field) {
      
      case 'name':
        if (!value.trim()) error = 'Nome é obrigatório';
        else if (value.length < 2) error = 'Nome muito curto';
        break;
      
      case 'email':
        if (!value.trim()) error = 'Email é obrigatório';
        else if (!/\S+@\S+\.\S+/.test(value)) error = 'Email inválido';
        break;

      case 'password':
        if (!value) error = 'Senha é obrigatória';
        else if (value.length < 6) error = 'Mínimo 6 caracteres';
        break;
      
      case 'confirmPassword':
        if (!value) error = 'Confirme sua senha';
        else if (value !== formData.password) error = 'Senhas não conferem';
        break;
    }

    setErrors(prev => ({ ...prev, [field]: error }));
    return error === '';
  };

  const handleChange = (field: keyof SignUpData, value: string) => { //valida em tempo real
    
    setFormData(prev => ({ ...prev, [field]: value }));

    if (value.trim()) {
      validateField(field, value);
    } else {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  
  };

  const validateForm = (): boolean => { //valida tudo de novo quando o user clica em criar conta

    const validations = [
      validateField('name', formData.name),
      validateField('email', formData.email),
      validateField('password', formData.password),
      validateField('confirmPassword', formData.confirmPassword)
    ];

    return validations.every(v => v === true);
  
  };

  const handleSignUp = async () => {
    
    if (!validateForm()) {
      Alert.alert('Atenção!', 'Preencha todos os campos corretamente');
      return;
    }
    
    try {
      
      await signUp(formData.email, formData.password, formData.name);
      Alert.alert('Sucesso!', 'Conta criada! Faça login.');
      navigation.navigate('Login');
   
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    }
    
  };

  return (
   
   <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      
      <View style={styles.header}>
        <Text style={styles.title}> Criar conta </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          
          <Text style={styles.label}> Nome completo </Text>
         
          <TextInput style={[ styles.input, errors.name ? styles.inputError : null ]} placeholder='Digite seu nome' placeholderTextColor='#8581FF'
          value={formData.name} onChangeText={(text) => handleChange('name', text)} onBlur={() => validateField('name', formData.name)} />
          
          {errors.name ?
            <Text style={styles.errorText}> {errors.name} </Text>
          : null }

        </View>

        <View style={styles.inputGroup}>
         
          <Text style={styles.label}> Email </Text>
         
          <TextInput style={[ styles.input, errors.email ? styles.inputError : null ]} placeholder='seu@email.com' placeholderTextColor='#8581FF'
          value={formData.email} onChangeText={(text) => handleChange('email', text)} onBlur={() => validateField('email', formData.email)}
          keyboardType='email-address' autoCapitalize='none' />

          {errors.email ?
            <Text style={styles.errorText}> {errors.email} </Text>
          : null }
        
        </View>

        <View style={styles.inputGroup}>

          <Text style={styles.label}> Senha </Text>

          <View style={styles.passwordContainer}>
            
            <TextInput style={[ styles.input, styles.passwordInput, errors.password ? styles.inputError : null ]} placeholder='Mínimo 6 caracteres'
            placeholderTextColor='#8581FF' value={formData.password} onChangeText={(text) => handleChange('password', text)} onBlur={() =>
            validateField('password', formData.password)} secureTextEntry={!showPassword} />

            <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
              <Text style={styles.eyeText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
            </TouchableOpacity>

          </View>

          {errors.password ?
            <Text style={styles.errorText}> {errors.password} </Text>
          : null }

        </View>

        <View style={styles.inputGroup}>
          
          <Text style={styles.label}> Confirmar senha </Text>
          
          <View style={styles.passwordContainer}>
            
            <TextInput style={[ styles.input, styles.passwordInput, errors.confirmPassword ? styles.inputError : null ]} placeholder='Digite
            novamente' placeholderTextColor='#8581FF' value={formData.confirmPassword} onChangeText={(text) => handleChange('confirmPassword', text)}
            secureTextEntry={!showConfirmPassword} />

            <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Text style={styles.eyeText}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
            </TouchableOpacity>
            
          </View>

          {errors.confirmPassword ?
            <Text style={styles.errorText}> {errors.confirmPassword} </Text>
          : null }

        </View>

        <TouchableOpacity style={[ styles.button, isLoading ? styles.buttonDisabled : null ]} onPress={handleSignUp} disabled={isLoading}>
        
          {isLoading ? (
            <ActivityIndicator color='#FFF' />
          ) : (
            <Text style={styles.buttonText}> Cadastrar </Text>
          )}
          
        </TouchableOpacity>

        <View style={styles.loginLink}>
        
          <Text style={styles.loginText}> Já tem uma conta? </Text>
        
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLinkText}>Faça login</Text>
          </TouchableOpacity>

        </View>
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
    paddingTop: 60,
    paddingBottom: 30,
  },

  header: {
    alignItems: 'center',
    marginBottom: 40,
  },

  title: {
    fontSize: 34,
    fontFamily: 'Alatsi_400Regular',
    color: '#0f248d',
    marginBottom: 8,
  },

  form: {
    width: '100%',
  },

  inputGroup: {
    marginBottom: 20,
  },

  label: {
    fontSize: 18,
    fontFamily: 'Cabin_700Bold',
    color: '#0f248d',
    marginBottom: 8,
  },

  input: {
    backgroundColor: 'white',
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#aab3ff',
    fontFamily: 'Inter_400Regular'
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
    fontFamily: 'Inter_400Regular'
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

  button: {
    backgroundColor: '#0f248d',
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },

  buttonDisabled: {
    backgroundColor: '#4b5ff5',
    opacity: 0.7,
  },

  buttonText: {
    color: '#FFF',
    fontSize: 20,
    fontFamily: 'Cabin_700Bold'
  },
  
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },

  loginText: {
    color: '#4b5ff5',
    fontSize: 17,
    fontFamily: 'Cabin_400Regular'
  },

  loginLinkText: {
    color: '#0f248d',
    fontSize: 18,
    fontFamily: 'Cabin_700Bold'
  },
})