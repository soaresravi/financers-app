import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Alert, Modal } from 'react-native';

import { useAuth } from '../contexts/AuthContext'; 
import { db } from '../services/firebase';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc} from 'firebase/firestore';

interface Meta {
  id: string;
  titulo: string;
  valor: number;
  dataConclusao?: Date | null;
  concluida: boolean;
  criadoEm: Date;
}

export default function Goals() {

  const { user } = useAuth();

  const [metas, setMetas] = useState<Meta[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarInput, setMostrarInput] = useState(false);
  const [novaMetaTitulo, setNovaMetaTitulo] = useState('');
  const [novaMetaValor, setNovaMetaValor] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [metaParaExcluir, setMetaParaExcluir] = useState<Meta | null>(null);

  useEffect(() => {
    carregarMetas();
  }, [user]);

  const carregarMetas = async () => {

    if (!user?.uid) return;

    try {

      setLoading(true);

      const metasRef = collection(db, 'users', user.uid, 'metas');
      const snapshot = await getDocs(metasRef);

      const metasCarregadas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        criadoEm: doc.data().criadoEm?.toDate?.() || new Date(),
      })) as Meta[];

      metasCarregadas.sort((a, b) => {

        if (a.concluida === b.concluida) {
          return b.criadoEm.getTime() - a.criadoEm.getTime();
        }

        return a.concluida ? 1 : -1;

      });

      setMetas(metasCarregadas);
    
    } catch (error) {
      
      console.error('Erro ao carregar metas:', error);
      Alert.alert('Erro', 'Não foi possível carregar suas metas');
   
    } finally {
      setLoading(false);
    }

  };

  const adicionarMeta = async () => {
    
    if (!user?.uid) return;

    if (!novaMetaTitulo.trim()) {
      Alert.alert('Atenção', 'Digite um título para a meta');
      return;
    }

    const valorNumerico = novaMetaValor ? parseFloat(novaMetaValor.replace(',', '.')) : 0;

    try {

      setSalvando(true);
      const metasRef = collection(db, 'users', user.uid, 'metas');

      const novaMeta = {
        titulo: novaMetaTitulo.trim(),
        valor: valorNumerico,
        concluida: false,
        criadoEm: new Date(),
      };

      const docRef = await addDoc(metasRef, novaMeta);

      setMetas(prev => [{
        id: docRef.id,
        ...novaMeta,
      }, ...prev]);

      setNovaMetaTitulo('');
      setNovaMetaValor('');
      setMostrarInput(false);

    } catch (error) {

      console.error('Erro ao adicionar meta:', error);
      Alert.alert('Erro', 'Não foi possível adicionar a meta');

    } finally {
      setSalvando(false);
    }

  };

  const toggleMeta = async (meta: Meta) => {

    if (!user?.uid) return;

    try {

      const metasRef = doc(db, 'users', user.uid, 'metas', meta.id);

      await updateDoc(metasRef, {
        concluida: !meta.concluida,
        dataConclusao: !meta.concluida ? new Date() : null,
      });

      setMetas(prev => prev.map(m => m.id === meta.id ? { ...m, concluida: !m.concluida, dataConclusao: !m.concluida ? new Date() : null}
      : m ).sort((a, b) => {
        if (a.concluida === b.concluida) return 0;
        return a.concluida ? 1 : -1;
      }));

    } catch (error) {
      console.error('Erro ao atualizar meta:', error);
      Alert.alert('Erro', 'Não foi possível atualizar a meta');
    }

  };

  const confirmarExclusao = (meta: Meta) => {
    setMetaParaExcluir(meta);
    setShowDeleteModal(true);
  };

  const excluirMeta = async () => {
    
    if (!user?.uid || !metaParaExcluir) return;

    try {

      const metaRef = doc(db, 'users', user.uid, 'metas', metaParaExcluir.id);
      await deleteDoc(metaRef);
      setMetas(prev => prev.filter(m => m.id !== metaParaExcluir.id));
      setShowDeleteModal(false);
      setMetaParaExcluir(null);

    } catch (error) {
      console.error('Erro ao excluir meta:', error);
      Alert.alert('Erro', 'Não foi possível excluir a meta');
    }
  
  };

  const formatarValor = (valor: number) => {
    if (valor === 0) return '';
    return `R$ ${valor.toFixed(2).replace('.', ',')}`;
  };

  const formatarParaDinheiro = (text: string): string => {
    let numbers = text.replace(/\D/g, '');
    if (numbers === '') return '';
    const valor = parseInt(numbers, 10) / 100;
    return valor.toFixed(2).replace('.', ',');
  };

  if (loading) {
   
    return (
    
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#dadafa" />
      <Text style={styles.loadingText}>Carregando metas...</Text>
    </View>

    );
  }

  return (
  
  <View style={styles.container}>

    <View style={styles.header}>    
      <Text style={styles.title}>🎯 Metas</Text>
      <Text style={styles.subtitle}> {metas.filter(m => m.concluida).length}/{metas.length} concluídas </Text>
    </View>

    {!mostrarInput ? (
      
      <TouchableOpacity style={styles.botaoAdicionar} onPress={() => setMostrarInput(true)}>
        <Text style={styles.botaoAdicionarIcon}>+</Text>
        <Text style={styles.botaoAdicionarText}>Nova meta</Text>
      </TouchableOpacity>

    ) : (
     
      <View style={styles.inputContainer}>
        
        <Text style={styles.inputLabel}>📝 Título da meta</Text>
        
        <TextInput style={styles.input} placeholder="Ex: Juntar 10 mil reais" placeholderTextColor="#8581FF" value={novaMetaTitulo}
        onChangeText={setNovaMetaTitulo} autoFocus />
 
        <Text style={styles.inputLabel}>💰 Valor (opcional)</Text>
       
        <View style={styles.inputValorContainer}>
          
          <Text style={styles.inputValorSimbolo}>R$</Text>
         
          <TextInput style={styles.inputValor} placeholder="0,00" placeholderTextColor="#8581FF" value={novaMetaValor} onChangeText={(
          text) => setNovaMetaValor(formatarParaDinheiro(text))} keyboardType="numeric" />

        </View>

        <View style={styles.inputBotoes}>
          
          <TouchableOpacity style={styles.botaoCancelar} onPress={() => {
            setMostrarInput(false);
            setNovaMetaTitulo('');
            setNovaMetaValor('');
          }}>

            <Text style={styles.botaoCancelarText}>Cancelar</Text>

          </TouchableOpacity>

          <TouchableOpacity style={[styles.botaoSalvar, salvando && styles.botaoSalvarDisabled]} onPress={adicionarMeta} disabled={salvando}>
            
            {salvando ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.botaoSalvarText}>Adicionar</Text>
            )}

          </TouchableOpacity>

        </View>
      </View>
    )}

    <ScrollView style={styles.listaContainer} showsVerticalScrollIndicator={false}>
      
      {metas.length === 0 ? (
        
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎯</Text>
          <Text style={styles.emptyTitle}>Nenhuma meta ainda</Text>
          <Text style={styles.emptyText}> Adicione sua primeira meta financeira! </Text>
        </View>

      ) : (
        
        metas.map((meta) => (
          
          <View key={meta.id} style={[ styles.metaItem, meta.concluida && styles.metaItemConcluida ]}>
            
            <TouchableOpacity style={styles.metaCheckbox} onPress={() => toggleMeta(meta)}>
            
              <View style={[ styles.checkbox, meta.concluida && styles.checkboxConcluido]}>
               
                {meta.concluida && (
                  <Text style={styles.checkboxIcon}>✓</Text>
                )}

              </View>
            </TouchableOpacity>

            <View style={styles.metaInfo}>
              
              <Text style={[ styles.metaTitulo, meta.concluida && styles.metaTituloConcluida ]}> {meta.titulo} </Text>
              
              {meta.valor > 0 && (     
                <Text style={[ styles.metaValor, meta.concluida && styles.metaValorConcluida ]}> {formatarValor(meta.valor)} </Text>
              )}

              {meta.concluida && meta.dataConclusao && (
                
                <Text style={styles.metaData}> ✓ Concluída em {meta.dataConclusao.toLocaleDateString('pt-BR')} </Text>
              )}

            </View>

            <TouchableOpacity style={styles.botaoExcluir} onPress={() => confirmarExclusao(meta)}>
              <Text style={styles.botaoExcluirIcon}>🗑️</Text>
            </TouchableOpacity>

          </View>
        ))
      )}
      
      <View style={styles.bottomSpacing} />

    </ScrollView>

    <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => {
      setShowDeleteModal(false);
      setMetaParaExcluir(null);
    }}>
        
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
            
          <Text style={styles.modalTitle}>Excluir meta</Text>
          <Text style={styles.modalText}> Tem certeza que deseja excluir a meta: </Text>
          <Text style={styles.modalMetaNome}> "{metaParaExcluir?.titulo}" </Text>
            
          {metaParaExcluir && metaParaExcluir.valor > 0 && (
            <Text style={styles.modalMetaValor}> {formatarValor(metaParaExcluir.valor)} </Text>
          )}
            
          <Text style={styles.modalWarning}> ⚠️ Esta ação não pode ser desfeita </Text>

          <View style={styles.modalButtons}>
            
            <TouchableOpacity style={styles.modalCancelButton} onPress={() => {
              setShowDeleteModal(false);
              setMetaParaExcluir(null);
            }}>
              
              <Text style={styles.modalCancelText}>Cancelar</Text>
            
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalConfirmButton} onPress={excluirMeta}>
              <Text style={styles.modalConfirmText}>Excluir</Text>
            </TouchableOpacity>

          </View>
          
        </View>
      </View>
    </Modal>
  </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#dadafa',
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: '#dadafa',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#0f248d',
    fontFamily: 'Inter_400Regular',
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

  subtitle: {
    fontSize: 16,
    color: '#0f248d',
    fontFamily: 'Cabin_400Regular',
  },

  botaoAdicionar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f248d',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 12,
    justifyContent: 'center',
  },

  botaoAdicionarIcon: {
    fontSize: 24,
    color: '#FFF',
    marginRight: 8,
  },

  botaoAdicionarText: {
    fontSize: 16,
    color: '#FFF',
    fontFamily: 'Cabin_700Bold',
  },

  inputContainer: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
  },

  inputLabel: {
    fontSize: 14,
    color: '#0f248d',
    marginBottom: 8,
    fontFamily: 'Cabin_700Bold',
  },

  input: {
    backgroundColor: '#F8F8FF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#aab3ff',
    marginBottom: 15,
    fontFamily: 'Inter_400Regular',
  },

  inputValorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#aab3ff',
    marginBottom: 20,
  },

  inputValorSimbolo: {
    paddingLeft: 12,
    fontSize: 16,
    color: '#0f248d',
    fontFamily: 'Cabin_700Bold',
  },

  inputValor: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#333',
    fontFamily: 'Alatsi_400Regular',
  },

  inputBotoes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  botaoCancelar: {
    flex: 1,
    backgroundColor: '#F8F8FF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#F44336',
  },

  botaoCancelarText: {
    color: '#F44336',
    fontSize: 16,
    fontFamily: 'Cabin_700Bold',
  },

  botaoSalvar: {
    flex: 1,
    backgroundColor: '#0f248d',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },

  botaoSalvarDisabled: {
    opacity: 0.6,
  },

  botaoSalvarText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Cabin_700Bold',
  },

  listaContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },

  emptyIcon: {
    fontSize: 60,
    color: '#0f248d',
    marginBottom: 20,
  },

  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Cabin_700Bold',
    color: '#0f248d',
    marginBottom: 8,
  },

  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },

  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },

  metaItemConcluida: {
    opacity: 0.8,
    backgroundColor: '#F8F8FF',
  },

  metaCheckbox: {
    marginRight: 12,
  },

  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#0f248d',
    justifyContent: 'center',
    alignItems: 'center',
  },

  checkboxConcluido: {
    backgroundColor: '#0f248d',
    borderColor: '#0f248d',
  },

  checkboxIcon: {
    fontSize: 16,
    color: '#FFF',
  },

  metaInfo: {
    flex: 1,
  },

  metaTitulo: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
    fontFamily: 'Cabin_700Bold',
  },

  metaTituloConcluida: {
    textDecorationLine: 'line-through',
    color: '#999',
  },

  metaValor: {
    fontSize: 14,
    color: '#00d2a8',
    fontFamily: 'Alatsi_400Regular',
  },

  metaValorConcluida: {
    color: '#999',
  },

  metaData: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontFamily: 'Inter_400Regular',
  },

  botaoExcluir: {
    padding: 8,
  },

  botaoExcluirIcon: {
    fontSize: 18,
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

  modalTitle: {
    fontSize: 22,
    fontFamily: 'Alatsi_400Regular',
    color: '#F44336',
    marginBottom: 15,
  },

  modalText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
    fontFamily: 'Inter_400Regular',
  },

  modalMetaNome: {
    fontSize: 18,
    fontFamily: 'Cabin_700Bold',
    color: '#0f248d',
    textAlign: 'center',
    marginVertical: 10,
  },

  modalMetaValor: {
    fontSize: 16,
    fontFamily: 'Alatsi_400Regular',
    color: '#00d2a8',
    marginBottom: 15,
  },

  modalWarning: {
    fontSize: 14,
    color: '#F44336',
    marginBottom: 25,
    fontFamily: 'Inter_400Regular',
  },

  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },

  modalCancelButton: {
    flex: 1,
    backgroundColor: '#dadafa',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#dadaff',
  },

  modalCancelText: {
    color: '#666',
    fontSize: 16,
    fontFamily: 'Cabin_700Bold',
  },

  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#F44336',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginLeft: 10,
  },

  modalConfirmText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Cabin_700Bold',
  },

})