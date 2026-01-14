import React, { use } from 'react';
import { StatusBar} from 'react-native';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Login from './src/screens/Login';
import Cadastro from './src/screens/Cadastro';
import Home from './src/screens/Home';

import { AuthProvider, useAuth } from './src/contexts/AuthContext';

export type RootStackParamList = {
  Login: undefined;
  Cadastro: undefined;
  Home: undefined;
};

const Stack = createNativeStackNavigator();

function AppNavigator() {

  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    
    <Stack.Navigator screenOptions={{ headerShown: false }}>
     
      { user ? (
        
        <Stack.Screen name="Home" component={Home} />
    
      ) : (
       
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
     
      <StatusBar backgroundColor='221377' barStyle='light-content' />
     
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
      
    </AuthProvider>
  );
  
}

