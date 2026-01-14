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

export default function Cadastro() {
 
  const navigation = useNavigation<NavigationProps>();

  return (
   
   <View>
      
      <Text>Cadastro</Text>

      <TouchableOpacity onPress={() => navigation.navigate('Home')}>
        <Text>Cadastrar</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text>Voltar</Text>
      </TouchableOpacity>

    </View>
  );
}
