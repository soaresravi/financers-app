import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Alert, Modal, Image } from 'react-native';

import DraggableFlatList from 'react-native-draggable-flatlist';
import { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useAuth } from '../contexts/AuthContext'; 
import { useTheme } from '../contexts/ThemeContext';

import { db } from '../services/firebase';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';

interface Meta {
  id: string;
  titulo: string;
  valor: number;
  dataConclusao?: Date | null;
  concluida: boolean;
  criadoEm: Date;
  ordem?: number;
}

export default function Goals() {

  const { user } = useAuth();

  const [metas, setMetas] = useState<Meta[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarInput, setMostrarInput] = useState(false);
  const [novaMetaTitulo, setNovaMetaTitulo] = useState('');
  const [novaMetaValor, setNovaMetaValor] = useState('');
  const [salvando, setSalvando] = useState(false);

  const { temaEscuro } = useTheme();
  const styles = getStyles(temaEscuro);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [metaParaEditar, setMetaParaEditar] = useState<Meta | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [metaParaExcluir, setMetaParaExcluir] = useState<Meta | null>(null);

  useEffect(() => {
    carregarMetas();
  }, [user]);

  const [editForm, setEditForm] = useState({
    titulo: '',
    valor: ''
  });

  const carregarMetas = async () => {

    if (!user?.uid) return;

    try {

      setLoading(true);

      const metasRef = collection(db, 'users', user.uid, 'metas');
      const snapshot = await getDocs(metasRef);

      let metasCarregadas = snapshot.docs.map(doc => {

        const data = doc.data();
        const criadoEm = data.criadoEm?.toDate?.() || new Date();

        let dataConclusao = null;
        
        if (data.dataConclusao) {
          dataConclusao = data.dataConclusao?.toDate?.() || new Date(data.dataConclusao);
        }

        return {
          id: doc.id,
          ...data,
          criadoEm,
          dataConclusao,
          ordem: data.ordem || 0,
        } as Meta;

      });  

      metasCarregadas.sort((a, b) => {

        if (a.ordem !== undefined && b.ordem !== undefined) {
          return a.ordem - b.ordem;
        }

        return b.criadoEm.getTime() - a.criadoEm.getTime();

      });

      setMetas(metasCarregadas);
    
    } catch (error) {
      
      console.error('Erro ao carregar metas:', error);
      Alert.alert('Erro', 'Não foi possível carregar suas metas');
   
    } finally {
      setLoading(false);
    }

  };

  const salvarOrdem = async(novasMetas: Meta[]) => {

    if (!user?.uid) return;

    try {

      setMetas(novasMetas);

      const batch = [];

      for (let i=0; i < novasMetas.length; i++) {
        const meta = novasMetas[i];
        const metaRef = doc(db, 'users', user.uid, 'metas', meta.id);
        await updateDoc(metaRef, { ordem: i});
      }

    } catch (error) {
      console.error('Erro ao salvar ordem:', error);
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
      const novaOrdem = metas.length;

      const novaMeta = {
        titulo: novaMetaTitulo.trim(),
        valor: valorNumerico,
        concluida: false,
        criadoEm: new Date(),
        ordem: novaOrdem,
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
      
      const novasMetas = metas.filter(m => m.id !== metaParaExcluir.id);

      for (let i=0; i < novasMetas.length; i++) {
        const meta = novasMetas[i];
        const metaRef = doc(db, 'users', user.uid, 'metas', meta.id);
        await updateDoc(metaRef, { ordem: i })
      }

      setMetas(novasMetas);
      setShowDeleteModal(false);
      setMetaParaExcluir(null);

    } catch (error) {
      console.error('Erro ao excluir meta:', error);
      Alert.alert('Erro', 'Não foi possível excluir a meta');
    }
  
  };

  const editarMeta = async (meta: Meta) => {

    setMetaParaEditar(meta);

    setEditForm({
      titulo: meta.titulo,
      valor: meta.valor > 0 ? formatarValor(meta.valor).replace('R$ ', '') : ''
    });

    setShowEditModal(true);

  };

  const salvarEdicao = async () => {
    
    if (!metaParaEditar || !user?.uid) return;

    if (!editForm.titulo.trim()) {
      Alert.alert('Atenção', 'Digite um título para a meta');
      return;
    }

    const valorNumerico = editForm.valor ? parseFloat(editForm.valor.replace(',', '.')) : 0;
    setSalvando(true);

    try {

      const metaRef = doc(db, 'users', user.uid, 'metas', metaParaEditar.id);

      await updateDoc(metaRef, {
        titulo: editForm.titulo.trim(),
        valor: valorNumerico,
        atualizadoEm: new Date()
      });

      setMetas(prev => prev.map(m => m.id === metaParaEditar.id ? { ...m, titulo: editForm.titulo.trim(), valor: valorNumerico } : m ));

      setShowEditModal(true);
      setMetaParaEditar(null);
      setEditForm({ titulo: '', valor: '' });

    } catch (error) {

      console.error('Erro ao editar meta:', error);
      Alert.alert('Erro', 'Não foi possível editar a meta');

    } finally {
      setSalvando(false);
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

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Meta>) => {

    return (

      <ScaleDecorator>

        <TouchableOpacity onLongPress={drag} disabled={isActive} activeOpacity={0.0} style={[ styles.metaItem, item.concluida &&
        styles.metaItemConcluida, isActive && styles.metaItemAtivo]}>

          <TouchableOpacity style={styles.metaCheckbox} onPress={() => toggleMeta(item)}>
            
            <View style={[ styles.checkbox, item.concluida && item.concluida && styles.checkboxConcluido ]}>
              
              {item.concluida && (
                <Text style={styles.checkboxIcon}>✓</Text>
              )}

            </View>

          </TouchableOpacity>

          <View style={styles.metaInfo}>
            
            <Text style={[ styles.metaTitulo, item.concluida && styles.metaTituloConcluida]}> {item.titulo} </Text>
            
            {item.valor > 0 && (
              <Text style={[ styles.metaValor, item.concluida && styles.metaValorConcluida ]}> {formatarValor(item.valor)} </Text>
            )}

            {item.concluida && item.dataConclusao && (
              <Text style={styles.metaData}> ✓ Concluída em {item.dataConclusao.toLocaleDateString('pt-BR')} </Text>
            )}

          </View>

          <View style={styles.metaAcoes}>

            <TouchableOpacity style={styles.botaoEditar} onPress={() => editarMeta(item)}>
              <Image style={styles.botaoEditarIcon} source={require('../../assets/editar.png')}/>
            </TouchableOpacity>

            <TouchableOpacity style={styles.botaoExcluir} onPress={() => confirmarExclusao(item)}>
              <Image style={styles.botaoExcluirIcon} source={require('../../assets/excluir.png')}/>
            </TouchableOpacity>

            <View style={styles.dragHandle}>
              <Text style={styles.dragIcon}>⋮⋮</Text>
            </View>

          </View>

        </TouchableOpacity>
      </ScaleDecorator>
    );
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

    <GestureHandlerRootView style={{ flex: 1 }}>
      
      <View style={styles.container}>

        <View style={styles.header}>    
          <Text style={styles.title}>Metas</Text>
          <Text style={styles.subtitle}> {metas.filter(m => m.concluida).length}/{metas.length} concluídas </Text>
        </View>
      
        {!mostrarInput ? (
        
        <TouchableOpacity style={styles.botaoAdicionar} onPress={() => setMostrarInput(true)}>
          <Text style={styles.botaoAdicionarIcon}>+</Text> <Text style={styles.botaoAdicionarText}>Nova meta</Text>
        </TouchableOpacity>
      
        ) : (
        
        <View style={styles.inputContainer}>
          
          <Text style={styles.inputLabel}>Título da meta</Text>
    
          <TextInput style={styles.input} placeholder="Ex: Juntar 10 mil reais" placeholderTextColor={temaEscuro ? '#dadafa' : '#8581FF'} value={novaMetaTitulo}
          onChangeText={setNovaMetaTitulo} autoFocus />

          <Text style={styles.inputLabel}> Valor (opcional)</Text>
   
          <View style={styles.inputValorContainer}>
      
            <Text style={styles.inputValorSimbolo}>R$</Text>
     
            <TextInput style={styles.inputValor} placeholder="0,00" placeholderTextColor={temaEscuro ? '#dadafa' : '#8581FF'} value={novaMetaValor} onChangeText={(
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
        
        <DraggableFlatList data={metas} keyExtractor={(item) => item.id} renderItem={renderItem} onDragEnd={({ data }) => salvarOrdem(data)}
        contentContainerStyle={styles.listaContainer} showsVerticalScrollIndicator={false} ListEmptyComponent={
        
          <View style={styles.emptyContainer}>
            <Image style={styles.menuIcon} source={require('../../assets/alvo.png')}/>
            <Text style={styles.emptyTitle}>Nenhuma meta ainda</Text>
            <Text style={styles.emptyText}> Adicione sua primeira meta! </Text>
          </View>

        } />
        
        <Modal visible={showEditModal} transparent animationType='slide' onRequestClose={() => {
          setShowEditModal(false);
          setMetaParaEditar(null);
          setEditForm({ titulo: '', valor: '' });
        }}>
    
          <View style={styles.modalOverlay}>
            <View style={styles.modalContentEdit}>
      
              <View style={styles.modalHeader}>

                <Text style={styles.modalTitleEdit}> Editar meta </Text>

                <TouchableOpacity onPress={() => { setShowEditModal(false); setMetaParaEditar(null); setEditForm({ titulo: '', valor: '' }); }}>
                  <Text style={styles.modalCloseText}> ✕ </Text>
                </TouchableOpacity>

              </View>
              
              <View style={styles.modalBody}>

                <Text style={styles.modalLabel}> Título </Text>
        
                <TextInput style={styles.modalInput} placeholder='Ex: juntar 10 mil reais' placeholderTextColor={temaEscuro ? '#dadafa' : '#8581FF'} value=
                {editForm.titulo} onChangeText={(text) => setEditForm(prev => ({ ...prev, titulo: text }))} />
                  
                <Text style={styles.modalLabel}> Valor (opcional) </Text>

                <View style={styles.modalValorContainer}>             
                  <Text style={styles.modalValorSimbolo}> R$ </Text>
                  <TextInput style={styles.modalValorInput} placeholder='0,00' placeholderTextColor={temaEscuro ? '#dadafa' : '#8581FF'} value={editForm.valor}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, valor: formatarParaDinheiro(text) }))} keyboardType='numeric' />       
                </View>
                  
                <View style={styles.modalButtons}>
                    
                  <TouchableOpacity style={styles.modalCancelButton} onPress={() => {
                    setShowEditModal(false);
                    setMetaParaEditar(null);
                    setEditForm({ titulo: '', valor: '' })
                  }}>
          
                    <Text style={styles.modalCancelText}>Cancelar</Text>
        
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.modalSaveButton, salvando && styles.modalSaveButtonDisabled]} onPress={salvarEdicao} disabled={salvando}>
          
                    {salvando ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={styles.modalSaveText}>Salvar</Text>
                    )}

                  </TouchableOpacity>

                </View>

              </View>
            </View>
          </View>
        </Modal>
        
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
    </GestureHandlerRootView>
  );
}

const getStyles = (temaEscuro: boolean) => StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: temaEscuro ? '#000824' : '#dadafa',
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: temaEscuro ? '#000824' : '#dadafa',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: temaEscuro ? '#dadafa' : '#0f248d',
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
    color: temaEscuro ? '#dadafa' : '#0f248d',
    marginBottom: 5,
  },

  subtitle: {
    fontSize: 16,
    color: temaEscuro ? '#dadafa' : '#0f248d',
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
    backgroundColor: temaEscuro ? '#00124d' : '#FFF',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
  },

  inputLabel: {
    fontSize: 14,
    color: temaEscuro ? '#dadafa' : '#0f248d',
    marginBottom: 8,
    fontFamily: 'Cabin_700Bold',
  },

  input: {
    backgroundColor: temaEscuro ? '#000824' : '#F8F8FF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: temaEscuro ? '#dadafa' : '#333',
    borderWidth: 1,
    borderColor: '#aab3ff',
    marginBottom: 15,
    fontFamily: 'Inter_400Regular',
  },

  inputValorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: temaEscuro ? '#000824' : '#F8F8FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#aab3ff',
    marginBottom: 20,
  },

  inputValorSimbolo: {
    paddingLeft: 12,
    fontSize: 16,
    color: temaEscuro ? '#dadafa' : '#0f248d',
    fontFamily: 'Cabin_700Bold',
  },

  inputValor: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: temaEscuro ? '#dadafa' : '#333',
    fontFamily: 'Alatsi_400Regular',
  },

  inputBotoes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  botaoCancelar: {
    flex: 1,
    backgroundColor: temaEscuro ? '#000824' : '#F8F8FF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: temaEscuro ? '#001b7a' : '#F44336',
  },

  botaoCancelarText: {
    color: temaEscuro ? '#dadafa' : '#F44336',
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

  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Cabin_700Bold',
    color: temaEscuro ? '#dadafa' : '#0f248d',
    marginBottom: 8,
  },

  emptyText: {
    fontSize: 14,
    color: temaEscuro ? '#dadafa' : '#666',
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },

  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: temaEscuro ? '#a4b9fe' : '#FFF',
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
    opacity: temaEscuro ? 0.3 : 0.8,
    backgroundColor: temaEscuro ? '#f0f0ff' : '#F8F8FF',
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
    color: '#0f248d',
    marginBottom: 4,
    fontFamily: 'Cabin_700Bold',
  },

  metaTituloConcluida: {
    textDecorationLine: 'line-through',
    color: temaEscuro ? '#636363' : '#999',
  },

  metaValor: {
    fontSize: 14,
    color: temaEscuro ? '#007059' : '#00d2a8',
    fontFamily: 'Alatsi_400Regular',
  },

  metaValorConcluida: {
    color: temaEscuro ? '#636363' : '#999',
  },

  metaData: {
    fontSize: 12,
    color: temaEscuro ? '#636363' : '#666',
    marginTop: 4,
    fontFamily: 'Inter_400Regular',
  },

  botaoExcluir: {
    padding: 8,
  },

  metaAcoes: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  botaoEditar: {
    padding: 5,
  },
  
  botaoEditarIcon: {
    width: 18,
    height: 18
  },

  botaoExcluirIcon: {
    width: 22,
    height: 22
  },

  menuIcon: {
    width: 38,
    height: 38,
    marginBottom: 20
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

  modalContentEdit: {
    backgroundColor: temaEscuro ? '#00155c' : '#FFF',
    borderRadius: 20,
    padding: 0,
    width: '90%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: temaEscuro ? '#000c33' : '#0f248d',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  
  modalTitleEdit: {
    fontSize: 20,
    fontFamily: 'Alatsi_400Regular',
    color: temaEscuro ? '#dadafa' : '#FFF',
  },
  
  modalCloseText: {
    fontSize: 24,
    color: temaEscuro ? '#dadafa' : '#FFF',
  },
  
  modalBody: {
    padding: 20,
  },
  
  modalLabel: {
    fontSize: 16,
    color: temaEscuro ? '#dadafa' : '#0f248d',
    marginBottom: 8,
    fontFamily: 'Cabin_700Bold',
  },
  
  modalInput: {
    backgroundColor: temaEscuro ? '#00124d' : '#F8F8FF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: temaEscuro ? '#dadafa' : '#333',
    borderWidth: 1,
    borderColor: temaEscuro ? '#2e44ff' : '#aab3ff',
    marginBottom: 15,
    fontFamily: 'Inter_400Regular',
  },
  
  modalValorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: temaEscuro ? '#00124d' : '#F8F8FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: temaEscuro ? '#2e44ff' : '#aab3ff',
    marginBottom: 25,
  },
  
  modalValorSimbolo: {
    paddingLeft: 12,
    fontSize: 16,
    color: temaEscuro ? '#dadafa' : '#0f248d',
    fontFamily: 'Cabin_700Bold',
  },
  
  modalValorInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: temaEscuro ? '#dadafa' : '#333',
    fontFamily: 'Alatsi_400Regular',
  },
  
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#0f248d',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginLeft: 10,
  },
  
  modalSaveButtonDisabled: {
    backgroundColor: '#A5A2E8',
  },
  
  modalSaveText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Cabin_700Bold',
  },

  modalContent: {
    backgroundColor: temaEscuro ? '#00155c' : '#FFF',
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
    color: temaEscuro ? '#dadafa' : '#333',
    textAlign: 'center',
    marginBottom: 5,
    fontFamily: 'Inter_400Regular',
  },

  modalMetaNome: {
    fontSize: 18,
    fontFamily: 'Cabin_700Bold',
    color: temaEscuro ? '#dadafa' : '#0f248d',
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
    backgroundColor: temaEscuro ? '#000c33' : '#dadafa',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: temaEscuro ? '#001866' : '#dadaff',
  },

  modalCancelText: {
    color: temaEscuro ? '#dadafa' : '#666',
    fontSize: 16,
    fontFamily: 'Cabin_700Bold',
  },

  modalConfirmButton: {
    flex: 1,
    backgroundColor: temaEscuro ? '#740618' : '#F44336',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginLeft: 10,
  },

  modalConfirmText: {
    color: temaEscuro ? '#fee7ea' : '#FFF',
    fontSize: 16,
    fontFamily: 'Cabin_700Bold',
  },

  metaItemAtivo: {
    backgroundColor: '#F0EFFF',
    transform: [{ scale: 1.02 }],
    shadowColor: '#0f248d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },

  dragHandle: {
    padding: 8,
    marginLeft: 2,
  },

  dragIcon: {
    fontSize: 20,
    color: temaEscuro ? '#6b7bff' : '#aab3ff',
    fontWeight: 'bold',
    letterSpacing: -2,
  },

})