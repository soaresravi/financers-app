import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  Login: undefined;
  Cadastro: undefined;
  Home: undefined;
};

type NavigationProps = NativeStackNavigationProp<RootStackParamList>;

export default function Login() {
  
  const navigation = useNavigation<NavigationProps>();

  return (
    
    <View>
      
      <Text>Login</Text>

      <TouchableOpacity onPress={() => navigation.navigate('Cadastro')}>
        <Text>Cadastro</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Home')}>
        <Text>Entrar</Text>
      </TouchableOpacity>
  
    </View>
  );
}
