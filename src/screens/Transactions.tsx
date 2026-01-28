import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';

import { useAuth } from '../contexts/AuthContext'; 
import { db } from '../services/firebase';
import { collection, doc} from 'firebase/firestore';

export default function Transactions() {
    
  return (
          
    <View>
      <ActivityIndicator size="large" color="#dadafa" />
        <Text>Carregando...</Text>
    </View>
    
  );
}