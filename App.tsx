import React from 'react';
import { StatusBar} from 'react-native';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider, useAuth } from './src/contexts/AuthContext';

import Login from './src/screens/Login';
import Cadastro from './src/screens/Cadastro';
import TabNavigator from './src/screens/TabNavigator';
import SetupInitial from './src/screens/SetupInitial';
import AddIncome from './src/screens/AddIncome';
import AddExpense from './src/screens/AddExpense';
import AddInvestment from './src/screens/AddInvestment';
import Categories from './src/screens/Categories';
import Transactions from './src/screens/Transactions';
import Goals from './src/screens/Goals';
import Settings from './src/screens/Settings';

export type RootStackParamList = {
  Login: undefined;
  Cadastro: undefined;
  MainTabs: undefined;
  SetupInitial: undefined;
  AddIncome: undefined;
  AddExpense: undefined;
  AddInvestment: undefined;
  Categories: undefined;
  Transactions: undefined;
  Goals: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator();

function AppNavigator() { //verifica se esta carregando os dados do usuario

  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    
    <Stack.Navigator screenOptions={{ headerShown: false }}>
     
      { user ? ( //se ta autenticado vai p tela inicial

      <>
        
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen name="SetupInitial" component={SetupInitial} />
        <Stack.Screen name="AddIncome" component={AddIncome} />
        <Stack.Screen name="AddExpense" component={AddExpense} />
        <Stack.Screen name="AddInvestment" component={AddInvestment} />
        <Stack.Screen name="Categories" component={Categories} />
        <Stack.Screen name="Transactions" component={Transactions} />
        <Stack.Screen name="Goals" component={Goals} />
        <Stack.Screen name="Settings" component={Settings} />

      </>  
    
      ) : ( //se nn esta vai p login/cadastro
       
        <>
       
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="Cadastro" component={Cadastro} />
       
        </>
      )}
    </Stack.Navigator>
  );

}

export default function App() {
  
  return (
    
    <AuthProvider>
     
      <StatusBar backgroundColor='#dadafa' barStyle='light-content' />
     
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
      
    </AuthProvider>
  );
  
}