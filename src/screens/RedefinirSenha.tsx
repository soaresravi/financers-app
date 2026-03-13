import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Image } from 'react-native';

import { useAuth } from '../contexts/AuthContext'; 
import { useTheme } from '../contexts/ThemeContext';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { auth } from '../services/firebase';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';

type RootStackParamList = {
  Settings: undefined;
};

type NavigationProps = NativeStackNavigationProp<RootStackParamList>;

export default function RedefinirSenha() {

  const navigation = useNavigation<NavigationProps>();
  const { user } = useAuth();

  const { temaEscuro } = useTheme();
  const styles = getStyles(temaEscuro);

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [senhaAtualVerificada, setSenhaAtualVerificada] = useState(false);

  const [errors, setErrors] = useState({
    senhaAtual: '',
    novaSenha: '',
    confirmarSenha: ''
  });

  const validarSenha = (senha: string): string => {
    if (!senha.trim()) return 'A senha é obrigatória';
    if (senha.length < 6) return 'A senha deve conter pelo menos 6 caracteres';
    return '';
  };

  const verificarSenhaAtual = async () => {
    
    if (!senhaAtual.trim()) {
      setErrors(prev => ({ ...prev, senhaAtual: 'Digite sua senha atual' }));
      return;
    }

    setLoading(true);

    try {

      if (!auth.currentUser || !user?.email) {
        setErrors(prev => ({ ...prev, senhaAtual: 'Usuário não identificado.' }));
        return;
      }

      const credential = EmailAuthProvider.credential(user.email, senhaAtual);
      await reauthenticateWithCredential(auth.currentUser, credential);

      setSenhaAtualVerificada(true);
      setErrors(prev => ({ ...prev, senhaAtual: '' }));

    } catch (error: any) {
      
      console.error('Erro ao verificar a senha:', error);

      if (error.code === 'auth/wrong-password') {
        setErrors(prev => ({ ...prev, senhaAtual: 'Senha incorreta' }));
      } else {
        setErrors(prev => ({ ...prev, senhaAtual: 'Erro ao verificar senha' }));
      }

    } finally {
      setLoading(false);
    }

  };

  const handleSenhaAtualChange = (text: string) => {
    
    setSenhaAtual(text);
    setSenhaAtualVerificada(false);

    if (!text.trim()) {
      setErrors(prev => ({ ...prev, senhaAtual: 'Digite sua senha atual' }));
    } else {
        setErrors(prev => ({ ...prev, senhaAtual: '' }));
    }

  };

  const handleNovaSenhaChange = (text: string) => {

    setNovaSenha(text);
    const error = validarSenha(text);
    setErrors(prev => ({ ...prev, novaSenha: error }));

    if (confirmarSenha && text !== confirmarSenha) {
      setErrors(prev => ({ ...prev, confirmarSenha: 'As senhas não conferem' }));
    } else if (confirmarSenha) {
      setErrors(prev => ({ ...prev, confirmarSenha: '' }));
    }

  };

  const handleConfirmarSenhaChange = (text: string) => {

    setConfirmarSenha(text);

    if (text !== novaSenha) {
      setErrors(prev => ({ ...prev, confirmarSenha: 'As senhas não conferem' }));
    } else {
        setErrors(prev => ({ ...prev, confirmarSenha: '' }));
    }

  };

  const formValido = (): boolean => {
    return ( senhaAtualVerificada && novaSenha.trim() !== '' && confirmarSenha.trim() !== '' && !errors.novaSenha && !errors.confirmarSenha);
  };

  const salvarNovaSenha = async () => {

    if (!formValido()) return;
    setLoading(true);

    try {

      if (!auth.currentUser) {
        Alert.alert('Erro', 'Usuário não identificado');
        return;
      }

      await updatePassword(auth.currentUser, novaSenha);
      Alert.alert('Sucesso!', 'Senha redefinida com sucesso!\n\nRedirecionando em 5 segundos...');

      setTimeout(() => {
        navigation.goBack();
      }, 5000);

    } catch (error: any) {
      
      console.error('Erro ao atualizar senha:', error);

      if (error.code === 'auth/requires-recent-login') {
        Alert.alert('Erro', 'Faça login novamente antes de alterar a senha');
      } else {
        Alert.alert('Erro', 'Não foi possível redefinir a senha');
      }

    } finally {
      setLoading(false);
    }

  };

  return (
    
    <View style={styles.container}>
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          
          <Text style={styles.title}>Redefinir senha</Text>
          <View style={{ width: 40 }} />

        </View>

        <View style={styles.content}>
          <View style={styles.inputGroup}>
            
            <Text style={styles.label}>Senha atual</Text>
            
            <View style={styles.inputContainer}>
              
              <TextInput style={[ styles.input, errors.senhaAtual ? styles.inputError : senhaAtualVerificada ? styles.inputSuccess : null ]}
              placeholder="Digite sua senha atual" placeholderTextColor={temaEscuro ? '#a4b9fe' : '#8581FF'} value={senhaAtual}
              onChangeText={handleSenhaAtualChange} secureTextEntry={!mostrarSenha} editable={!senhaAtualVerificada && !loading} />

              {senhaAtual && !senhaAtualVerificada && (
                
                <TouchableOpacity style={styles.verifyButton} onPress={verificarSenhaAtual} disabled={loading || !senhaAtual.trim()}>
                  
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.verifyButtonText}>Verificar</Text>
                  )}

                </TouchableOpacity>

              )}

            </View>

            {errors.senhaAtual ? (
              <Text style={styles.errorText}>{errors.senhaAtual}</Text>
            ) : null}
            {senhaAtualVerificada ? (
              <Text style={styles.successText}>✓ Senha verificada</Text>
            ) : null}

          </View>

          {senhaAtualVerificada && (
            
            <>

              <View style={styles.inputGroup}>
                
                <Text style={styles.label}>Nova senha</Text>
                
                <View style={styles.passwordContainer}>
                  
                  <TextInput style={[ styles.passwordInput, errors.novaSenha ? styles.inputError : null]} placeholder="Digite a nova senha"
                  placeholderTextColor={temaEscuro ? '#a4b9fe' : '#8581FF'} value={novaSenha} onChangeText={handleNovaSenhaChange} secureTextEntry={!mostrarSenha} />

                  <TouchableOpacity style={styles.eyeButton} onPress={() => setMostrarSenha(!mostrarSenha)}>
                    <Text style={styles.eyeText}> {mostrarSenha ? '👁️' : '👁️‍🗨️'} </Text>
                  </TouchableOpacity>

                </View>

                {errors.novaSenha ? (
                  <Text style={styles.errorText}>{errors.novaSenha}</Text>
                ) : null}

              </View>

              <View style={styles.inputGroup}>
                
                <Text style={styles.label}>Confirmar nova senha</Text>
                
                <View style={styles.passwordContainer}>
                  
                  <TextInput style={[ styles.passwordInput, errors.confirmarSenha ? styles.inputError : null ]} placeholder="Confirme a nova senha"
                  placeholderTextColor={temaEscuro ? '#a4b9fe' : '#8581FF'} value={confirmarSenha} onChangeText={handleConfirmarSenhaChange} secureTextEntry={!mostrarSenha} />
                  
                  <TouchableOpacity style={styles.eyeButton} onPress={() => setMostrarSenha(!mostrarSenha)}>
                    <Text style={styles.eyeText}> {mostrarSenha ? '👁️' : '👁️‍🗨️'} </Text>
                  </TouchableOpacity>

                </View>

                {errors.confirmarSenha ? (
                  <Text style={styles.errorText}>{errors.confirmarSenha}</Text>
                ) : null}

              </View>

              <View style={styles.infoBox}>
                <Image style={styles.infoIcon} source={require('../../assets/lampada.png')} />
                <Text style={styles.infoText}> Use pelo menos 6 caracteres. </Text>
              </View>

            </>
          )}

          <View style={styles.buttonContainer}>
            
            <TouchableOpacity style={[styles.cancelButton, loading && styles.buttonDisabled]} onPress={() => navigation.goBack()} disabled={loading}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            {senhaAtualVerificada && (
              
              <TouchableOpacity style={[ styles.saveButton, (!formValido() || loading) && styles.buttonDisabled]} onPress={salvarNovaSenha} disabled={!formValido() || loading}>
                
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Salvar</Text>
                )}

              </TouchableOpacity>

            )}

          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (temaEscuro: boolean) => StyleSheet.create({
  
  container: {
    flex: 1,
    backgroundColor: temaEscuro ? '#000824' : '#dadafa',
  },

  scrollContent: {
    flexGrow: 1,
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
    alignItems: 'center',
  },

  backButtonText: {
    color: '#FFF',
    fontSize: 24,
    fontFamily: 'Alatsi_400Regular',
  },

  title: {
    color: '#FFF',
    fontSize: 22,
    fontFamily: 'Alatsi_400Regular',
  },

  content: {
    flex: 1,
    padding: 20,
  },

  inputGroup: {
    marginBottom: 20,
  },

  label: {
    fontSize: 16,
    color: temaEscuro ? '#dadafa' : '#0f248d',
    marginBottom: 8,
    fontFamily: 'Cabin_700Bold',
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  input: {
    flex: 1,
    backgroundColor: temaEscuro ? '#00124d' : '#FFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: temaEscuro ? '#dadafa' : '#333',
    borderWidth: 1,
    borderColor: temaEscuro ? '#00208a' : '#aab3ff',
    fontFamily: 'Inter_400Regular',
  },

  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: temaEscuro ? '#00124d' : '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: temaEscuro ? '#00208a' : '#aab3ff',
  },

  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: temaEscuro ? '#dadafa' : '#333',
    fontFamily: 'Inter_400Regular',
  },

  eyeButton: {
    paddingHorizontal: 16,
  },

  eyeText: {
    fontSize: 20,
  },

  inputError: {
    borderColor: '#F44336',
    borderWidth: 2,
  },

  inputSuccess: {
    borderColor: '#00d2a8',
    borderWidth: 2,
  },

  errorText: {
    color: temaEscuro ? '#ff6b8b' : '#F44336',
    fontSize: 14,
    marginTop: 5,
    fontFamily: 'Inter_400Regular',
  },

  successText: {
    color: temaEscuro ? '#00d2a8' : '#008f72',
    fontSize: 14,
    marginTop: 5,
    fontFamily: 'Inter_400Regular',
  },

  verifyButton: {
    backgroundColor: '#0f248d',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  verifyButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Cabin_700Bold',
  },

  infoBox: {
    flexDirection: 'row',
    backgroundColor: temaEscuro ? '#a4b9fe' : 'rgba(15, 36, 141, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
    marginBottom: 30,
    alignItems: 'center',
  },
  
  infoIcon: {
    width: 23,
    height: 23,
    marginRight: 5
  },

  infoText: {
    flex: 1,
    fontSize: 14,
    color: temaEscuro ? '#000824' : '#0f248d',
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },

  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },

  cancelButton: {
    flex: 1,
    backgroundColor: temaEscuro ? '#00124d' : '#FFF',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: temaEscuro ? '#00208a' : '#aab3ff',
  },

  cancelButtonText: {
    color: temaEscuro ? '#dadafa' : '#666',
    fontSize: 16,
    fontFamily: 'Cabin_700Bold',
  },

  saveButton: {
    flex: 1,
    backgroundColor: '#0f248d',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },

  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Cabin_700Bold',
  },

  buttonDisabled: {
    opacity: 0.5,
  },

});