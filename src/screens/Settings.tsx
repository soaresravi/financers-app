import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Image } from 'react-native';

import { useAuth } from '../contexts/AuthContext'; 

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  MainTabs: undefined;
  Login: undefined;
  Settings: undefined;
};

type NavigationProps = NativeStackNavigationProp<RootStackParamList>;

export default function Settings() {
  
  const navigation = useNavigation<NavigationProps>();
  const  { signOut } = useAuth();

  const [showSairModal, setShowSairModal] = useState(false);
  const [showNoturnoModal, setShowNoturnoModal] = useState(false);
  const [temaEscuro, setTemaEscuro] = useState(false);

  const confirmarSair = async () => {

    setShowSairModal(false);

    setTimeout( async () => {
      
      await signOut();

      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }]
      });
      
    }, 100);

  };

  return (
    
    <View style={styles.container}>

      <View style={styles.header}>
        <Text style={styles.title}>Configurações</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

        <TouchableOpacity style={styles.botao}>
          
          <View style={styles.botaoConteudo}>
            <Text style={styles.botaoTexto}>Dados da conta</Text>
          </View>

          <Text style={styles.botaoSeta}>›</Text>

        </TouchableOpacity>

        <TouchableOpacity style={styles.botao}>
          
          <View style={styles.botaoConteudo}>
            <Text style={styles.botaoTexto}>Redefinir senha</Text>
          </View>

          <Text style={styles.botaoSeta}>›</Text>

        </TouchableOpacity>

        <TouchableOpacity style={styles.botao} onPress={() => setShowNoturnoModal(true)}>
          
          <View style={styles.botaoConteudo}>
            <Image source={require('../../assets/modo-escuro.png')} style={styles.iconModoNoturno}/>
            <Text style={styles.botaoTexto}>Modo noturno</Text>
          </View>

          <Text style={styles.botaoSeta}>›</Text>

        </TouchableOpacity>

        <TouchableOpacity style={[styles.botao, styles.botaoSair]} onPress={() => setShowSairModal(true)}>

          <View style={styles.botaoConteudoSair}>
            <Text style={[styles.botaoTexto, styles.botaoSairTexto]}>Sair da conta</Text>
          </View>

        </TouchableOpacity>

        <View style={styles.bottomSpacing} />

      </ScrollView>

      <Modal visible={showSairModal} transparent animationType="fade" onRequestClose={() => setShowSairModal(false)}>
        
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            <Text style={styles.modalTitle}>Sair da conta</Text>
            <Text style={styles.modalText}> Tem certeza que deseja sair do FinanceRS? </Text>

            <View style={styles.modalButtons}>
              
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonConfirmar]} onPress={() => setShowSairModal(false)}>
                <Text style={styles.modalButtonTextConfirmar}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.modalButton, styles.modalButtonCancelar]} onPress={confirmarSair}>
                <Text style={styles.modalButtonTextCancelar}>Sair</Text>
              </TouchableOpacity>

            </View>

          </View>
        </View>

      </Modal>
      
      <Modal visible={showNoturnoModal} transparent animationType="slide" onRequestClose={() => setShowNoturnoModal(false)}>
        
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowNoturnoModal(false)}>
          
          <View style={styles.modalBottomContent}>
            
            <View style={styles.modalBottomHeader}>
              
              <Text style={styles.modalBottomTitle}>Modo noturno</Text>

              <TouchableOpacity onPress={() => setShowNoturnoModal(false)}>
                <Text style={styles.modalBottomClose}>✕</Text>
              </TouchableOpacity>

            </View>
            
            <TouchableOpacity style={[styles.modalBottomOption, !temaEscuro && styles.modalBottomOptionActive]} onPress={() => { setTemaEscuro(false); setShowNoturnoModal(false);}}>
              
              <View style={styles.modalBottomOptionLeft}>
                <Text style={styles.modalBottomOptionIcon}>☀︎</Text>
                <Text style={styles.modalBottomOptionText}>Claro</Text>
              </View>
            
              {!temaEscuro && (
                <Text style={styles.modalBottomOptionCheck}>✓</Text>
              )}

            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.modalBottomOption, temaEscuro && styles.modalBottomOptionActive]} onPress={() => { setTemaEscuro(true); setShowNoturnoModal(false); }}>
              
              <View style={styles.modalBottomOptionLeft}>
                <Text style={styles.modalBottomOptionIcon}>⏾</Text>
                <Text style={styles.modalBottomOptionText}>Escuro</Text>
              </View>
              
              {temaEscuro && (
                <Text style={styles.modalBottomOptionCheck}>✓</Text>
              )}
            
            </TouchableOpacity>

          </View>

        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#dadafa',
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },

  title: {
    fontSize: 28,
    fontFamily: 'Alatsi_400Regular',
    color: '#0f248d',
    marginBottom: 5,
  },

  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },

  botao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#aab3ff',
  },

  botaoConteudo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  botaoConteudoSair: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },

  botaoTexto: {
    fontSize: 16,
    color: '#0f248d',
    fontFamily: 'Cabin_700Bold',
  },

  botaoSeta: {
    fontSize: 22,
    color: '#8581FF',
    fontFamily: 'Inter_400Regular',
  },

  botaoSair: {
    borderColor: '#F44336',
    backgroundColor: '#feebee',
    marginTop: 20,
  },

  botaoSairTexto: {
    color: '#F44336',
    fontFamily: 'Cabin_700Bold',
  },

  bottomSpacing: {
    height: 40,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 25,
    width: '85%',
    alignItems: 'center',
  },

  modalIcon: {
    fontSize: 48,
    marginBottom: 15,
  },

  modalTitle: {
    fontSize: 22,
    fontFamily: 'Alatsi_400Regular',
    color: '#0f248d',
    marginBottom: 10,
  },

  modalText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 25,
    fontFamily: 'Cabin_400Regular',
    lineHeight: 22,
  },

  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },

  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },

  modalButtonCancelar: {
    backgroundColor: '#F8F8FF',
    borderWidth: 1,
    borderColor: '#aab3ff',
    marginLeft: 10,
  },

  modalButtonConfirmar: {
    backgroundColor: '#F44336',
    marginRight: 10,
  },

  modalButtonTextCancelar: {
    color: '#666',
    fontSize: 16,
    fontFamily: 'Cabin_700Bold',
  },

  modalButtonTextConfirmar: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Cabin_700Bold',
  },
  
  modalBottomContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },

  modalBottomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#aab3ff',
  },

  modalBottomTitle: {
    fontSize: 18,
    fontFamily: 'Alatsi_400Regular',
    color: '#0f248d',
  },

  modalBottomClose: {
    fontSize: 20,
    color: '#8581FF',
    fontFamily: 'Cabin_700Bold',
  },

  modalBottomOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 5,
 },

  modalBottomOptionActive: {
    backgroundColor: '#F0EFFF',
  },

  modalBottomOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  modalBottomOptionIcon: {
    fontSize: 22,
    marginRight: 15,
  },

  modalBottomOptionText: {
    fontSize: 16,
    color: '#0f248d',
    fontFamily: 'Cabin_700Bold',
 },

  modalBottomOptionCheck: {
    fontSize: 18,
    color: '#0f248d',
    fontFamily: 'Cabin_700Bold',
  },

  iconModoNoturno: {
    width: 25,
    height: 25,
    marginRight: 10
  }
  
});