import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from 'react-native';

import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Svg, { G, Path, Text as SvgText } from 'react-native-svg';

import { useAuth } from '../contexts/AuthContext'; 
import { db } from '../services/firebase';
import { collection, doc, getDoc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import { useDateNavigation } from '../hooks/useDateNavigation';

type RootStackParamList = {
  MainTabs: undefined;
  Home: undefined;
  Login: undefined;
  SetupInitial: undefined;
  AddIncome: undefined;
  AddExpense: undefined;
  AddInvestment: undefined;
  Categories: undefined;
};

type NavigationProps = NativeStackNavigationProp<RootStackParamList>;

type PieChartItem = {
  name: string;
  value: number;
  color: string;
  percentage: number;
};

type Coordinates = {
  path: string;
  textX: number;
  textY: number;
};

export default function Home() { 
 
  const navigation = useNavigation<NavigationProps>();
  
  const isFocused = useIsFocused();
  const  { user, signOut } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [initialSetup, setInitialSetup] = useState(false);
  const [dadosFinanceiros, setDadosFinanceiros] = useState<any>(null);

  const {
    formattedMonthYear,
    currentMonth,
    currentYear,
    goToPreviousMonth,
    goToNextMonth,
    goToToday
  } = useDateNavigation();

  useEffect(() => {
    checkUserSetup();
  }, []);

  const checkUserSetup = async () => {
    
    if (!user?.uid) return;

    try {
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        setInitialSetup(userData.initialSetup || false);
      }

    } catch (error) {
      console.error('Erro ao verificar setup:', error);
    
    } finally {
      setIsLoading(false);
    }
  
  };

  useEffect(() => {
   
    if (isFocused && user?.uid && initialSetup) {
      carregarDadosFinanceiros();
    }

  }, [user?.uid, initialSetup, currentMonth, currentYear, isFocused]);

  const carregarDadosFinanceiros = async () => {
   
    if (!user?.uid) return;
    
    try {

      setIsLoading(true);

      const rendasRef = collection(db, 'users', user.uid, 'rendas');
      const despesasRef = collection(db, 'users', user.uid, 'despesas');
      const investimentosRef = collection(db, 'users', user.uid, 'investimentos');
      
      const queryRendas = query(
        rendasRef,
        where('mes', '==', currentMonth),
        where('ano', '==', currentYear)
      );

      const queryDespesas = query(
        despesasRef,
        where('mes', '==', currentMonth),
        where('ano', '==', currentYear)
      );

      const queryInvestimentos = query(
        investimentosRef,
        where('mes', '==', currentMonth),
        where('ano', '==', currentYear)
      );

      const [rendasSnapshot, despesasSnapshot, investimentosSnapshot] = await Promise.all([ //executa as queries em paralelo
        getDocs(queryRendas),
        getDocs(queryDespesas),
        getDocs(queryInvestimentos)
      ]);

      let rendaRecorrente = 0;
      let rendaExtra = 0;

      rendasSnapshot.forEach(doc => {

        const data = doc.data();

        if (data.tipo === 'recorrente') {
          rendaRecorrente += data.valor || 0;
        } else if (data.tipo === 'extra') {
          rendaExtra += data.valor || 0;
        }

      });

      let despesasRecorrentes = 0;
      let despesasExtras = 0;

      despesasSnapshot.forEach(doc => {

        const data = doc.data();

        if (data.tipo === 'fixa') {
          despesasRecorrentes += data.valor || 0;
        } else if (data.tipo === 'variavel') {
          despesasExtras += data.valor || 0;
        }

      });

      let investimentosTotais = 0;

      investimentosSnapshot.forEach(doc => {
        investimentosTotais += doc.data().valor || 0;
      });

      const rendaTotal = rendaRecorrente + rendaExtra;
      const despesasTotais = despesasRecorrentes + despesasExtras;
      const saldoDisponivel = rendaTotal - despesasTotais - investimentosTotais;

      setDadosFinanceiros({
        
        rendaRecorrente,
        rendaExtra,
        rendaTotal,
        despesasRecorrentes,
        despesasExtras,
        despesasTotais,
        investimentosTotais,
        saldoDisponivel,

        rendas: rendasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        despesas: despesasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        investimentos: investimentosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      });

    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);
  
    } finally {
      setIsLoading(false);
    }

  };

  useEffect(() => {
   
    if (isFocused && user?.uid && initialSetup) {
      carregarDadosFinanceiros();
    }

  }, [isFocused]);

  const handleCompleteSetup = async () => {

    if (!user?.uid) return;

    try {

      await updateDoc(doc(db, 'users', user.uid), {
        initialSetup: true
      });

      setInitialSetup(true);

    } catch (error) {
      console.error('Erro ao atualizar setup:', error);
    }
  
  };

  const getPieChartData = (): PieChartItem[] => {

    const rendaTotal = dadosFinanceiros?.rendaTotal || 0;
    const despesasTotais = dadosFinanceiros?.despesasTotais || 0;
    const investimentosTotais = dadosFinanceiros?.investimentosTotais || 0;

    const totalGeral = rendaTotal + despesasTotais + investimentosTotais;

    if (totalGeral === 0) {

      return [
        
        { name: 'Renda total', value: 0, color: '#CCCCCC', percentage: 0 },
        { name: 'Despesas totais', value: 0, color: '#CCCCCC', percentage: 0 },
        { name: 'Caixinha', value: 0, color: '#CCCCCC', percentage: 0 }
      
      ];

    }

    const rendaPorcentagem = parseFloat(((rendaTotal / totalGeral) * 100).toFixed(1));
    const despesasPorcentagem = parseFloat(((despesasTotais / totalGeral) * 100).toFixed(1));
    const investimentosPorcentagem = parseFloat(((investimentosTotais / totalGeral) * 100).toFixed(1));

    return [
      
      { name: 'Renda total', value: rendaTotal, color: '#674EA7', percentage: rendaPorcentagem },
      { name: 'Despesas totais', value: despesasTotais, color: '#73FFA1', percentage: despesasPorcentagem },
      { name: 'Caixinha', value: investimentosTotais, color: '#FF5555', percentage: investimentosPorcentagem }
    
    ];

  };

  const calculateCoordinates = (
    
    startAngle: number,
    endAngle: number,
    radius: number,
    center: number
 
  ): Coordinates => {
    
    const startRad = (startAngle - 90) * Math.PI / 180;
    const endRad = (endAngle - 90) * Math.PI / 180;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const largeArcFlag = (endAngle - startAngle) > 180 ? 1 : 0;

    const middleAngle = (startAngle + (endAngle - startAngle) / 2);
    const middleRad = (middleAngle - 90) * Math.PI / 180;

    return {
      path: `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`,
      textX: center + (radius * 0.7) * Math.cos(middleRad),
      textY: center + (radius * 0.7) * Math.sin(middleRad)
    };

  };
  if (isLoading) {
   
    return (
      
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#dadafa" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>

    );

  }

  if (!initialSetup) {
    
    return (
       
      <View style={styles.container}>
        
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.header}>
            <Text style={styles.title}>👋 Bem-vindo, {user?.name || 'Usuário'}!</Text>
            <Text style={styles.subtitle}>Vamos configurar suas finanças!!</Text>
          </View>

          <View style={styles.setupCard}>
            
            <Text style={styles.setupTitle}>Setup Inicial</Text>
            <Text style={styles.setupDescription}>Para começar, precisamos saber sobre sua renda mensal e principais despesas. Você poderá alterar depois.</Text>

            <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('SetupInitial')}>
              <Text style={styles.primaryButtonText}> Começar configuração </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={handleCompleteSetup}>
              <Text style={styles.secondaryButtonText}> Pular por enquanto </Text>
            </TouchableOpacity>

          </View>

          <View style={styles.infoBox}>
            <Text style={[styles.infoText, { fontWeight: 'bold', color: 'white' }]}>Dica </Text>
            <Text style={styles.infoText}>Configurar sua renda ajuda o app a mostrar quanto você pode gastar e quanto já gastou esse mês </Text>
          </View>

        </ScrollView>
        
        <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
          <Text style={styles.logoutButtonText}> Sair </Text>
        </TouchableOpacity>

      </View>      
    );
  }
  
  return (
  
  <View style={styles.container}>
    
    <View style={styles.monthHeader}>
      
      <TouchableOpacity style={styles.monthNavButton} onPress={goToPreviousMonth}>
        <Text style={styles.monthNavIcon}>‹</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.monthTextContainer} onPress={goToToday}>
        <Text style={styles.monthText}>{formattedMonthYear}</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.monthNavButton} onPress={goToNextMonth}>
        <Text style={styles.monthNavIcon}>›</Text>
      </TouchableOpacity>
   
    </View>

    <ScrollView contentContainerStyle={styles.dashboardContent}>
      
      <View style={styles.header}>
        <Text style={styles.title}>💰 FinanceRS</Text>
        <Text style={styles.greeting}>Olá, {user?.name}!</Text>
      </View>

      <View style={styles.balanceCard}>
        
        <Text style={styles.balanceLabel}>Saldo do mês</Text>

        <Text style={styles.balanceValue}>
          {dadosFinanceiros?.saldoDisponivel ? `R$ ${dadosFinanceiros.saldoDisponivel.toFixed(2).replace('.', ',')}` : 'R$ 0,00' }
        </Text>

        <Text style={styles.balanceSubtitle}>Disponível para gastar</Text>

      </View>

      {(dadosFinanceiros?.rendaTotal > 0) && (

        <View style={styles.chartSection}>
        
          <Text style={styles.sectionTitle}>Distribuição financeira</Text>
        
          <View style={styles.chartWrapper}>
          
            <View style={styles.pieChartContainer}>
            
              <Svg width={180} height={180}>
              
                {(() => {
                
                  const data = getPieChartData();
                  let currentAngle = 0;
                
                  return data.map((item, index) => {
                  
                    if (item.percentage === 0) return null;
                  
                    const angle = (item.percentage / 100) * 360;
                    const coordinates = calculateCoordinates( currentAngle, currentAngle + angle, 80, 90 );
                  
                    currentAngle += angle;
                  
                    return (
                    
                    <G key={item.name}>
                    
                      <Path d={coordinates.path} fill={item.color} stroke="#fff" strokeWidth="1" />
                    
                      {item.percentage > 5 && (
                      
                        <SvgText x={coordinates.textX} y={coordinates.textY} textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="bold"
                        fontFamily="System"> {item.percentage}% </SvgText>

                      )}

                    </G>
                  );
                });

              })()}
              </Svg>

            </View>
          
            <View style={styles.legendContainer}>
            
              {getPieChartData().map((item) => (
              
                <View key={item.name} style={styles.legendItem}>  
                  <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                  <Text style={styles.legendText}>{item.name}</Text>
                </View>

              ))}

           </View>

          </View>
        </View>

      )}
      
      <View style={styles.quickActions}>
        
        <Text style={styles.sectionTitle}>Ações rápidas</Text>
        
        <View style={styles.actionButtons}>
          
          <TouchableOpacity style={[styles.actionButton, styles.incomeButton]} onPress={() => navigation.navigate('AddIncome')}>
            <Text style={styles.actionButtonIcon}>💰</Text>
            <Text style={styles.actionButtonText}>Nova renda</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.expenseButton]} onPress={() => navigation.navigate('AddExpense')}>
            <Text style={styles.actionButtonIcon}>💸</Text>
            <Text style={styles.actionButtonText}>Nova despesa</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.investmentButton]} onPress={() => navigation.navigate('AddInvestment')}>
            <Text style={styles.actionButtonIcon}>📈</Text>
            <Text style={styles.actionButtonText}>Caixinha</Text>
          </TouchableOpacity>

        </View>
      </View>

      <View style={styles.summarySection}>
        
        <Text style={styles.sectionTitle}>Resumo do mês</Text>
        
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
          
            <Text style={styles.summaryLabel}>Renda recorrente</Text>

            <Text style={[styles.summaryValue]}>
              {dadosFinanceiros?.rendaRecorrente ? `R$ ${dadosFinanceiros.rendaRecorrente.toFixed(2).replace('.', ',')}` : 'R$ 0,00'}
            </Text>

          </View>

          <View style={styles.summaryItem}>
            
            <Text style={styles.summaryLabel}>Renda extra</Text>
            
            <Text style={styles.summaryValue}>
              {dadosFinanceiros?.rendaExtra ? `R$ ${dadosFinanceiros.rendaExtra.toFixed(2).replace('.', ',')}` : 'R$ 0,00'}
            </Text>

          </View>

          <View style={styles.summaryItem}>
            
            <Text style={styles.summaryLabel}>Despesas recorrentes</Text>
            
            <Text style={styles.summaryValue}>
              {dadosFinanceiros?.despesasRecorrentes ? `R$ ${dadosFinanceiros.despesasRecorrentes.toFixed(2).replace('.', ',')}` : 'R$ 0,00'}
            </Text>

          </View>

          <View style={styles.summaryItem}>
            
            <Text style={styles.summaryLabel}>Despesas extras</Text>
            
            <Text style={styles.summaryValue}>
              {dadosFinanceiros?.despesasExtras ? `R$ ${dadosFinanceiros.despesasExtras.toFixed(2).replace('.', ',')}` : 'R$ 0,00'}
            </Text>

          </View>

          <View style={styles.summaryItem}>
            
            <Text style={styles.summaryLabel}>Cofrinho/Investimentos</Text>
            
            <Text style={styles.summaryValue}>
              {dadosFinanceiros?.investimentosTotais ? `R$ ${dadosFinanceiros.investimentosTotais.toFixed(2).replace('.', ',')}` : 'R$ 0,00'}
            </Text>

          </View>
        </View>
      </View>

      <View>
       
        <View style={styles.sectionHeader}>
       
          <Text style={styles.sectionTitle}>Categorias</Text>
       
          <TouchableOpacity onPress={() => navigation.navigate('Categories')}>
            <Text style={styles.seeAllText}>Ver todas</Text>
          </TouchableOpacity>

        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
         
          <View style={styles.categoryChip}>
            <Text style={styles.categoryChipText}>🏠 Moradia</Text>
          </View>

          <View style={styles.categoryChip}>
            <Text style={styles.categoryChipText}>🍔 Alimentação</Text>
          </View>

          <View style={styles.categoryChip}>
            <Text style={styles.categoryChipText}>🚗 Transporte</Text>
          </View>

          <View style={styles.categoryChip}>
            <Text style={styles.categoryChipText}>🎮 Lazer</Text>
          </View>

        </ScrollView>
      </View>
    </ScrollView>

  </View>
);
}


const styles = StyleSheet.create({

  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#dadafa',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#a2acd6',
  },

  monthNavButton: {
    padding: 10,
  },

  monthNavIcon: {
    color: '#0f248d',
    fontSize: 24,
    fontWeight: 'bold',
  },

  monthTextContainer: {
    alignItems: 'center',
  },
  
  monthText: {
    color: '#0f248d',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  container: {
    flex: 1,
    backgroundColor: '#dadafa',
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f248d',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    color: '#FFF',
    marginTop: 10,
    fontSize: 16,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 30,
  },

  dashboardContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },

  header: {
    marginBottom: 30,
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f248d',
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 16,
    color: '#0f248d',
    paddingBottom: 20
  },

  greeting: {
    fontSize: 18,
    color: '#0f248d',
    marginTop: 5,
  },

  setupCard: {
    backgroundColor: '#0f248d',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },

  setupTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },

  setupDescription: {
    fontSize: 16,
    color: '#D0CEFF',
    marginBottom: 25,
    lineHeight: 22,
  },

  primaryButton: {
    backgroundColor: 'white',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },

  primaryButtonText: {
    color: '#0f248d',
    fontSize: 16,
    fontWeight: 'bold',
  },

  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D0CEFF',
  },

  secondaryButtonText: {
    color: 'white',
    fontSize: 16,
  },

  infoBox: {
    backgroundColor: '#0f248d',
    borderRadius: 10,
    padding: 15,
    marginTop: 20,
  },

  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f248d',
    marginBottom: 5,
  },

  infoText: {
    fontSize: 14,
    color: '#D0CEFF',
    lineHeight: 20,
  },
  
  balanceCard: {
    backgroundColor: '#0f248d',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    marginBottom: 30,
  },

  balanceLabel: {
    fontSize: 16,
    color: '#D0CEFF',
    marginBottom: 5,
  },

  balanceValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 5,
  },

  balanceSubtitle: {
    fontSize: 14,
    color: '#D0CEFF',
  },
  
  chartSection: {
    marginTop: 10, 
    marginBottom: 15,
  },

  chartWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },

  pieChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  legendContainer: {
    paddingLeft: 15,
    flex: 1,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  legendColor: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 10,
  },

  legendText: {
    fontSize: 14,
    color: '#0f248d',
    fontWeight: 'bold',
  },

  quickActions: {
    marginTop: 10,
    marginBottom: 20, 
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f248d',
    marginBottom: 15,
  },

  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  actionButton: {
    flex: 1,
    backgroundColor: '#0f248d',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginHorizontal: 5,
  },

  incomeButton: {
    backgroundColor: '#00d2a8',
  },

  expenseButton: {
    backgroundColor: '#F44336',
  },

  investmentButton: {
    backgroundColor: '#ee00ff',
  },

  actionButtonIcon: {
    fontSize: 24,
    marginBottom: 5,
  },

  actionButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },

  summarySection: {
    marginBottom: 30,
  },

  summaryCard: {
    backgroundColor: '#0f248d',
    borderRadius: 15,
    padding: 20,
  },

  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#0f248d',
  },

  summaryLabel: {
    fontSize: 16,
    color: 'white',
  },

  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'rgb(245, 236, 236)'
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },

  seeAllText: {
    color: '#0f248d',
    fontSize: 14,
  },

  categoryChip: {
    backgroundColor: '#0f248d',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
  },

  categoryChipText: {
    color: 'white',
    fontSize: 14,
  },

  logoutButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },

  logoutButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
  },
});