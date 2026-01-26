import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, Alert, Modal, FlatList, RefreshControl} from 'react-native';

import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../contexts/AuthContext'; 
import { db } from '../services/firebase';
import { collection, getDocs, query, where, deleteDoc, doc, setDoc, orderBy } from 'firebase/firestore';

type RootStackParamList = {
  Home: undefined;
  Categories: undefined;
  AddExpense: undefined;
  AddInvestment: undefined;
};

type NavigationProps = NativeStackNavigationProp<RootStackParamList>;

interface Categoria {
  id: string;
  nome: string;
  tipo: 'despesa' | 'investimento';
  personalizada?: boolean
  userId?: string;
  criadoEm?: any;
}

const categoriasPadraoDespesas: Categoria[] = [
  { id: 'moradia', nome: '🏠 Moradia', tipo: 'despesa', personalizada: false},
  { id: 'alimentacao', nome: '🍔 Alimentação', tipo: 'despesa', personalizada: false},
  { id: 'transporte', nome: '🚗 Transporte', tipo: 'despesa', personalizada: false},
  { id: 'lazer', nome: '🎮 Lazer', tipo: 'despesa', personalizada: false},
  { id: 'saude', nome: '🏥 Saúde', tipo: 'despesa', personalizada: false},
  { id: 'educacao', nome: '📚 Educação', tipo: 'despesa', personalizada: false},
  { id: 'outros', nome: '📦 Outros', tipo: 'despesa', personalizada: false},
];

const categoriasPadraoInvestimentos: Categoria[] = [
  { id: 'reserva', nome: '💰 Reserva de emergência', tipo: 'investimento', personalizada: false },
  { id: 'investimentos', nome: '📈 Investimentos & CDB', tipo: 'investimento', personalizada: false },
  { id: 'outros', nome: '📦 Outros', tipo: 'investimento', personalizada: false },
];

export default function Categories() {

  const navigation = useNavigation<NavigationProps>();
  const { user } = useAuth();
  const isFocused = useIsFocused();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoriaParaExcluir, setCategoriaParaExcluir] = useState<Categoria | null>(null);

  const [novaCategoriaNome, setNovaCategoriaNome] = useState('');
  const [novaCategoriaTipo, setNovaCategoriaTipo] = useState<'despesa' | 'investimento'>('despesa');

  const [categoriasDespesa, setCategoriasDespesa] = useState<Categoria[]>([]);
  const [categoriasInvestimento, setCategoriasInvestimento] = useState<Categoria[]>([]);
  const [categoriasPersonalizadas, setCategoriasPersonalizadas] = useState<Categoria[]>([]);

  const carregarCategorias = useCallback(async () => {

    if (!user?.uid) return;

    try {

      const categoriasRef = collection(db, 'users', user.uid, 'categorias');
      const snapshot = await getDocs(categoriasRef);

      const categorias: Categoria[] = [];

      snapshot.forEach(docSnap => {

        const data = docSnap.data();

        categorias.push({
          id: docSnap.id,
          nome: data.nome,
          tipo: data.tipo as 'despesa' | 'investimento',
          personalizada: data.personalizada || false,
          userId: data.userId,
          criadoEm: data.criadoEm,
        });

      });

      const despesas = categorias.filter(cat => cat.tipo === 'despesa');
      const investimentos = categorias.filter(cat => cat.tipo === 'investimento');
      const personalizadas = categorias.filter(cat => cat.personalizada === true);

      setCategoriasDespesa([...categoriasPadraoDespesas, ...despesas]);
      setCategoriasInvestimento([...categoriasPadraoInvestimentos, ...investimentos]);
      setCategoriasPersonalizadas(personalizadas);

    } catch (error) {
      
      console.error('Erro ao carregar categorias:', error);
      Alert.alert('Erro', 'Não foi possível carregar as categorias');
    
    } finally {

      setLoading(false);
      setRefreshing(false);

    }

  }, [user?.uid]);

  useEffect(() => {

    if (isFocused) {
        carregarCategorias();
    }

  }, [isFocused, carregarCategorias]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    carregarCategorias();
  }, [carregarCategorias]);

  const criarNovaCategoria = async () => {

    if (!novaCategoriaNome.trim()) {
      Alert.alert('Atenção', 'Digite um nome para a categoria');
      return;
    }

    if (!user?.uid) {
      Alert.alert('Erro', 'Usuário não identificado');
      return;
    }

    try {
      
      const categoriaId = novaCategoriaNome .toLowerCase() .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '-').replace
      (/-+/g, '-').replace(/^-|-$/g, '');

      const todasCategorias = [...categoriasDespesa, ...categoriasInvestimento];
      const categoriaExistente = todasCategorias.find( cat => cat.id === categoriaId || cat.nome.toLowerCase() === novaCategoriaNome.toLowerCase());

      if (categoriaExistente) {
        Alert.alert('Atenção', 'Esta categoria já existe');
        return;
      }

      const novaCategoria: Categoria = {
        id: categoriaId,
        nome: novaCategoriaNome,
        tipo: novaCategoriaTipo,
        personalizada: true,
        userId: user.uid,
        criadoEm: new Date()
      };

      const categoriasRef = collection(db, 'users', user.uid, 'categorias');

      await setDoc(doc(categoriasRef, categoriaId), {
        nome: novaCategoria.nome,
        tipo: novaCategoria.tipo,
        personalizada: true,
        userId: user.uid,
        criadoEm: new Date()
      });

      setShowAddModal(false);
      setNovaCategoriaNome('');
      setNovaCategoriaTipo('despesa');

      await carregarCategorias();

      Alert.alert('Sucesso!', 'Categoria criada com sucesso.');

    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      Alert.alert('Erro', 'Não foi possível criar a categoria');
    }

  };

  const excluirCategoria = async () => {

    if (!categoriaParaExcluir || !user?.uid) return;

    try {
      
      if (!categoriaParaExcluir.personalizada) {
        Alert.alert('Atenção', 'Categorias padrão não podem ser excluídas');
        return;
      }

      const categoriasRef = collection(db, 'users', user.uid, 'categorias');
      const transacoesRef = collection(db, 'users', user.uid, categoriaParaExcluir.tipo === 'despesa' ? 'despesas' : 'investimentos');
      const q = query(transacoesRef, where('categoria', '==', categoriaParaExcluir.id));
      const snapshot = await getDocs(q);

      if (snapshot.size > 0) {
        
        Alert.alert('Atenção',`Esta categoria está sendo usada em ${snapshot.size} transação(ões).\n\nAltere as transações antes de excluir a
        categoria.`, [{ text: 'OK' }] );

        return;

      }

      await deleteDoc(doc(categoriasRef, categoriaParaExcluir.id));

      setShowDeleteModal(false);
      setCategoriaParaExcluir(null);

      await carregarCategorias();

      Alert.alert('Sucesso!', 'Categoria excluída com sucesso');

    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      Alert.alert('Erro', 'Não foi possível excluir a categoria');
    }

  };

  const formatarData = (data: any) => {

    if (!data) return;

    try {
      const date = data.toDate ? data.toDate() : new Date(data);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return '';
    }

  };
  
  const renderCategoriaItem = ({ item }: { item: Categoria }) => (
    
    <View style={[ styles.categoriaItem, item.personalizada && styles.categoriaPersonalizada ]}>
      
      <View style={styles.categoriaInfo}>
        
        <Text style={styles.categoriaNome}>{item.nome}</Text>
        
        {item.personalizada && (
          
          <View style={styles.badgePersonalizada}>
            <Text style={styles.badgeText}>Personalizada</Text>
          </View>

        )}

        {item.criadoEm && (
            <Text style={styles.categoriaData}> Criada em: {formatarData(item.criadoEm)} </Text>
        )}

      </View>
      
      {item.personalizada && (
        
        <TouchableOpacity style={styles.excluirButton} onPress={() => { setCategoriaParaExcluir(item); setShowDeleteModal(true); }}>
          <Text style={styles.excluirButtonText}>🗑️</Text>
        </TouchableOpacity>

      )}

    </View>
  );

  if (loading) {

    return (
      
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#dadafa" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>

    );

  }

  return (

    <View style={styles.container}>
      
      <View style={styles.header}>
        
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Categorias</Text>
        
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>

      </View>

      <ScrollView refreshControl={ <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> } showsVerticalScrollIndicator={false}>

        <View style={styles.section}>
          
          <View style={styles.sectionHeader}>
            
            <Text style={styles.sectionTitle}>Despesas</Text>
            
            <TouchableOpacity style={styles.novaTransacaoButton} onPress={() => navigation.navigate('AddExpense')}>
              <Text style={styles.novaTransacaoText}>+ Nova despesa</Text>
            </TouchableOpacity>

          </View>
          
          <View style={styles.categoriasList}>
            
            {categoriasDespesa.map((categoria) => (
              
              <View key={`despesa-${categoria.id}`} style={styles.categoriaCard}>
                
                <Text style={styles.categoriaCardNome}>{categoria.nome}</Text>
               
                {categoria.personalizada && (
                  <Text style={styles.categoriaCardTag}>Personalizada</Text>
                )}

              </View>

            ))}

          </View>
        </View>

        <View style={styles.section}>
          
          <View style={styles.sectionHeader}>
            
            <Text style={styles.sectionTitle}>Investimentos</Text>
            
            <TouchableOpacity style={styles.novaTransacaoButton} onPress={() => navigation.navigate('AddInvestment')}>
              <Text style={styles.novaTransacaoText}>+ Novo investimento</Text>
            </TouchableOpacity>

          </View>
          
          <View style={styles.categoriasList}>
           
            {categoriasInvestimento.map((categoria) => (
              
              <View key={`investimento-${categoria.id}`} style={styles.categoriaCard}>
                
                <Text style={styles.categoriaCardNome}>{categoria.nome}</Text>
                
                {categoria.personalizada && (
                  <Text style={styles.categoriaCardTag}>Personalizada</Text>
                )}

              </View>

            ))
            }
          </View>
        </View>

        {categoriasPersonalizadas.length > 0 && (
          
          <View style={[styles.section, { marginBottom: 30}]}>
           
            <Text style={styles.sectionTitle}>Suas categorias </Text>
            <Text style={styles.sectionSubtitle}> Criadas por você ({categoriasPersonalizadas.length}) </Text>
            
            <FlatList data={categoriasPersonalizadas} renderItem={renderCategoriaItem} keyExtractor={(item) => `personalizada-${item.id}`} scrollEnabled={false} />
          
          </View>
        )}
      </ScrollView>

      <Modal visible={showAddModal} transparent={true} animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            <View style={styles.modalHeader}>
              
              <Text style={styles.modalTitle}>Nova categoria</Text>
              
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => { setShowAddModal(false); setNovaCategoriaNome(''); }}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>

            </View>

            <View style={styles.modalBody}>
              
              <Text style={styles.modalLabel}>Nome da categoria</Text>
              
              <TextInput style={styles.modalInput} placeholder="Ex: Pets, Assinaturas, Presentes..." placeholderTextColor="#8581FF" value=
              {novaCategoriaNome} onChangeText={setNovaCategoriaNome} autoFocus maxLength={30} />

              <Text style={styles.modalLabel}>Tipo</Text>
              
              <View style={styles.tipoButtons}>
                
                <TouchableOpacity style={[ styles.tipoButton, novaCategoriaTipo === 'despesa' && styles.tipoButtonActive ]} onPress={() =>
                setNovaCategoriaTipo('despesa')}>
                    
                    <Text style={[ styles.tipoButtonText, novaCategoriaTipo === 'despesa' && styles.tipoButtonTextActive ]}>Despesa </Text>
                
                </TouchableOpacity>

                <TouchableOpacity style={[ styles.tipoButton, novaCategoriaTipo === 'investimento' && styles.tipoButtonActive ]} onPress={() =>
                setNovaCategoriaTipo('investimento')}>

                  <Text style={[ styles.tipoButtonText, novaCategoriaTipo === 'investimento' && styles.tipoButtonTextActive ]}> Investimento </Text>
                
                </TouchableOpacity>

              </View>
            </View>

            <View style={styles.modalFooter}>
              
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => { setShowAddModal(false); setNovaCategoriaNome(''); }}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[ styles.modalConfirmButton, !novaCategoriaNome.trim() && styles.modalConfirmButtonDisabled ]} onPress=
              {criarNovaCategoria} disabled={!novaCategoriaNome.trim()}>

                <Text style={styles.modalConfirmText}>Criar Categoria</Text>

              </TouchableOpacity>

            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showDeleteModal} transparent={true} animationType="fade" onRequestClose={() => { setShowDeleteModal(false);
      setCategoriaParaExcluir(null); }}>
        
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            
            <Text style={styles.deleteModalTitle}>Excluir categoria</Text>
            <Text style={styles.deleteModalText}> Tem certeza que deseja excluir a categoria </Text>
            <Text style={styles.deleteModalCategoriaNome}> "{categoriaParaExcluir?.nome}"? </Text>     
            <Text style={styles.deleteModalWarning}> ⚠️ Esta ação não pode ser desfeita </Text>

            <View style={styles.deleteModalButtons}>
              
              <TouchableOpacity style={styles.deleteModalCancelButton} onPress={() => { setShowDeleteModal(false); setCategoriaParaExcluir(null); }}>
                <Text style={styles.deleteModalCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.deleteModalConfirmButton} onPress={excluirCategoria}>
                <Text style={styles.deleteModalConfirmText}>Excluir</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#dadafa',
  },

  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#0f248d',
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
    fontWeight: 'bold',
  },

  title: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },

  addButtonText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },

  section: {
    marginTop: 25,
    paddingHorizontal: 20,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f248d',
  },
  
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },

  novaTransacaoButton: {
    backgroundColor: '#0f248d',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },

  novaTransacaoText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },

  categoriasList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  categoriaCard: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E0E0FF',
    width: 170,
    marginBottom: 10,
  },

  categoriaCardNome: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 5,
  },

  categoriaCardTag: {
    fontSize: 11,
    color: '#0f248d',
    backgroundColor: '#F0EFFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'center',
  },

  categoriaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0FF',
    marginBottom: 10,
  },

  categoriaPersonalizada: {
    borderColor: '#4D48C8',
    backgroundColor: '#F8F8FF',
  },

  categoriaInfo: {
    flex: 1,
  },

  categoriaNome: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 5,
  },

  categoriaData: {
    fontSize: 12,
    color: '#666',
  },

  badgePersonalizada: {
    backgroundColor: '#0f248d',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 5,
  },

  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },

  excluirButton: {
    padding: 10,
  },

  excluirButtonText: {
    fontSize: 20,
    color: '#FF6B6B',
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
    width: '90%',
    maxWidth: 400,
    overflow: 'hidden',
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0FF',
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f248d',
  },

  modalCloseButton: {
    padding: 5,
  },

  modalCloseText: {
    fontSize: 20,
    color: '#666',
  },

  modalBody: {
    padding: 20,
  },

  modalLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },

  modalInput: {
    backgroundColor: '#F5F5FF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0FF',
    marginBottom: 20,
  },

  tipoButtons: {
    flexDirection: 'row',
    gap: 10,
  },

  tipoButton: {
    flex: 1,
    backgroundColor: '#dadafa',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#aab3ff',
  },

  tipoButtonActive: {
    backgroundColor: '#0f248d',
    borderColor: '#0f248d',
  },

  tipoButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },

  tipoButtonTextActive: {
    color: '#FFF',
  },

  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0FF',
  },
  
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#dadafa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginRight: 10,
  },

  modalCancelText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },

  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#0f248d',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },

  modalConfirmButtonDisabled: {
    backgroundColor: '#8c9ae4',
  },

  modalConfirmText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  deleteModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 25,
    width: '85%',
    maxWidth: 350,
    alignItems: 'center',
  },

  deleteModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 15,
  },

  deleteModalText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },

  deleteModalCategoriaNome: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f248d',
    textAlign: 'center',
    marginBottom: 20,
  },

  deleteModalWarning: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: '500',
    marginBottom: 25,
    textAlign: 'center',
  },

  deleteModalButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },

  deleteModalCancelButton: {
    flex: 1,
    backgroundColor: '#dadafa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },

  deleteModalCancelText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  
  deleteModalConfirmButton: {
    flex: 1,
    backgroundColor: '#F44336',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },

  deleteModalConfirmText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

});