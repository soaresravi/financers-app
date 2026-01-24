import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, Alert, Platform } from 'react-native';

import DateTimePicker from '@react-native-community/datetimepicker';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../contexts/AuthContext'; 
import { db } from '../services/firebase';
import { collection, addDoc} from 'firebase/firestore';

type RootStackParamList = {
    Home: undefined;
    AddIncome: undefined;
};

type NavigationProps = NativeStackNavigationProp<RootStackParamList>;

type IncomeType = 'recorrente' | 'extra';

type IncomeData = {
    nome: string;
    tipo: IncomeType;
    valorPrevisto: string;
    valorReal: string;
    dataPrevista: Date | null;
    dataReal: Date | null;
};

export default function AddIncome() {

    const navigation = useNavigation<NavigationProps>();
    const { user } = useAuth();

    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState<IncomeData>({
        nome: '',
        tipo: 'recorrente',
        valorPrevisto: '',
        valorReal: '',
        dataPrevista: null,
        dataReal: null
    });

    const [errors, setErros] = useState({
        nome: '',
        tipo: '',
        valorPrevisto: '',
        valorReal: '',
        dataPrevista: '',
        dataReal: '',
        form: ''
    });

    const [showDatePrevistaPicker, setShowDatePrevistaPicker] = useState(false);
    const [showDateRealPicker, setShowDateRealPicker] = useState(false);

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

    const validateField = (field: keyof IncomeData, value: any): boolean => {
        
        let error = '';

        switch (field) {
            
            case 'nome':
                if (!value.trim()) error = 'Nome é obrigatório';
                else if (value.length < 2) error = 'Nome muito curto';
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

        setErros(prev => ({ ...prev, [field]: error }));
        return error === '';
   
    };

    const handleChange = (field: keyof IncomeData, value: any) => {

        setFormData(prev => ({ ...prev, [field]: value }));

        if (value && errors[field]) {
            setErros(prev => ({ ...prev, [field]: '' }));
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
            !formData.valorPrevisto && !formData.valorReal ? false : true,
            !formData.valorPrevisto && !formData.dataReal ? false : true
        ];

        const isValid = validations.every(v => v === true);

        if (!isValid) {
           
            setErros(prev => ({
                ...prev, form: 'Preencha todos os campos obrigatórios'
            }));

        } else {
            setErros(prev => ({ ...prev, form: ''}));
        }

        return isValid;
    
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

            const rendasRef = collection(db, 'users', user.uid, 'rendas');

            await addDoc(rendasRef, {
                userId: user.uid,
                nome: formData.nome.trim(),
                tipo: formData.tipo,
                valorprevisto: valorPrevistoNum,
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

            Alert.alert('Sucesso!', 'Renda adicionada com sucesso!', [{ text: 'OK', onPress: () => navigation.goBack() }]);

        } catch (error) {
           
            console.error('Erro ao salvar renda:', error);
            Alert.alert('Erro', 'Não foi possível salvar a renda');
     
        } finally {
            setIsLoading(false);
        }
    };

    const limparCampoValor = (campo: 'valorPrevisto' | 'valorReal') => {
        handleChange(campo, '');
        setErros(prev => ({ ...prev, [campo]: '' }));
    };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Nova Renda</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Campo Nome */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nome da renda</Text>
          <TextInput
            style={[
              styles.input,
              errors.nome ? styles.inputError : null
            ]}
            placeholder="Ex: Salário, Freelance, Bônus..."
            placeholderTextColor="#8581FF"
            value={formData.nome}
            onChangeText={(text) => handleChange('nome', text)}
            onBlur={() => validateField('nome', formData.nome)}
            maxLength={50}
          />
          {errors.nome ? (
            <Text style={styles.errorText}>{errors.nome}</Text>
          ) : null}
        </View>

        {/* Campo Tipo */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tipo</Text>
          <View style={styles.typeContainer}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                formData.tipo === 'recorrente' && styles.typeButtonActive
              ]}
              onPress={() => handleChange('tipo', 'recorrente')}
            >
              <Text style={[
                styles.typeButtonText,
                formData.tipo === 'recorrente' && styles.typeButtonTextActive
              ]}>
                💼 Recorrente
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.typeButton,
                formData.tipo === 'extra' && styles.typeButtonActive
              ]}
              onPress={() => handleChange('tipo', 'extra')}
            >
              <Text style={[
                styles.typeButtonText,
                formData.tipo === 'extra' && styles.typeButtonTextActive
              ]}>
                ✨ Extra
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Seção Previsão */}
        <Text style={styles.sectionTitle}>Previsão</Text>
        
        {/* Data Prevista */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Data prevista</Text>
          <TouchableOpacity
            style={[
              styles.dateButton,
              errors.dataPrevista ? styles.inputError : null
            ]}
            onPress={() => setShowDatePrevistaPicker(true)}
          >
            <Text style={[
              styles.dateButtonText,
              !formData.dataPrevista && styles.dateButtonTextPlaceholder,
              errors.dataPrevista ? styles.errorText : null
            ]}>
              {formatarData(formData.dataPrevista)}
            </Text>
          </TouchableOpacity>
          
          {errors.dataPrevista ? (
            <Text style={styles.errorText}>{errors.dataPrevista}</Text>
          ) : null}
          
          {showDatePrevistaPicker && (
            <DateTimePicker
              value={formData.dataPrevista || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowDatePrevistaPicker(false);
                if (selectedDate) {
                  handleDateChange('dataPrevista', selectedDate);
                }
              }}
            />
          )}
        </View>

        {/* Valor Previsto */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Valor previsto (R$)</Text>
          <View style={[
            styles.inputWithCurrency,
            errors.valorPrevisto ? styles.inputError : null
          ]}>
            <Text style={styles.currencySymbol}>R$</Text>
            <TextInput
              style={[styles.input, styles.inputWithLeftPadding]}
              placeholder="0,00"
              placeholderTextColor="#8581FF"
              value={formData.valorPrevisto}
              onChangeText={(text) => {
                const formatado = formatarParaDinheiro(text);
                handleChange('valorPrevisto', formatado);
              }}
              onBlur={() => validateField('valorPrevisto', formData.valorPrevisto)}
              keyboardType="numeric"
              returnKeyType="done"
            />
            {formData.valorPrevisto ? (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => limparCampoValor('valorPrevisto')}
              >
                <Text style={styles.clearButtonText}>×</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {errors.valorPrevisto ? (
            <Text style={styles.errorText}>{errors.valorPrevisto}</Text>
          ) : null}
        </View>

        {/* Seção Realizado */}
        <Text style={styles.sectionTitle}>Realizado</Text>
        
        {/* Data Real */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Data real (quando recebeu)</Text>
          <TouchableOpacity
            style={[
              styles.dateButton,
              errors.dataReal ? styles.inputError : null
            ]}
            onPress={() => setShowDateRealPicker(true)}
          >
            <Text style={[
              styles.dateButtonText,
              !formData.dataReal && styles.dateButtonTextPlaceholder,
              errors.dataReal ? styles.errorText : null
            ]}>
              {formatarData(formData.dataReal)}
            </Text>
          </TouchableOpacity>
          
          {errors.dataReal ? (
            <Text style={styles.errorText}>{errors.dataReal}</Text>
          ) : null}
          
          {showDateRealPicker && (
            <DateTimePicker
              value={formData.dataReal || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowDateRealPicker(false);
                if (selectedDate) {
                  handleDateChange('dataReal', selectedDate);
                }
              }}
            />
          )}
        </View>

        {/* Valor Real */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Valor real (R$)</Text>
          <View style={[
            styles.inputWithCurrency,
            errors.valorReal ? styles.inputError : null
          ]}>
            <Text style={styles.currencySymbol}>R$</Text>
            <TextInput
              style={[styles.input, styles.inputWithLeftPadding]}
              placeholder="0,00"
              placeholderTextColor="#8581FF"
              value={formData.valorReal}
              onChangeText={(text) => {
                const formatado = formatarParaDinheiro(text);
                handleChange('valorReal', formatado);
              }}
              onBlur={() => validateField('valorReal', formData.valorReal)}
              keyboardType="numeric"
              returnKeyType="done"
            />
            {formData.valorReal ? (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => limparCampoValor('valorReal')}
              >
                <Text style={styles.clearButtonText}>×</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {errors.valorReal ? (
            <Text style={styles.errorText}>{errors.valorReal}</Text>
          ) : null}
        </View>

        {/* Erro geral do formulário */}
        {errors.form ? (
          <View style={styles.formErrorContainer}>
            <Text style={styles.formErrorText}>⚠️ {errors.form}</Text>
          </View>
        ) : null}

        {/* Nota Informativa */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 <Text style={styles.infoTextBold}>Importante:</Text> O sistema usará o valor e data REAIS 
            se preenchidos. Caso contrário, usará os valores PREVISTOS.
          </Text>
        </View>

        {/* Botão Salvar */}
        <TouchableOpacity
          style={[
            styles.button,
            isLoading ? styles.buttonDisabled : null,
            errors.form ? styles.buttonDisabled : null
          ]}
          onPress={handleSalvar}
          disabled={isLoading || !!errors.form}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>Salvar Renda</Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#4D48C8',
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
    borderColor: '#E0E0FF',
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
    borderColor: '#E0E0FF',
  },
  typeButtonActive: {
    backgroundColor: '#4D48C8',
    borderColor: '#4D48C8',
  },
  typeButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: '#FFF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4D48C8',
    marginTop: 10,
    marginBottom: 20,
  },
  dateButton: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0FF',
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
    borderColor: '#E0E0FF',
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
    color: '#8581FF',
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
    backgroundColor: '#E0E0FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
    marginBottom: 30,
  },
  infoText: {
    fontSize: 14,
    color: '#4D48C8',
    lineHeight: 20,
  },
  infoTextBold: {
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#4D48C8',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#A5A2E8',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomSpacing: {
    height: 40,
  },
});