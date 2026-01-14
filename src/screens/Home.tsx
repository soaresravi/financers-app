import React from 'react';
import { View, Text } from 'react-native';

export default function Home() {
  
  return (
    
    <View>
      
      <Text>Home</Text>

      <View>
        <Text>Dia: </Text>
        <Text>Mês: Setembro</Text>
        <Text>Ano: 2026</Text>
      </View>
    
      <View>
        <Text>Rendas</Text>
        <Text>Recorrentes</Text>
        <Text>Extras</Text>
      </View>

      <View>
        <Text>Despesas</Text>
        <Text>Recorrentes</Text>
        <Text>Extras (alimentação, lazer, transporte...)</Text>
      </View>

      <View>
        <Text>Investimentos / Poupança</Text>
      </View>

      <View>
        <Text>Resumo do mês</Text>
        <Text>Saldo restante: R$ 0,00</Text>
      </View>
    </View>
  );
}
