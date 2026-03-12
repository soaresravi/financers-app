import React from 'react';
import { StatusBar, View, ActivityIndicator } from 'react-native';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useFonts as useCabin, Cabin_400Regular, Cabin_700Bold } from '@expo-google-fonts/cabin';
import { useFonts as useInter, Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';
import { useFonts as useAlatsi, Alatsi_400Regular } from '@expo-google-fonts/alatsi';

import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';

import Login from './src/screens/Login';
import EsqueciSenha from './src/screens/EsqueciSenha';
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
  EsqueciSenha: undefined;
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

  const { user, isLoading: authLoading } = useAuth();
  const {temaEscuro} = useTheme();

  if (authLoading) {

    return (
      
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: temaEscuro ? '#000824' : '#dadafa' }}>
        <ActivityIndicator size="large" color="#0f248d" />
      </View>

    );

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
          <Stack.Screen name="EsqueciSenha" component={EsqueciSenha} />
          <Stack.Screen name="Cadastro" component={Cadastro} />
       
        </>
      )}
      
    </Stack.Navigator>
  );

}

export default function App() {

  const [InterLoaded] = useInter({ Inter_400Regular, Inter_700Bold });
  const [CabinLoaded] = useCabin({ Cabin_400Regular, Cabin_700Bold });
  const [AlatsiLoaded] = useAlatsi({ Alatsi_400Regular})

  if (!InterLoaded || !CabinLoaded || !AlatsiLoaded) {

    return (
      
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#dadafa' }}>
        <ActivityIndicator size="large" color="#0f248d" />
      </View>

    );

  }
  
  return (
  
  <AuthProvider> 
    
    <ThemeProvider> 
      
      <StatusBar backgroundColor='#dadafa' barStyle='light-content' />
      
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>

    </ThemeProvider>

  </AuthProvider>

  );
  
}