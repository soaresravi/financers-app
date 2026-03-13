import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Modal } from 'react-native';

import { useAuth } from '../contexts/AuthContext'; 
import { useTheme } from '../contexts/ThemeContext';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { auth, db } from '../services/firebase';
import { doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { verifyBeforeUpdateEmail, updateProfile, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

type RootStackParamList = {
  Settings: undefined;
  Login: undefined;
};

type NavigationProps = NativeStackNavigationProp<RootStackParamList>;

export default function DadosConta() {

  const navigation = useNavigation<NavigationProps>();
  const { user, signOut, updateUser } = useAuth();
  
  const { temaEscuro } = useTheme();
  const styles = getStyles(temaEscuro);

  const [nome, setNome] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [senhaAtual, setSenhaAtual] = useState('');
  const [showExcluirModal, setShowExcluirModal] = useState(false);
  const [showSenhaModal, setShowSenhaModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const [errors, setErrors] = useState({
    nome: '',
    email: '',
    senha: ''
  });

  const validarEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  useEffect(() => {
    
    const sincronizarEmail = async () => {
      
      if (!auth.currentUser || !user?.uid) {
        console.log('Aguardando usuário...');
        return;
      }
  
      try {
        
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        let firestoreEmail = ''; 
        
        if (userSnap.exists()) {
          
          firestoreEmail = userSnap.data().email;
          console.log('Email no Firestore (direto):', firestoreEmail);
          
          setEmail(firestoreEmail || '');
          
          if (updateUser && firestoreEmail !== user.email) {
            updateUser({ ...user, email: firestoreEmail });
          }

        }

        await auth.currentUser.reload();
        const emailNoAuth = auth.currentUser.email;
        
        console.log('Email no Auth:', emailNoAuth);

        if (emailNoAuth && emailNoAuth !== firestoreEmail) {
          
          console.log('Email diferente! Atualizando Firestore...');
          
          await updateDoc(userRef, {
            email: emailNoAuth,
            atualizadoEm: new Date()
          });
  
          setEmail(emailNoAuth);
          
          if (updateUser) {
            updateUser({ ...user, email: emailNoAuth });
          }

        }
        
      } catch (error) {
        console.error('Erro ao sincronizar email:', error);
      }

    };
  
    sincronizarEmail();

  }, [user?.uid]);

  const handleSalvar = async () => {

    if (!nome.trim()) {
      setErrors(prev => ({ ...prev, nome: 'Nome é obrigatório' }));
      return;
    }

    if (!email.trim()) {
      setErrors(prev => ({ ...prev, email: 'Email é obrigatório' }));
      return;
    }

    if (!validarEmail(email)) {
      setErrors(prev => ({ ...prev, email: 'Email inválido' }));
      return;
    }

    setLoading(true);

    try {

      if (!auth.currentUser || !user?.uid) return;
  
      if (nome !== user.name) {
        await updateProfile(auth.currentUser, { displayName: nome });
      }
  
      let linkEnviado = false;

      if (email !== user.email) {
        await verifyBeforeUpdateEmail(auth.currentUser, email);
        linkEnviado = true;
      }
  
      const userRef = doc(db, 'users', user.uid);
      const updates: any = { name: nome, atualizadoEm: new Date() };
      if (!linkEnviado) updates.email = email;
  
      await updateDoc(userRef, updates);
  
      if (updateUser) {
        updateUser({ ...user, name: nome, email: linkEnviado ? user.email : email });
      }
  
      if (linkEnviado) {
         
        console.log('Email enviado com sucesso');
        Alert.alert('E-mail enviado', `Verifique a caixa de entrada de ${email} para confirmar a alteração.`);
        setEmail(user.email ?? '');
      
      } else {
        console.log('Dados atualizados. Por favor, faça login novamente.');
        Alert.alert('Sucesso', 'Dados atualizados!');
      }
        
      setEditing(false);

    } catch (error: any) {
      
      console.error('Erro ao atualizar dados: ', error);

      if (error.code === 'auth/email-already-in-use') {
        setErrors(prev => ({ ...prev, email: 'Esse email já está em uso' }));
      } else if (error.code === 'auth/invalid-email') {
        setErrors(prev => ({ ...prev, email: 'Email inválido' })); 
      } else if (error.code === 'auth/requires-recent-login') {
        
        console.log('Faça login novamente para alterar o email')
        Alert.alert('Atenção!', 'Para alterar o email, faça login novamente antes.\n\nRedirecionando em 3, 2, 1...');
        
        setTimeout(async () => {
          await signOut();
          navigation.reset({ index: 0, routes: [{ name: 'Login' }]});
        }, 3000);
    
      } else {
        Alert.alert('Erro', 'Não foi possível atualizar os dados');
      }

    } finally {
      setLoading(false);
      setEditing(false);
    }

  };

  const confirmarExclusao = () => {
    setShowExcluirModal(true);
  };

  const excluirConta = async () => {

    if (!auth.currentUser || !user?.uid) {
      Alert.alert('Erro', 'Usuário não identificado');
      return;
    }

    if (!senhaAtual) {
      setShowSenhaModal(true);
      return;
    }

    setLoading(true);

    try {
      
      const credential = EmailAuthProvider.credential(user.email!, senhaAtual);
      await reauthenticateWithCredential(auth.currentUser, credential);

      await deleteDoc(doc(db, 'users', user.uid));
      await deleteUser(auth.currentUser);

      setShowExcluirModal(false);
      setShowSenhaModal(false);
      
      Alert.alert('Sua conta foi excluída com sucesso.\n\nRedirecionando em 3 segundos...');

      setTimeout(async () => {
        await signOut();
        navigation.reset({ index: 0, routes: [{ name: 'Login' }]});
      }, 3000);

    } catch (error: any) {
    
      console.error('Erro ao excluir conta:', error);

      if (error.code === 'auth/wrong-password') {
        setErrors(prev => ({ ...prev, senha: 'Senha incorreta' }));
      } else if (error.code === 'auth/requires-recent-login') {
        Alert.alert('Erro', 'Faça login novamente para excluir a conta');
      } else {
        Alert.alert('Erro', 'Não foi possível excluir a conta');
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

          <Text style={styles.title}>Dados da conta</Text>
          <View style={{ width: 40 }} />

        </View>

        <View style={styles.content}>
          
          <View style={styles.inputGroup}>
            
            <Text style={styles.label}>Nome</Text>
            
            <TextInput style={[ styles.input, errors.nome ? styles.inputError : null, !editing && styles.inputDisabled]} placeholder=
            "Seu nome" placeholderTextColor={temaEscuro ? '#a4b9fe' : '#8581FF'} value={nome} onChangeText={(text) => { setNome(text);
            setErrors(prev => ({ ...prev, nome: '' })); }} editable={editing && !loading} />
            
            {errors.nome ? (
              <Text style={styles.errorText}>{errors.nome}</Text>
            ) : null}

          </View>

          <View style={styles.inputGroup}>
            
            <Text style={styles.label}>Email</Text>
            
            <TextInput style={[ styles.input, errors.email ? styles.inputError : null, !editing && styles.inputDisabled ]} placeholder=
            "seu@email.com" placeholderTextColor={temaEscuro ? '#a4b9fe' : '#8581FF'} value={email} onChangeText={(text) => { setEmail
            (text); setErrors(prev => ({ ...prev, email: '' })); }} keyboardType="email-address" autoCapitalize="none" editable={editing && !loading} />
            
            {errors.email ? (
              <Text style={styles.errorText}>{errors.email}</Text>
            ) : null}

          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}> Enviaremos um link de verificação para alterar seu email. Após confirmar, é necessário fazer login novamente para os dados serem atualizados. </Text>
          </View>

          <View style={styles.buttonContainer}>
            
            {!editing ? (
              
              <TouchableOpacity style={[styles.editButton]} onPress={() => setEditing(true)}>
                <Text style={styles.editButtonText}>Editar dados</Text>
              </TouchableOpacity>

            ) : (

              <>
                
                <TouchableOpacity style={[styles.cancelButton, loading && styles.buttonDisabled]} onPress={() => { setEditing(false);
                setNome(user?.name || ''); setEmail(user?.email || ''); setErrors({ nome: '', email: '', senha: '' }); }} disabled={loading}>
                  
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                
                </TouchableOpacity>

                <TouchableOpacity style={[styles.saveButton, loading && styles.buttonDisabled]} onPress={handleSalvar} disabled={loading}>
                  
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Salvar</Text>
                  )}

                </TouchableOpacity>

              </>

            )}
            
          </View>

          <TouchableOpacity style={styles.linkContainer} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}> Fez a verificação de conta no seu email? <Text style={styles.linkBold}>Faça login</Text> </Text>
          </TouchableOpacity>

        </View>

      </ScrollView>

      <View style={styles.footer}>
        
        <TouchableOpacity style={styles.dangerButton} onPress={confirmarExclusao}>
          <Text style={styles.dangerButtonText}>Excluir conta</Text>
        </TouchableOpacity>
        
      </View>

      <Modal visible={showExcluirModal} transparent animationType="fade" onRequestClose={() => { setShowExcluirModal(false); setSenhaAtual('');
      setErrors(prev => ({ ...prev, senha: '' })); }}>
        
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            <Text style={styles.modalIcon}>⚠️</Text>
            <Text style={styles.modalTitle}>Excluir conta</Text>       
            <Text style={styles.modalText}> Tem certeza que deseja excluir sua conta permanentemente?</Text>

            <View style={styles.modalButtons}>
              
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonCancel]} onPress={() => { setShowExcluirModal(false);
              setSenhaAtual(''); setErrors(prev => ({ ...prev, senha: '' })); }}>
                <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.modalButton, styles.modalButtonConfirm]} onPress={() => { setShowExcluirModal(false);
              setShowSenhaModal(true); }}>
                <Text style={[styles.modalButtonTextConfirm]}>Continuar</Text>
              </TouchableOpacity>

            </View>

          </View>
        </View>
      </Modal>y

      <Modal visible={showSenhaModal} transparent animationType="slide" onRequestClose={() => { setShowSenhaModal(false); setSenhaAtual('');
      setErrors(prev => ({ ...prev, senha: '' })); }}>
        
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.modalSenhaContent]}>     
            <View style={styles.modalSenhaHeader}>
              
              <Text style={[styles.modalTitle, { marginBottom: 5, marginTop: 10, marginLeft: '20%' }]}>Confirme sua senha</Text>
              
              <TouchableOpacity onPress={() => { setShowSenhaModal(false); setSenhaAtual(''); setErrors(prev => ({ ...prev, senha: '' })); }}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>

            </View>

            <Text style={styles.modalSenhaText}> Digite sua senha para confirmar a exclusão da conta </Text>

            <View style={styles.passwordContainer}>
              
              <TextInput style={[ styles.passwordInput, errors.senha ? styles.inputError : null ]} placeholder="Digite sua senha"
              placeholderTextColor={temaEscuro ? '#a4b9fe' : '#8581FF'} value={senhaAtual}
              
              onChangeText={(text) => {
                setSenhaAtual(text);
                setErrors(prev => ({ ...prev, senha: '' }));
              }}
              
              secureTextEntry={!mostrarSenha} />
              
              <TouchableOpacity style={styles.eyeButton} onPress={() => setMostrarSenha(!mostrarSenha)}>
                <Text style={styles.eyeText}> {mostrarSenha ? '👁️' : '👁️‍🗨️'} </Text>
              </TouchableOpacity>

            </View>

            {errors.senha ? (
              <Text style={styles.errorText}>{errors.senha}</Text>
            ) : null}

            <View style={styles.modalButtons}>
              
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonCancel, { marginLeft: 0 }]}
              
              onPress={() => {
                setShowSenhaModal(false);
                setSenhaAtual('');
                setErrors(prev => ({ ...prev, senha: '' }));
              }}
            
              disabled={loading}>

                <Text style={[styles.modalButtonTextCancel, { fontSize: 18}]}>Cancelar</Text>

              </TouchableOpacity>

              <TouchableOpacity style={[ styles.modalButton, styles.modalButtonConfirm, (!senhaAtual.trim() || loading) && styles.buttonDisabled]}
              onPress={excluirConta} disabled={!senhaAtual.trim() || loading}>

                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={[styles.modalButtonTextConfirm, { textAlign: 'center', fontSize: 14, color: temaEscuro ? '#dadafa' : '#FFF'}]}>Excluir permanentemente</Text>
                )}

              </TouchableOpacity>

            </View>
          </View>
        </View>
      </Modal>
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

  input: {
    backgroundColor: temaEscuro ? '#00124d' : '#FFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: temaEscuro ? '#dadafa' : '#333',
    borderWidth: 1,
    borderColor: temaEscuro ? '#00208a' : '#aab3ff',
    fontFamily: 'Inter_400Regular',
  },

  inputDisabled: {
    opacity: 0.6,
    backgroundColor: temaEscuro ? '#000c33' : '#F0F0F0',
  },

  inputError: {
    borderColor: '#F44336',
    borderWidth: 2,
  },

  errorText: {
    color: temaEscuro ? '#ff6b8b' : '#F44336',
    fontSize: 14,
    marginTop: 5,
    fontFamily: 'Inter_400Regular',
  },

  infoBox: {
    flexDirection: 'row',
    backgroundColor: temaEscuro ? '#a4b9fe' : 'rgba(15, 36, 141, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginVertical: 20,
    alignItems: 'center',
  },

  infoText: {
    flex: 1,
    fontSize: 14,
    color: temaEscuro ? '#000824' : '#0f248d',
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
    textAlign: 'justify'
  },

  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 30,
  },

  editButton: {
    flex: 1,
    backgroundColor: '#0f248d',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },

  editButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Cabin_700Bold',
  },

  cancelButton: {
    flex: 1,
    backgroundColor: temaEscuro ? '#00124d' : '#FFF',
    borderRadius: 12,
    padding: 16,
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
    padding: 16,
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

  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: temaEscuro ? '#740618' : '#F44336',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
  },

  dangerButtonText: {
    color: temaEscuro ? '#fee7ea' : '#FFF',
    fontSize: 16,
    fontFamily: 'Cabin_700Bold',
  },

  footer: {
    paddingHorizontal: 20,
    paddingBottom: 5,
    paddingTop: 10,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    backgroundColor: temaEscuro ? '#00155c' : '#FFF',
    borderRadius: 20,
    padding: 25,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
  },
  
  modalSenhaContent: {
    padding: 0,
    overflow: 'hidden',
  },

  modalSenhaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    width: '100%',
  },

  modalSenhaText: {
    fontSize: 16,
    color: temaEscuro ? '#dadafa' : '#333',
    textAlign: 'center',
    marginLeft: 20,
    marginRight: 20,
    marginTop: 10,
    paddingBottom: 20,
    fontFamily: 'Inter_400Regular',
  },

  modalCloseText: {
    fontSize: 24,
    color: temaEscuro ? '#dadafa' : '#0f248d',
  },

  modalIcon: {
    fontSize: 48,
    marginBottom: 15,
  },

  modalTitle: {
    fontSize: 22,
    fontFamily: 'Alatsi_400Regular',
    color: temaEscuro ? '#dadafa' : '#0f248d',
    marginBottom: 15,
  },

  modalText: {
    fontSize: 16,
    color: temaEscuro ? '#dadafa' : '#333',
    textAlign: 'center',
    marginBottom: 25,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
  },

  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },

  modalButtonCancel: {
    backgroundColor: temaEscuro ? '#740618' : '#0f248d',
    marginRight: 10,
  },

  modalButtonTextCancel: {
    color: temaEscuro ? '#fee7ea' : '#FFF',
    fontSize: 16,
    fontFamily: 'Cabin_700Bold',
  },

  modalButtonConfirm: {
    backgroundColor: temaEscuro ? '#000824' : '#dadafa',
    marginLeft: 10,
    borderWidth: 1,
    borderColor: temaEscuro ? '#001b7a' : '#aab3ff',
  },

  modalButtonDanger: {
    backgroundColor: temaEscuro ? '#ff6b8b' : '#F44336',
    marginLeft: 10,
  },

  modalButtonTextConfirm: {
    color: temaEscuro ? '#dadafa' : '#666',
    fontSize: 16,
    fontFamily: 'Cabin_700Bold',
  },

  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: temaEscuro ? '#00124d' : '#FFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: temaEscuro ? '#00208a' : '#aab3ff',
    marginHorizontal: 20,
    marginBottom: 20,
  },

  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 14,
    color: temaEscuro ? '#dadafa' : '#333',
    fontFamily: 'Inter_400Regular',
  },

  eyeButton: {
    paddingHorizontal: 16,
  },

  eyeText: {
    fontSize: 20,
  },

  linkContainer: {
    alignItems: 'center',
    marginBottom: 10
  },

  linkText: {
    fontSize: 13,
    color: temaEscuro ? '#dadafa' : '#666',
    fontFamily: 'Inter_400Regular',
  },

  linkBold: {
    color: temaEscuro ? '#a4b9fe' : '#0f248d',
    fontFamily: 'Cabin_700Bold',
    textDecorationLine: 'underline',
  },

});