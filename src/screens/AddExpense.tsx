import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, Alert, Platform, Modal, FlatList, KeyboardAvoidingView } from 'react-native';

import DateTimePicker from '@react-native-community/datetimepicker';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../contexts/AuthContext'; 
import { db } from '../services/firebase';
import { collection, addDoc, getDocs, doc, setDoc } from 'firebase/firestore';

type RootStackParamList = {
  Home: undefined;
  AddExpense: undefined;
  Categories: undefined;
};

type NavigationProps = NativeStackNavigationProp<RootStackParamList>;

type ExpenseType = 'recorrente' | 'variavel';

interface Categoria {
  id: string;
  nome: string;
  icone: string;
  personalizada?: boolean
  userId?: string;
}

const categoriasPadrao = [
  { id: 'moradia', nome: '🏠 Moradia', icone: '🏠' },
  { id: 'alimentacao', nome: '🍔 Alimentação', icone: '🍔' },
  { id: 'transporte', nome: '🚗 Transporte', icone: '🚗' },
  { id: 'lazer', nome: '🎮 Lazer', icone: '🎮' },
  { id: 'saude', nome: '🏥 Saúde', icone: '🏥' },
  { id: 'educacao', nome: '📚 Educação', icone: '📚' },
  { id: 'outros', nome: '📦 Outros', icone: '📦' },
];

type ExpenseData = {
  nome: string;
  tipo: ExpenseType;
  categoria: string;
  valorPrevisto: string;
  valorReal: string;
  dataPrevista: Date | null;
  dataReal: Date | null;
};

export default function AddExpense() {

  const navigation = useNavigation<NavigationProps>();
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showCategoriasModal, setShowCategoriasModal] = useState(false);
  const [mostrarInputNovaCategoria, setMostrarInputNovaCategoria] = useState(false);
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('');
  const [categoriasUsuario, setCategoriasUsuario] = useState<Categoria[]>([]);
  const [todasCategorias, setTodasCategorias] = useState<Categoria[]>(categoriasPadrao);

  const [formData, setFormData] = useState<ExpenseData>({
    nome: '',
    tipo: 'variavel',
    categoria: '',
    valorPrevisto: '',
    valorReal: '',
    dataPrevista: null,
    dataReal: null
  });

  const [errors, setErrors] = useState({
    nome: '',
    tipo: '',
    categoria: '',
    valorPrevisto: '',
    valorReal: '',
    dataPrevista: '',
    dataReal: '',
    form: ''
  });

  const [showDatePrevistaPicker, setShowDatePrevistaPicker] = useState(false);
  const [showDateRealPicker, setShowDateRealPicker] = useState(false);

  useEffect(() => {
    carregarCategoriasUsuario();
  }, [user?.uid]);

  const carregarCategoriasUsuario = async () => {

    if (!user?.uid) return;

    try {
      
      const categoriasRef = collection(db, 'users', user.uid, 'categorias');
      const snapshot = await getDocs(categoriasRef);

      const categorias: Categoria[] = [];

      snapshot.forEach(doc => {
        
        categorias.push({
          id: doc.id,
          ...doc.data()
        } as Categoria);

      });

      setCategoriasUsuario([...categoriasPadrao, ...categorias]);

    } catch (error) {
      console.error('Erro ao carregar categorias:', error);  
    }
  
  };

  const formatarParaDinheiro = (text: string): string => {

    let numbers = text.replace(/\D/g, '');
        
    if (numbers === '') return '';
        
    const valor = parseInt(numbers, 10) / 100;
    return valor.toFixed(2).replace('.', ',');

  };

  const converterParaNumero = (valorFormatado: string): number => {

    if (!valorFormatado) return 0;
    return parseFloat(valorFormatado.replace(',', '.')) || 0;
    
  };

  const validateField = (field: keyof ExpenseData, value: any): boolean => {
    
    let error = '';

    switch (field) {

      case 'nome':
        if (!value.trim()) error = 'Nome é obrigatório';
        else if (value.length < 2) error = 'Nome muito curto';
        break;

      case 'categoria':
        if (!value) error = 'Selecione uma categoria';
        break;

      case 'valorPrevisto':
        if (!value && !formData.valorReal) error = 'Preencha pelo menos um valor';
        else if (value && converterParaNumero(value) <= 0) error = 'Valor deve ser maior que 0';
        break;
            
      case 'valorReal':
        if (!value && !formData.valorPrevisto) error = 'Preencha pelo menos um valor';
        else if (value && converterParaNumero(value) <= 0) error = 'Valor deve ser maior que 0';
        break;
            
      case 'dataPrevista':
        if (!value && !formData.dataReal) error = 'Preencha pelo menos uma data';
        break;
            
      case 'dataReal':
        if (!value && !formData.dataPrevista) error = 'Preencha pelo menos uma data';
        break;
    }

    setErrors(prev => ({ ...prev, [field]: error }));
    return error === '';

  };

  const handleChange = (field: keyof ExpenseData, value: any) => {

    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (value && errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    if (field === 'valorPrevisto' || field === 'valorReal') {
      setTimeout(() => validateField(field, value), 300);
    }
    
  };

  const handleDateChange = (field: 'dataPrevista' | 'dataReal', date: Date | null) => {
    
    handleChange(field, date);

    if (date) {
      validateField(field, date);
    }
   
  };

  const formatarData = (data: Date | null): string => {
    if (!data) return 'Selecionar data';
    return data.toLocaleDateString('pt-BR');
  };

  const validateForm = (): boolean => {

    const validations = [
      validateField('nome', formData.nome),
      validateField('categoria', formData.categoria),
      !formData.valorPrevisto && !formData.valorReal ? false : true,
      !formData.valorPrevisto && !formData.dataReal ? false : true
    ];

    const isValid = validations.every(v => v === true);

    if (!isValid) {
           
      setErrors(prev => ({
        ...prev, form: 'Preencha todos os campos obrigatórios'
      }));

    } else {
      setErrors(prev => ({ ...prev, form: ''}));
    }

    return isValid;

  };

  const selecionarCategoria = (categoriaId: string) => {
    handleChange('categoria', categoriaId);
    setShowCategoriasModal(false);
  };

  const obterNomeCategoria = (categoriaId: string): string => {
    const categoria = todasCategorias.find(cat => cat.id === categoriaId);
    return categoria ? categoria.nome : 'Selecionar categoria';
  };

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

      const categoriasExistentes = todasCategorias.find( cat => cat.id === categoriaId || cat.nome.toLowerCase() === novaCategoriaNome.toLowerCase());

      if (categoriasExistentes) {
        Alert.alert('Atenção', 'Esta categoria já existe');
        return;
      }

      const novaCategoria: Categoria = {
        id: categoriaId,
        nome: novaCategoriaNome,
        icone: '📝',
        personalizada: true,
        userId: user.uid
      };

      const categoriasRef = await collection(db, 'users', user.uid, 'categorias');

      await setDoc(doc(categoriasRef, categoriaId), {
        nome: novaCategoriaNome,
        icone: '📝',
        personalizada: true,
        criadaEm: new Date()
      });

      setCategoriasUsuario(prev => [...prev, novaCategoria]);
      setTodasCategorias(prev => [...prev, novaCategoria]);

      selecionarCategoria(categoriaId);

      setNovaCategoriaNome('');
      setMostrarInputNovaCategoria(false);

      Alert.alert('Sucesso!', 'Categoria criada com sucesso');

    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      Alert.alert('Erro', 'Não foi possível criar a categoria');
    }

  };

  const handleSalvar = async () => {
    
    if (!validateForm()) {
      Alert.alert('Atenção', 'Preencha todos os campos obrigatórios');
      return;
    }
    
    const dataParaCalculo = formData.dataReal || formData.dataPrevista;
    if (!dataParaCalculo) return;
    
    const mes = dataParaCalculo.getMonth() + 1;
    const ano = dataParaCalculo.getFullYear();
            
    const valorPrevistoNum = converterParaNumero(formData.valorPrevisto);
    const valorRealNum = converterParaNumero(formData.valorReal);
    const valorParaSalvar = valorRealNum || valorPrevistoNum;
    
    setIsLoading(true);
    
    try {

      if (!user?.uid) {
        Alert.alert('Erro', 'Usuário não identificado');
        return;
      }

      const despesasRef = collection(db, 'users', user.uid, 'despesas');

      await addDoc(despesasRef, {
        userId: user.uid,
        nome: formData.nome.trim(),
        tipo: formData.tipo,
        categoria: formData.categoria,
        valorPrevisto: valorPrevistoNum,
        valorReal: valorRealNum,
        dataPrevista: formData.dataPrevista ? formData.dataPrevista.toISOString() : null,
        dataReal: formData.dataReal ? formData.dataReal.toISOString() : null,
        valor: valorParaSalvar,
        data: dataParaCalculo.toISOString(),
        mes,
        ano,
        realizado: !!formData.dataReal && !!valorRealNum,
        criadoEm: new Date(),
        atualizadoEm: new Date()
      });

      Alert.alert('Sucesso!', 'Despesa adicionada com sucesso!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
   
    } catch (error) {
      
      console.error('Erro ao salvar renda:', error);
      Alert.alert('Erro', 'Não foi possível salvar a despesa');
    
    } finally {
      setIsLoading(false);
    }

  };

  const limparCampoValor = (campo: 'valorPrevisto' | 'valorReal') => {
    handleChange(campo, '');
    setErrors(prev => ({ ...prev, [campo]: '' }));
  };

  return (
    
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

      <View style={styles.header}>
        
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Nova Despesa</Text>
        <View style={{ width: 40 }} />

      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <View style={styles.inputGroup}>
          
          <Text style={styles.label}>Nome da despesa</Text>
          
          <TextInput style={[ styles.input, errors.nome ? styles.inputError : null ]} placeholder="Ex: Mercado, Gás, Transporte..." placeholderTextColor=
          "#8581FF" value={formData.nome} onChangeText={(text) => handleChange('nome', text)} onBlur={() => validateField('nome', formData.nome)}
          maxLength={50} />

          {errors.nome ? (
            <Text style={styles.errorText}>{errors.nome}</Text>
          ) : null}

        </View>

        <View style={styles.inputGroup}>
          
          <Text style={styles.label}>Tipo</Text>
          
          <View style={styles.typeContainer}>
            
            <TouchableOpacity style={[ styles.typeButton, formData.tipo === 'recorrente' && styles.typeButtonActive ]} onPress={() => handleChange('tipo', 'recorrente')}>
              <Text style={[ styles.typeButtonText, formData.tipo === 'recorrente' && styles.typeButtonTextActive ]}> Recorrente </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[ styles.typeButton, formData.tipo === 'variavel' && styles.typeButtonActive ]} onPress={() => handleChange('tipo', 'variavel')}>
              <Text style={[ styles.typeButtonText, formData.tipo === 'variavel' && styles.typeButtonTextActive ]}> Variável </Text>
            </TouchableOpacity>

          </View>
        </View>

        <View style={styles.inputGroup}>
          
          <Text style={styles.label}>Categoria</Text>
          
          <TouchableOpacity style={[ styles.categoriaButton, errors.categoria ? styles.inputError : null ]} onPress={() => setShowCategoriasModal(true)}>
            
            <Text style={[ styles.categoriaButtonText, !formData.categoria && styles.categoriaButtonTextPlaceholder ]}> {formData.categoria ?
            obterNomeCategoria(formData.categoria) : 'Selecionar categoria'} </Text>
            
            <Text style={styles.categoriaButtonIcon}>▼</Text>

          </TouchableOpacity>

          {errors.categoria ? (
            <Text style={styles.errorText}>{errors.categoria}</Text>
          ) : null}

        </View>

        <Modal visible={showCategoriasModal} transparent={true} animationType="slide" onRequestClose={() => {
          setShowCategoriasModal(false);
          setMostrarInputNovaCategoria(false);
          setNovaCategoriaNome('');
        }}>
          
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
            
                <Text style={styles.modalTitle}>Selecionar Categoria</Text>
                
                <TouchableOpacity style={styles.modalCloseButton} onPress={() => {
                  setShowCategoriasModal(false);
                  setMostrarInputNovaCategoria(false);
                  setNovaCategoriaNome('');
                }}>
                  
                  <Text style={styles.modalCloseText}>✕</Text>

                </TouchableOpacity>

              </View>

              <FlatList data={todasCategorias} keyExtractor={(item) => item.id} renderItem={({ item }) => (
                
                <TouchableOpacity style={[ styles.categoriaItem, formData.categoria === item.id && styles.categoriaItemSelected ]} onPress={() => 
                selecionarCategoria(item.id)}>

                  <Text style={styles.categoriaItemText}>{item.nome}</Text>
                  
                  {formData.categoria === item.id && (
                    <Text style={styles.categoriaItemCheck}>✓</Text>
                  )}

                </TouchableOpacity>
              )}
              
              contentContainerStyle={styles.categoriaList} />

              <View style={styles.separator}>
                <View style={styles.separatorLine} />
                <Text style={styles.separatorText}>ou</Text>
                <View style={styles.separatorLine} />
              </View>
              
              {!mostrarInputNovaCategoria ? (
                
                <TouchableOpacity style={styles.novaCategoriaButton} onPress={() => setMostrarInputNovaCategoria(true)}>
                  <Text style={styles.novaCategoriaButtonText}>+ Criar nova categoria</Text>
                </TouchableOpacity>

              ) : (
                
                <View style={styles.novaCategoriaInputContainer}>
                  
                  <Text style={styles.novaCategoriaLabel}>Nova Categoria</Text>
                  
                  <View style={styles.novaCategoriaInputRow}>
                    
                    <TextInput style={styles.novaCategoriaInput} placeholder="Ex: Pets, Assinaturas, Presentes..." placeholderTextColor="#8581FF"
                    value={novaCategoriaNome} onChangeText={setNovaCategoriaNome} autoFocus maxLength={30} />
                    
                    <TouchableOpacity style={styles.novaCategoriaConfirmButton} onPress={criarNovaCategoria}>
                      <Text style={styles.novaCategoriaConfirmText}>✓</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.novaCategoriaCancelButton} onPress={() => {
                      setMostrarInputNovaCategoria(false);
                      setNovaCategoriaNome('');
                    }}>

                      <Text style={styles.novaCategoriaCancelText}>✕</Text>

                    </TouchableOpacity>

                  </View>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Text style={styles.sectionTitle}>Previsão</Text>
        
        <View style={styles.inputGroup}>
          
          <Text style={styles.label}>Data prevista</Text>
          
          <TouchableOpacity style={[ styles.dateButton, errors.dataPrevista ? styles.inputError : null ]} onPress={() => setShowDatePrevistaPicker(true)}>
            <Text style={[ styles.dateButtonText, !formData.dataPrevista && styles.dateButtonTextPlaceholder ]}> {formatarData(formData.dataPrevista)} </Text>
          </TouchableOpacity>
          
          {errors.dataPrevista ? (
            <Text style={styles.errorText}>{errors.dataPrevista}</Text>
          ) : null}
          
          {showDatePrevistaPicker && (
            
            <DateTimePicker value={formData.dataPrevista || new Date()} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowDatePrevistaPicker(false);
              
              if (selectedDate) {
                handleDateChange('dataPrevista', selectedDate);
              }

            }} />
          )}

        </View>

        <View style={styles.inputGroup}>
          
          <Text style={styles.label}>Valor previsto (R$)</Text>
          
          <View style={[ styles.inputWithCurrency, errors.valorPrevisto ? styles.inputError : null ]}>
            
            <Text style={styles.currencySymbol}>R$</Text>
            
            <TextInput style={[styles.input, styles.inputWithLeftPadding]} placeholder="0,00" placeholderTextColor="#8581FF" value={formData.
            valorPrevisto} onChangeText={(text) => { const formatado = formatarParaDinheiro(text); handleChange('valorPrevisto', formatado); }}
            onBlur={() => validateField('valorPrevisto', formData.valorPrevisto)} keyboardType="numeric" returnKeyType="done" />

            {formData.valorPrevisto ? (
              
              <TouchableOpacity style={styles.clearButton} onPress={() => limparCampoValor('valorPrevisto')}>
                <Text style={styles.clearButtonText}>×</Text>
              </TouchableOpacity>

            ) : null}

          </View>

          {errors.valorPrevisto ? (
            <Text style={styles.errorText}>{errors.valorPrevisto}</Text>
          ) : null}

        </View>

        <Text style={styles.sectionTitle}>Realizado</Text>

        <View style={styles.inputGroup}>
          
          <Text style={styles.label}>Data real (quando gastou)</Text>
          
          <TouchableOpacity style={[ styles.dateButton, errors.dataReal ? styles.inputError : null ]} onPress={() => setShowDateRealPicker(true)}>
            <Text style={[ styles.dateButtonText, !formData.dataReal && styles.dateButtonTextPlaceholder ]}> {formatarData(formData.dataReal)} </Text>
          </TouchableOpacity>
          
          {errors.dataReal ? (
            <Text style={styles.errorText}>{errors.dataReal}</Text>
          ) : null}
          
          {showDateRealPicker && (
            
            <DateTimePicker value={formData.dataReal || new Date()} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange=
            {(event, selectedDate) => {
              
              setShowDateRealPicker(false);
              
              if (selectedDate) {
                handleDateChange('dataReal', selectedDate);
              }

            }} />
          )}

        </View>

        <View style={styles.inputGroup}>
          
          <Text style={styles.label}>Valor real (R$)</Text>
          
          <View style={[ styles.inputWithCurrency, errors.valorReal ? styles.inputError : null ]}>
            
            <Text style={styles.currencySymbol}>R$</Text>
            
            <TextInput style={[styles.input, styles.inputWithLeftPadding]} placeholder="0,00" placeholderTextColor="#8581FF" value={formData.
            valorReal} onChangeText={(text) => { const formatado = formatarParaDinheiro(text); handleChange('valorReal', formatado); }} onBlur={
            () => validateField('valorReal', formData.valorReal)} keyboardType="numeric" returnKeyType="done" />

            {formData.valorReal ? (
              
              <TouchableOpacity style={styles.clearButton} onPress={() => limparCampoValor('valorReal')}>
                <Text style={styles.clearButtonText}>×</Text>
              </TouchableOpacity>

            ) : null}

          </View>

          {errors.valorReal ? (
            <Text style={styles.errorText}>{errors.valorReal}</Text>
          ) : null}

        </View>

        {errors.form ? (

          <View style={styles.formErrorContainer}>
            <Text style={styles.formErrorText}>⚠️ {errors.form}</Text>
          </View>

        ) : null}

        <View style={styles.infoBox}>

          <Text style={styles.infoText}>
            <Text style={styles.infoTextBold}>Dica:</Text> Crie categorias personalizadas para organizar melhor suas despesas!
          </Text>

        </View>

        <TouchableOpacity style={[ styles.saveButton, isLoading ? styles.saveButtonDisabled : null, errors.form ? styles.saveButtonDisabled : null ]}
        onPress={handleSalvar} disabled={isLoading || !!errors.form}>
          
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>Salvar Despesa</Text>
          )}

        </TouchableOpacity>

        <View style={styles.bottomSpacing} />

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#dadafa',
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

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: 20,
  },

  inputGroup: {
    marginBottom: 20,
  },

  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },

  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#aab3ff',
  },

  inputError: {
    borderColor: '#FF6B6B',
    borderWidth: 2,
  },

  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    marginTop: 5,
  },
  
  typeContainer: {
    flexDirection: 'row',
    gap: 10,
  },

  typeButton: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#aab3ff',
  },

  typeButtonActive: {
    backgroundColor: '#0f248d',
    borderColor: '#0f248d',
  },

  typeButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },

  typeButtonTextActive: {
    color: '#FFF',
  },

  categoriaButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#aab3ff',
  },

  categoriaButtonText: {
    fontSize: 16,
    color: '#333',
  },

  categoriaButtonTextPlaceholder: {
    color: '#8581FF',
  },

  categoriaButtonIcon: {
    fontSize: 14,
    color: '#8581FF',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#aab3ff',
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },

  modalCloseButton: {
    padding: 5,
  },

  modalCloseText: {
    fontSize: 20,
    color: '#666',
  },

  categoriaList: {
    padding: 10,
  },

  categoriaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#aab3ff',
  },

  categoriaItemSelected: {
    backgroundColor: '#F0EFFF',
    borderColor: '#0f248d',
  },

  categoriaItemText: {
    fontSize: 16,
    color: '#333',
  },

  categoriaItemCheck: {
    fontSize: 16,
    color: '#0f248d',
    fontWeight: 'bold',
  },

   novaCategoriaButton: {
    backgroundColor: '#F0EFFF',
    marginHorizontal: 20,
    marginVertical: 15,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4D48C8',
    borderStyle: 'dashed',
  },

  novaCategoriaButtonText: {
    color: '#4D48C8',
    fontSize: 16,
    fontWeight: '600',
  },

  novaCategoriaInputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#F8F8FF',
    marginBottom: 10,
  },

  novaCategoriaLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },

  novaCategoriaInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  novaCategoriaInput: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0FF',
    marginRight: 10,
  },

  novaCategoriaConfirmButton: {
    backgroundColor: '#4D48C8',
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 5,
  },

  novaCategoriaConfirmText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },

  novaCategoriaCancelButton: {
    backgroundColor: '#FF6B6B',
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  novaCategoriaCancelText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },

    separator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginVertical: 10,
  },

  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#aab3ff',
  },

  separatorText: {
    fontSize: 14,
    color: '#0f248d',
    marginHorizontal: 10,
    fontWeight: '500',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f248d',
    marginTop: 10,
    marginBottom: 20,
  },

  dateButton: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#aab3ff',
  },

  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },

  dateButtonTextPlaceholder: {
    color: '#8581FF',
  },

  inputWithCurrency: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#aab3ff',
  },

  currencySymbol: {
    paddingLeft: 16,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },

  inputWithLeftPadding: {
    flex: 1,
    paddingLeft: 8,
    borderWidth: 0,
  },

  clearButton: {
    paddingHorizontal: 16,
  },

  clearButtonText: {
    fontSize: 24,
    color: '#aab3ff',
  },

  formErrorContainer: {
    backgroundColor: '#FFE5E5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },

  formErrorText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },

  infoBox: {
    backgroundColor: '#aab3ff',
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
    marginBottom: 30,
  },

  infoText: {
    fontSize: 14,
    color: '#0f248d',
    lineHeight: 22,
  },

  infoTextBold: {
    fontWeight: 'bold',
  },

  saveButton: {
    backgroundColor: '#0f248d',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 10,
  },

  saveButtonDisabled: {
    backgroundColor: '#A5A2E8',
  },

  saveButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  bottomSpacing: {
    height: 40,
  },

});