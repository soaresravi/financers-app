import React, { useState, useRef, useEffect} from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Animated, Dimensions, Alert, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../contexts/AuthContext'; 
import { useTheme } from '../contexts/ThemeContext';

import { db } from '../services/firebase';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';

import { Keyboard } from 'react-native';

const { width } = Dimensions.get('window');

const getIconePorKey = (key: string): any => {

  const icones: Record<string, any> = {

    rendaRecorrente: require('../../assets/pasta.png'),
    rendaExtra: require('../../assets/computador-portatil.png'),
    moradia: require('../../assets/home.png'),
    energia: require('../../assets/trovao.png'),
    agua: require('../../assets/gotas.png'),
    comunicacao: require('../../assets/aplicativo-movel.png'),
    alimentacao: require('../../assets/burguer.png'),
    gas: require('../../assets/tanque-de-gas.png'),
    lazer: require('../../assets/controle-de-video-game.png'),
    reservaEmergencia: require('../../assets/bolsa-de-dinheiro.png'),
    outrasMetas: require('../../assets/alvo.png'),
  };

  return icones[key] 
};

const telasSetup = [
  
  { titulo: 'Suas rendas mensais', key: 'rendas', descricao: 'Informe suas fontes de renda.',
   
  campos: [{
    label: 'Renda recorrente (ex: salário)', key: 'rendaRecorrente', placeholder: '0,00'
  },
  
  { label: 'Renda extra (ex: freelas, hora extra)', key: 'rendaExtra', placeholder: '0,00' } 

  ]},
    
  { titulo: 'Despesas fixas', key: 'despesasFixas', descricao: 'Despesas que se repetem todo mês.',
    
  campos: [{
    label: 'Moradia/Aluguel', key: 'moradia', placeholder: '0,00'
  },
    
  { label: 'Energia', key: 'energia', placeholder: '0,00' },
  { label: 'Água', key: 'agua', placeholder: '0,00' },
  { label: 'Internet', key: 'comunicacao', placeholder: '0,00' },
    
  ]},
    
  { titulo: 'Despesas variáveis', key: 'despesasVariaveis', descricao: 'Despesas que podem variar mensalmente.',
        
  campos: [{
    label: 'Mercado', key: 'alimentacao', placeholder: '0,00'
  },
    
  { label: 'Gás', key: 'gas', placeholder: '0,00' },
  { label: 'Lazer/Outros', key: 'lazer', placeholder: '0,00' },
    
  ]},
    
  { titulo: 'Investimentos & Poupança', key: 'investimentos', descricao: 'Valores que você guarda para o futuro.',
    
  campos: [{
    label: 'Reserva de emergência', key: 'reservaEmergencia', placeholder: '0,00'
  },
    
  { label: 'Outras Metas', key: 'outrasMetas', placeholder: '0,00' }
    
  ]}

];

type RootStackParamList = {
  MainTabs: undefined;
  SetupInitial: undefined;
};

type NavigationProps = NativeStackNavigationProp<RootStackParamList>;

export default function SetupInitial() {

  const navigation = useNavigation<NavigationProps>();
  const { user } = useAuth();

  const [dados, setDados] = useState<Record<string, string>>({});
  const [telaAtual, setTelaAtual] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [keyboardOffset] = useState(new Animated.Value(0));

  const translateX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  const { temaEscuro } = useTheme();
  const styles = getStyles(temaEscuro);

  useEffect(() => {

    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (event) => {

      Animated.timing(keyboardOffset, {
        toValue: event.endCoordinates.height / 2,
        duration: 300,
        useNativeDriver: false,
      }).start();

      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 100, animated: true });
      }, 100);
        
      });

      const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
        
        Animated.timing(keyboardOffset, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false
        }).start();
        
      });

      return () => {
        keyboardDidShowListener.remove();
        keyboardDidHideListener.remove();
      };

    },

  []);

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

  const mudarValor = (chave: string, texto: string) => {

    const formatado = formatarParaDinheiro(texto);

    setDados(prev => ({
      ...prev, [chave]: formatado
    }));
    
  };

  const limparCampo = (chave: string) => {
      
    setDados(prev => ({
      ...prev, [chave]: ''
    }));
    
  };

  const avancar = () => {
      
    if (telaAtual < telasSetup.length - 1) {

      Animated.timing(translateX, {
        toValue: -(telaAtual + 1) * width,
        duration: 300,
        useNativeDriver: true,
      }).start();

      setTelaAtual(telaAtual + 1);

      scrollViewRef.current?.scrollTo({ y: 0, animated: true });

    }
      
  };

  const voltar = () => {
        
    if (telaAtual > 0) {

      Animated.timing(translateX, {
        toValue: -(telaAtual - 1) * width,
        duration: 300,
        useNativeDriver: true,
      }).start();

      setTelaAtual(telaAtual - 1);

      scrollViewRef.current?.scrollTo({ y: 0, animated: true});
    
    }
    
  };

  const salvarSetupCompleto = async () => {

    if (!user?.uid) {
      Alert.alert('Erro', 'Usuário não identificado');
      return;
    }

    setIsLoading(true);

    try {

      await updateDoc(doc(db, 'users', user.uid), { //atualiza o usuario (marca q fez setup)
        initialSetup: true,
        setupCompleted: new Date(),
        lastUpdated: new Date()
      });

      const rendasRef = collection(db, 'users', user.uid, 'rendas'); //salva rendas na subcoleção

      if (dados.rendaRecorrente && converterParaNumero(dados.rendaRecorrente) > 0) {

        await addDoc(rendasRef, {
            
          userId: user.uid,
          tipo: 'recorrente',
          valor: converterParaNumero(dados.rendaRecorrente),
          descricao: 'Renda recorrente',
          categoria: 'Salário',
          data: new Date(),
          criadoEm: new Date(),
          mes: new Date().getMonth() + 1,
          ano: new Date().getFullYear()
          
        });
      }

      if (dados.rendaExtra && converterParaNumero(dados.rendaExtra) > 0) {

        await addDoc(rendasRef, {

          userId: user.uid,
          tipo: 'extra',
          valor: converterParaNumero(dados.rendaExtra),
          descricao: 'Renda extra',
          categoria: 'Extra',
          data: new Date(),
          criadoEm: new Date(),
          mes: new Date().getMonth() + 1,
          ano: new Date().getFullYear()
          
        });
          
      }

      const despesasRef = collection(db, 'users', user.uid, 'despesas');

      const despesasFixas = [ //salva despesas (subcoleçao: despesas)
          
        { key: 'moradia', desc: 'Moradia/Aluguel', cat: 'Moradia'},
        { key: 'energia', desc: 'Energia', cat: 'Energia'},
        { key: 'agua', desc: 'Água', cat: 'Água'},
        { key: 'comunicacao', desc: 'Internet', cat: 'Comunicação'}
        
      ];

      for (const despesa of despesasFixas) {

        if (dados[despesa.key] && converterParaNumero(dados[despesa.key]) > 0) {

          await addDoc(despesasRef, {
              
            userId: user.uid,
            tipo: 'fixa',
            valor: converterParaNumero(dados[despesa.key]),
            descricao: despesa.desc,
            categoria: despesa.cat,
            recorrente: true,
            data: new Date(),
            criadoEm: new Date(),
            mes: new Date().getMonth() + 1,
            ano: new Date().getFullYear()
           
          });

        }
      }

      const despesasVariaveis = [ 
       
        { key: 'alimentacao', desc: 'Mercado', cat: 'Mercado'},
        { key: 'gas', desc: 'Gás', cat: 'gas' },
        { key: 'lazer', desc: 'Lazer', cat: 'Lazer' }
       
      ];

      for (const despesa of despesasVariaveis) {

        if (dados[despesa.key] && converterParaNumero(dados[despesa.key]) > 0) {
            
          await addDoc(despesasRef, {
              
            userId: user.uid,
            tipo: 'variavel',
            valor: converterParaNumero(dados[despesa.key]),
            descricao: despesa.desc,
            categoria: despesa.cat,
            recorrente: false,
            data: new Date(),
            criadoEm: new Date(),
            mes: new Date().getMonth() + 1,
            ano: new Date().getFullYear()
            
          });

        }
      }

      const investimentosRef = collection(db, 'users', user.uid, 'investimentos');

      const investimentos = [

        { key: 'reservaEmergencia', desc: 'Reserva de emergência', cat: 'Reserva'},
        { key: 'outrasMetas', desc: 'Outras metas', cat: 'Metas' }

      ];

      for (const investimento of investimentos) {

        if (dados[investimento.key] && converterParaNumero(dados[investimento.key]) > 0) {

          await addDoc(investimentosRef, {

            userId: user.uid,
            valor: converterParaNumero(dados[investimento.key]),
            descricao: investimento.desc,
            categoria: investimento.cat,
            meta: investimento.desc,
            data: new Date(),
            criadoEm: new Date(),
            mes: new Date().getMonth() + 1,
            ano: new Date().getFullYear()

          });

        }
      }

      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }]
      });

    } catch (error) {
        
      console.error('Erro ao salvar setup:', error);
      Alert.alert('Erro', 'Não foi possível salvar as configurações');
     
    } finally {
      setIsLoading(false);
    }
    
  };

  const progresso = ((telaAtual + 1) / telasSetup.length) * 100;

  return (
    
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

      <View style={styles.header}>
        
        <TouchableOpacity style={styles.botaoFechar} onPress={() => navigation.navigate('MainTabs')}>
          <Text style={styles.botaoFecharTexto}>✕</Text>
        </TouchableOpacity>
        
        <View style={styles.progressoContainer}>
          <View style={[styles.progressoBarra, { width: `${progresso}%` }]} />
        </View>

      </View>

      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <Animated.View style={[styles.slider, { transform: [{ translateX }] }]}>
           
          {telasSetup.map((tela, index) => (
            
            <View key={index} style={styles.tela}>
              <View style={styles.conteudoTela}>

                <Text style={styles.tituloTela}>{tela.titulo}</Text>
                <Text style={styles.descricaoTela}>{tela.descricao}</Text>

                {tela.campos.map((campo) => (
                  
                  <View style={styles.campoContainer}>
                  
                    <View style={styles.campoLabelContainer}>
                      <Image source={getIconePorKey(campo.key)} style={styles.campoIcone} />
                      <Text style={styles.campoLabel}>{campo.label}</Text>
                    </View>
                    
                    <View style={styles.inputContainer}>
                      
                      <Text style={styles.currencySymbol}>R$</Text>
                      <TextInput style={styles.input} placeholder={campo.placeholder} placeholderTextColor={temaEscuro ? '#dadafa' : '#8581FF'} value={dados[campo.key] || ''}
                      onChangeText={(texto) => mudarValor(campo.key, texto)} keyboardType="numeric" returnKeyType="done" />
                      
                      {dados[campo.key] && dados[campo.key] !== '' && (
                        
                        <TouchableOpacity style={styles.botaoLimpar} onPress={() => limparCampo(campo.key)}>
                          <Text style={styles.botaoLimparTexto}>×</Text>
                        </TouchableOpacity>

                      )}

                    </View>
                  </View>
                ))}

                {tela.key === 'rendas' && dados.rendaRecorrente && dados.rendaExtra && (
                 
                 <View style={styles.resumoCard}>
                 
                    <Text style={styles.resumoTitulo}>
                      <Image style={styles.resumoIcon} source={require('../../assets/grafico.png')} />Resumo das rendas</Text>
                 
                    <View style={styles.resumoLinha}>
                        
                      <Text style={styles.resumoLabel}>Total mensal:</Text>

                      <Text style={styles.resumoValor}> R$ {(
                        converterParaNumero(dados.rendaRecorrente) + 
                        converterParaNumero(dados.rendaExtra)
                      ).toFixed(2).replace('.', ',')} </Text>

                    </View>
                  </View>
                )}
              </View>
            </View>
          ))}
        </Animated.View>
      </ScrollView>

      <Animated.View style={[ styles.botoesContainer, { bottom: Animated.add(keyboardOffset, new Animated.Value(20)) } ]}>
        
        {telaAtual > 0 && (
          
          <TouchableOpacity style={styles.botaoVoltar} onPress={voltar}>
            <Text style={styles.botaoVoltarTexto}>&lt;- </Text>
          </TouchableOpacity>

        )}

        <View style={{ flex: 1, marginRight: telaAtual > 0 ? 5 : 0, marginLeft: telaAtual > 0 ? 20 : 0 }}>
          
          {telaAtual < telasSetup.length - 1 ? (

          <TouchableOpacity style={styles.botaoAvancar} onPress={avancar}>
            <Text style={styles.botaoAvancarTexto}>Avançar</Text>
          </TouchableOpacity>

        ) : (
         
        <TouchableOpacity style={[styles.botaoAvancar, isLoading && styles.botaoDesabilitado]} onPress={salvarSetupCompleto} disabled={isLoading}>
            
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.botaoAvancarTexto}>Concluir</Text>
          )}
            
          </TouchableOpacity>
        )}
        </View>
        
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const getStyles = (temaEscuro: boolean) => StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: temaEscuro ? '#000824' : '#dadafa',
  },

  header: {
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },

  botaoFechar: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
  },

  botaoFecharTexto: {
    color: temaEscuro ? '#dadafa' : '#0f248d',
    fontSize: 26,
  },

  progressoContainer: {
    width: '90%',
    height: 17,
    backgroundColor: '#95a2d5',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 10,
  },

  progressoBarra: {
    height: '100%',
    backgroundColor: '#0f248d',
    borderRadius: 10,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },

  slider: {
    flexDirection: 'row',
    width: width * telasSetup.length,
  },

  tela: {
    width: width,
    paddingHorizontal: 20,
  },

  conteudoTela: {
    marginTop: 20,
  },

  tituloTela: {
    fontSize: 24,
    fontFamily: 'Alatsi_400Regular',
    color: temaEscuro ? '#dadafa' : '#0f248d',
    marginBottom: 8,
  },

  descricaoTela: {
    fontSize: 16,
    color: temaEscuro ? '#dadafa' : '#0f248d',
    marginBottom: 30,
    fontFamily: 'Cabin_400Regular'
  },

  campoContainer: {
    marginBottom: 25,
  },

  campoLabel: {
    fontSize: 16,
    fontFamily: 'Cabin_700Bold',
    color: temaEscuro ? '#dadafa' : '#0f248d',
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: temaEscuro ? '#00124d' : '#FFF',
    borderRadius: 10,
    paddingHorizontal: 15,
    borderWidth: 2,
    borderColor: temaEscuro ? '#5b6fbe' : '#a2acd6',
  },

  currencySymbol: {
    fontSize: 18,
    fontFamily: 'Alatsi_400Regular',
    color: temaEscuro ? '#dadafa' : '#221377',
    marginRight: 5,
  },

  input: {
    flex: 1,
    fontSize: 18,
    paddingVertical: 12,
    color: temaEscuro ? '#dadafa' : '#221377',
    fontFamily: 'Inter_400Regular'
  },
  
  botaoLimpar: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: [{ translateY: -10 }],
    backgroundColor: temaEscuro ? '#0f248d' : '#CECECE',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  botaoLimparTexto: {
    color: temaEscuro ? '#dadafa' : '#0f248d',
    fontSize: 24,
    fontFamily: 'Cabin_400Regular'
  },

  resumoCard: {
    backgroundColor: '#0f248d',
    borderRadius: 15,
    padding: 15,
    marginTop: 20,
  },

  resumoTitulo: {
    fontSize: 16,
    fontFamily: 'Cabin_700Bold',
    color: temaEscuro ? '#dadafa' : '#FFF',
    marginBottom: 10,
  },

  resumoIcon: {
    width: 18,
    height: 18,
    marginRight: 5
  },

  resumoLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  resumoLabel: {
    fontSize: 14,
    color: temaEscuro ? '#dadafa' : '#D0CEFF',
    fontFamily: 'Inter_400Regular'
  },

  resumoValor: {
    fontSize: 20,
    fontFamily: 'Alatsi_400Regular',
    color: '#FFF',
  },

  botoesContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  botaoVoltar: {
    backgroundColor: temaEscuro ? '#0f248d' : '#a2acd6',
    borderRadius: 20,
    width: 40,
    height: 31,
    paddingHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },

  botaoVoltarTexto: {
    color: '#FFF',
    fontSize: 20,
    fontFamily: 'Inter_400Regular'
  },

  botaoAvancar: {
    width: '100%',
    backgroundColor: '#0f248d',
    paddingHorizontal: 10,
    borderRadius: 20,
    alignItems: 'center',
    paddingVertical: 5
  },

  botaoAvancarTexto: {
    color: '#FFF',
    fontSize: 22,
    fontFamily: 'Alatsi_400Regular'
  },

  botaoDesabilitado: {
    opacity: 0.7,
  },

  campoLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  campoIcone: {
    width: 18,
    height: 18,
    marginRight: 7,
  },

});