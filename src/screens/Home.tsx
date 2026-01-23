import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../contexts/AuthContext'; 
import { db } from '../services/firebase';
import { collection, doc, getDoc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import { useDateNavigation } from '../hooks/useDateNavigation';

type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  SetupInitial: undefined;
  AddIncome: undefined;
  AddExpense: undefined;
  AddInvestment: undefined;
};

type NavigationProps = NativeStackNavigationProp<RootStackParamList>;

export default function Home() { 
 
  const navigation = useNavigation<NavigationProps>();

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
   
    if (user?.uid && initialSetup) {
      carregarDadosFinanceiros();
    }

  }, [user?.uid, initialSetup, currentMonth, currentYear]);

  const carregarDadosFinanceiros = async () => {
   
    if (!user?.uid) return;
    
    try {

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

      let rendaTotal = 0; //calcula totais do mes atual

      rendasSnapshot.forEach(doc => {
        rendaTotal += doc.data().valor || 0;
      });

      let despesasTotais = 0;

      despesasSnapshot.forEach(doc => {
        despesasTotais += doc.data().valor || 0;
      });

      let investimentosTotais = 0;

      investimentosSnapshot.forEach(doc => {
        investimentosTotais += doc.data().valor || 0;
      });

      const saldoDisponivel = rendaTotal - despesasTotais - investimentosTotais;

      setDadosFinanceiros({ //salva no state
        rendaTotal,
        despesasTotais,
        investimentosTotais,
        saldoDisponivel,
        rendas: rendasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })), //guarda os docs tbm se precisar mostrar na lista depois
        despesas: despesasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        investimentos: investimentosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      });

    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);
    }

  };

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

  const handleLogout = async () => {
    await signOut();
    navigation.navigate('Login');
  };

  if (isLoading) {
   
    return (
      
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4D48C8" />
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

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
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
        
        <Text style={styles.balanceLabel}>Saldo do Mês</Text>

        <Text style={styles.balanceValue}>
          {dadosFinanceiros?.saldoDisponivel ? `R$ ${dadosFinanceiros.saldoDisponivel.toFixed(2).replace('.', ',')}` : 'R$ 0,00' }
        </Text>

        <Text style={styles.balanceSubtitle}>Disponível para gastar</Text>

      </View>

      <View style={styles.summarySection}>
        
        <Text style={styles.sectionTitle}>Resumo do Mês</Text>
        
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
          
            <Text style={styles.summaryLabel}>Renda Total</Text>

            <Text style={[styles.summaryValue, styles.incomeValue]}>
              {dadosFinanceiros?.rendaTotal ? `R$ ${dadosFinanceiros.rendaTotal.toFixed(2).replace('.', ',')}` : 'R$ 0,00'}
            </Text>

          </View>

          <View style={styles.summaryItem}>
            
            <Text style={styles.summaryLabel}>Despesas</Text>
            
            <Text style={[styles.summaryValue, styles.expenseValue]}>
              {dadosFinanceiros?.despesasTotais ? `R$ ${dadosFinanceiros.despesasTotais.toFixed(2).replace('.', ',')}` : 'R$ 0,00'}
            </Text>

          </View>

          <View style={styles.summaryItem}>
            
            <Text style={styles.summaryLabel}>Investido</Text>
            
            <Text style={[styles.summaryValue, styles.investmentValue]}>
              {dadosFinanceiros?.investimentosTotais ? `R$ ${dadosFinanceiros.investimentosTotais.toFixed(2).replace('.', ',')}` : 'R$ 0,00'}
            </Text>

          </View>
        </View>
      </View>

      <View style={styles.quickActions}>
        
        <Text style={styles.sectionTitle}>Ações Rápidas</Text>
        
        <View style={styles.actionButtons}>
          
          <TouchableOpacity style={[styles.actionButton, styles.incomeButton]} onPress={() => navigation.navigate('AddIncome')}>
            <Text style={styles.actionButtonIcon}>💰</Text>
            <Text style={styles.actionButtonText}>Nova Renda</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.expenseButton]} onPress={() => navigation.navigate('AddExpense')}>
            <Text style={styles.actionButtonIcon}>💸</Text>
            <Text style={styles.actionButtonText}>Nova Despesa</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.investmentButton]} onPress={() => navigation.navigate('AddInvestment')}>
            <Text style={styles.actionButtonIcon}>📈</Text>
            <Text style={styles.actionButtonText}>Investir</Text>
          </TouchableOpacity>

        </View>
      </View>

      <View style={styles.categoriesSection}>
       
        <View style={styles.sectionHeader}>
       
          <Text style={styles.sectionTitle}>Categorias</Text>
       
          <TouchableOpacity>
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

    <View style={styles.bottomMenu}>
      
      <TouchableOpacity style={styles.menuItem}>
        <Text style={styles.menuIcon}>📊</Text>
        <Text style={styles.menuText}>Resumo</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.menuItem}>
        <Text style={styles.menuIcon}>📝</Text>
        <Text style={styles.menuText}>Transações</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.menuItem}>
        <Text style={styles.menuIcon}>🎯</Text>
        <Text style={styles.menuText}>Metas</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
        <Text style={styles.menuIcon}>⚙️</Text>
        <Text style={styles.menuText}>Sair</Text>
      </TouchableOpacity>

    </View>
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
    paddingTop: 60,
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

  quickActions: {
    marginBottom: 30,
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
    paddingVertical: 10,
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
  },

  incomeValue: {
    color: '#00d2a8',
  },

  expenseValue: {
    color: '#F44336',
  },

  investmentValue: {
    color: '#ee00ff',
  },

  categoriesSection: {
    marginBottom: 30,
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

  bottomMenu: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#dadafa',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },

  menuItem: {
    alignItems: 'center',
  },

  menuIcon: {
    fontSize: 20,
    color: '#0f248d',
    marginBottom: 3,
  },

  menuText: {
    color: '#0f248d',
    fontSize: 12,
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