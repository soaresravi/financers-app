import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Alert, SectionList, TextInput, Modal, FlatList } from 'react-native';

import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import DateTimePicker from '@react-native-community/datetimepicker';

import { useAuth } from '../contexts/AuthContext'; 
import { db } from '../services/firebase';
import { collection, doc, getDoc, getDocs, deleteDoc, Timestamp, updateDoc, setDoc, query, where} from 'firebase/firestore';

type RootStackParamList = {
  MainTabs: undefined;
  AddIncome: { transacaoId?: string };
  AddExpense: { transacaoId?: string };
  AddInvestment: { transacaoId?: string};
  Transactions: undefined;
};

type NavigationProps = NativeStackNavigationProp<RootStackParamList>;

type TransacaoTipo = 'renda' | 'despesa' | 'investimento';

interface Transacao {
  id: string;
  tipo: TransacaoTipo;
  subtipo: 'recorrente' | 'extra' | 'fixa' | 'variavel' | string;
  nome: string;
  valor: number;
  categoria: string;
  data: Timestamp;
  realizado: boolean;
  criadoEm: Timestamp;
  mes?: number;
  ano?: number;
  userId?: string;
}

interface TransacaoAgrupada {
  title: string;
  data: Transacao[];
  total: number;
}

const categoriasPadraoDespesa = [
  '🏠 Moradia', '🍔 Alimentação', '🚗 Transporte', '🎮 Lazer', '🏥 Saúde', '📚 Educação', '📦 Outros'
];

const categoriasPadraoInvestimento = [
  '💰 Reserva de emergência', '📈 Investimentos & CDB', '📦 Outros'
];

export default function Transactions() {

  const navigation = useNavigation<NavigationProps>();
  const { user } = useAuth();
  const isFocused = useIsFocused();

  const [loading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
 
  const [transacoesFiltradas, setTransacoesFiltradas] = useState<TransacaoAgrupada[]>([]);
  const [transacoesAgrupadas, setTransacoesAgrupadas] = useState<TransacaoAgrupada[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<TransacaoTipo | 'todos'>('todos');
  const [busca, setBusca] = useState('');
 
  const [transacaoParaExcluir, setTransacaoParaExcluir] = useState<Transacao | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [transacaoParaEditar, setTransacaoParaEditar] = useState<Transacao | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const [categoriasDisponiveis, setCategoriasDisponiveis] = useState<string[]>([]);
  const [novaCategoria, setNovaCategoria] = useState('');
  
  const [mostrarPickerDataPrevista, setMostrarPickerDataPrevista] = useState(false);
  const [mostrarPickerDataReal, setMostrarPickerDataReal] = useState(false);

  const [showFiltroAvancado, setShowFiltroAvancado] = useState(false);
  const [filtroPeriodo, setFiltroPeriodo] = useState<'todos' | 'hoje' | 'mes' | 'ano' | 'personalizado'>('todos');
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
  const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth() + 1);
  const [diaSelecionado, setDiaSelecionado] = useState(new Date().getDate());
  const [dataInicioPersonalizada, setDataInicioPersonalizada] = useState<Date | null>(null);
  const [dataFimPersonalizada, setDataFimPersonalizada] = useState<Date | null>(null);
  const [showDatePickerInicio, setShowDatePickerInicio] = useState(false);
  const [showDatePickerFim, setShowDatePickerFim] = useState(false);

  const meses = [ 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const anos = [
    new Date().getFullYear() -2,
    new Date().getFullYear() -1,
    new Date().getFullYear(),
    new Date().getFullYear() +1
  ];

  const [editForm, setEditForm] = useState({
    nome: '',
    subtipo: '',
    categoria: '',
    dataPrevista: null as Date | null,
    valorPrevisto: '',
    dataReal: null as Date | null,
    valorReal: '',
  });

  const carregarTransacoes = useCallback(async () => {
    
    if (!user?.uid) return;
  
    try {
      
      setRefreshing(true);

      const rendasRef = collection(db, 'users', user.uid, 'rendas');
      const rendasSnapshot = await getDocs(rendasRef);
  
      const rendas = rendasSnapshot.docs.map(doc => {
       
        const data = doc.data();
        const { tipo: subtipo, ...resto } = data;
       
        return {
          id: doc.id,
          tipo: 'renda' as TransacaoTipo,
          subtipo: subtipo || '',
          ...resto,
        } as Transacao;

      });
  
      const despesasRef = collection(db, 'users', user.uid, 'despesas');
      const despesasSnapshot = await getDocs(despesasRef);
  
      const despesas = despesasSnapshot.docs.map(doc => {
       
        const data = doc.data();
        const { tipo: subtipo, ...resto } = data; 
       
        return {
          id: doc.id,
          tipo: 'despesa' as TransacaoTipo, 
          subtipo: subtipo || '',
          ...resto,
        } as Transacao;

      });

      const investimentosRef = collection(db, 'users', user.uid, 'investimentos');
      const investimentosSnapshot = await getDocs(investimentosRef);
  
      const investimentos = investimentosSnapshot.docs.map(doc => {

        const data = doc.data();
        const { tipo: subtipo, ...resto } = data; 
        
        return {
          id: doc.id,
          tipo: 'investimento' as TransacaoTipo, 
          subtipo: subtipo || '',
          ...resto,
        } as Transacao;

      });

      const todasTransacoes = [...rendas, ...despesas, ...investimentos];

      todasTransacoes.sort((a, b) => {
        
        const dateA = obterDataTransacao(a);
        const dateB = obterDataTransacao(b);
        
        return dateB.getTime() - dateA.getTime();

      });

      const transacoesPorData = agruparPorData(todasTransacoes);

      setTransacoesAgrupadas(transacoesPorData);
      setTransacoesFiltradas(transacoesPorData);
    
    } catch (error) {
    
      console.error('Erro ao carregar transações:', error);
      Alert.alert('Erro', 'Não foi possível carregar as transações');
    
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }

  }, [user?.uid]);
  
  const obterDataTransacao = useCallback((transacao: Transacao): Date => {
    
    const qualquerTransacao = transacao as any;
    
    if (qualquerTransacao.dataReal) {
      
      if (typeof qualquerTransacao.dataReal === 'string') {
        return new Date(qualquerTransacao.dataReal);
      } else if (qualquerTransacao.dataReal?.toDate) {
        return qualquerTransacao.dataReal.toDate();
      }
    
    }
    
    if (qualquerTransacao.dataPrevista) {
    
      if (typeof qualquerTransacao.dataPrevista === 'string') {       
        return new Date(qualquerTransacao.dataPrevista);   
      } else if (qualquerTransacao.dataPrevista?.toDate) {
        return qualquerTransacao.dataPrevista.toDate();
      }

    }
    
    if (transacao.data?.toDate) {
      return transacao.data.toDate();
    }
    
    if (transacao.criadoEm?.toDate) {
      return transacao.criadoEm.toDate();
    }
  
    return new Date();
    
  }, []);
  
  const agruparPorData = useCallback((transacoes: Transacao[]): TransacaoAgrupada[] => {
    
    if (!transacoes.length) return [];
    const grupos: { [key: string]: Transacao[] } = {};
    
    transacoes.forEach(transacao => {
      
      const data = obterDataTransacao(transacao);
      
      const chave = data.toLocaleDateString('pt-BR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      
      if (!grupos[chave]) {
        grupos[chave] = [];
      }

      grupos[chave].push(transacao);

    });
    
    const chavesOrdenadas = Object.keys(grupos).sort((a, b) => {
      const dateA = new Date(a.split(' de ').reverse().join('-'));
      const dateB = new Date(b.split(' de ').reverse().join('-'));
      return dateB.getTime() - dateA.getTime();
    });

    return chavesOrdenadas.map(chave => {
   
      const dataGrupo = grupos[chave];

      dataGrupo.sort((a, b) => {
        const dateA = obterDataTransacao(a);
        const dateB = obterDataTransacao(b);
        return dateB.getTime() - dateA.getTime();
      });
      
      const total = dataGrupo.reduce((sum, transacao) => {
        const valor = transacao.valor || 0;
        return transacao.tipo === 'despesa' || transacao.tipo === 'investimento' ? sum - valor : sum + valor;
      }, 0);
      
      return {
        title: chave,
        data: dataGrupo,
        total
      };

    });

  }, [obterDataTransacao]);

  const filtrarPorPeriodo = (transacao: Transacao): boolean => {

    const dataTransacao = obterDataTransacao(transacao);
    const hoje = new Date();

    switch (filtroPeriodo) {

      case 'hoje': return dataTransacao.toDateString() === hoje.toDateString();
      case 'mes': return dataTransacao.getMonth() + 1 === mesSelecionado && dataTransacao.getFullYear() === anoSelecionado;
      case 'ano': return dataTransacao.getFullYear() === anoSelecionado;
     
      case 'personalizado':

        if (dataInicioPersonalizada && dataFimPersonalizada) {
          return dataTransacao >= dataInicioPersonalizada && dataTransacao <= dataFimPersonalizada;
        }

        return true;
      
      default: return true;

    }
    
  };
  
  useEffect(() => {
    
    if (!transacoesAgrupadas.length && !loading) {
      setTransacoesFiltradas([]);
      return;
    }
    
    let resultados: TransacaoAgrupada[] = [];
    const todasTransacoes = transacoesAgrupadas.flatMap(grupo => grupo.data);
    let transacoesFiltradasTemp = todasTransacoes;

    if (filtroTipo !== 'todos') {
      transacoesFiltradasTemp = transacoesFiltradasTemp.filter( t => t.tipo === filtroTipo );
    }

    if (filtroPeriodo !== 'todos') {
      transacoesFiltradasTemp = transacoesFiltradasTemp.filter(filtrarPorPeriodo);
    }

    if (busca.trim()) {
   
      const termoBusca = busca.toLowerCase().trim();
   
      transacoesFiltradasTemp = transacoesFiltradasTemp.filter(t => 
        (t.nome?.toLowerCase() || '').includes(termoBusca) ||
        (t.categoria?.toLowerCase() || '').includes(termoBusca)
      );
    
    }

    if (transacoesFiltradasTemp.length > 0) {
      resultados = agruparPorData(transacoesFiltradasTemp);
    }

    setTransacoesFiltradas(resultados);

  }, [filtroTipo, busca, transacoesAgrupadas, loading, filtroPeriodo, anoSelecionado, mesSelecionado, diaSelecionado, dataInicioPersonalizada, dataFimPersonalizada]);
  
  useEffect(() => {
    
    if (isFocused && user?.uid) {
      carregarTransacoes();
    }

  }, [isFocused, user?.uid, carregarTransacoes]);

  const onRefresh = () => {
    carregarTransacoes();
  };
  
  const excluirTransacao = async () => {

    if (!transacaoParaExcluir || !user?.uid) return;
  
    try {
      
      let colecao = '';

      switch (transacaoParaExcluir.tipo) {
      
        case 'renda': colecao = 'rendas'; break;
        case 'despesa': colecao = 'despesas'; break;
        case 'investimento': colecao = 'investimentos'; break;

      }
      
      await deleteDoc(doc(db, 'users', user.uid, colecao, transacaoParaExcluir.id));

      setShowDeleteModal(false);
      setTransacaoParaExcluir(null);

      await carregarTransacoes();
      Alert.alert('Sucesso!', 'Transação excluída com sucesso');

    } catch (error) {
      console.error('Erro ao excluir transação:', error);
      Alert.alert('Erro', 'Não foi possível excluir a transação');
    }

  };

  const carregarCategoriasParaEdicao = async (tipo: TransacaoTipo) => {

    if (!user?.uid) return;

    try {

      const categoriasRef = collection(db, 'users', user.uid, 'categorias');
      const q = query(categoriasRef, where('tipo', '==', tipo));
      const snapshot = await getDocs(q);

      const categoriasPersonalizadas: string[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        categoriasPersonalizadas.push(data.nome);
      });

      let categoriasPadrao: string[] = [];

      if (tipo === 'despesa') {
        categoriasPadrao = categoriasPadraoDespesa;
      } else if (tipo === 'investimento') {
        categoriasPadrao = categoriasPadraoInvestimento;
      }

      const todasCategorias = [...new Set([...categoriasPadrao, ...categoriasPersonalizadas])];
      setCategoriasDisponiveis(todasCategorias);

    } catch (error) {
      
      console.error('Erro ao carregar categorias:', error);
      
      if (tipo === 'despesa') {
        setCategoriasDisponiveis(categoriasPadraoDespesa);
      } else if (tipo === 'investimento') {
        setCategoriasDisponiveis(categoriasPadraoInvestimento);
      }

    }

  };

  const editarTransacao = async (transacao: Transacao) => {
   
    setTransacaoParaEditar(transacao);

    try {
     
      let colecao = '';
     
      switch (transacao.tipo) {
        case 'renda': colecao = 'rendas'; break;
        case 'despesa': colecao = 'despesas'; break;
        case 'investimento': colecao = 'investimentos'; break;
      }

      const transacaoDoc = await getDoc(doc(db, 'users', user!.uid, colecao, transacao.id));
      const dadosCompletos = transacaoDoc.data();

      if (transacao.tipo === 'despesa' || transacao.tipo === 'investimento') {
        await carregarCategoriasParaEdicao(transacao.tipo);
      }

      const dataPrevista = dadosCompletos?.dataPrevista 
        ? (typeof dadosCompletos.dataPrevista === 'string' ? new Date(dadosCompletos.dataPrevista) 
        : dadosCompletos.dataPrevista.toDate()) : null;

      const dataReal = dadosCompletos?.dataReal 
        ? (typeof dadosCompletos.dataReal === 'string' ? new Date(dadosCompletos.dataReal) 
        : dadosCompletos.dataReal.toDate()) : null;

      setEditForm({
        nome: dadosCompletos?.nome || transacao.nome,
        subtipo: dadosCompletos?.tipo || transacao.subtipo || '',
        categoria: dadosCompletos?.categoria || transacao.categoria || '',
        dataPrevista: dataPrevista,
        valorPrevisto: dadosCompletos?.valorPrevisto?.toString() || '',
        dataReal: dataReal,
        valorReal: dadosCompletos?.valorReal?.toString() || '',
      });

      setShowEditModal(true);
    
    } catch (error) {
      console.error('Erro ao carregar dados da transação:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados para edição');
    }

  };

  const salvarEdicao = async () => {
   
    if (!transacaoParaEditar || !user?.uid) return;

    try {
     
      let colecao = '';
     
      switch (transacaoParaEditar.tipo) {
        case 'renda': colecao = 'rendas'; break;
        case 'despesa': colecao = 'despesas'; break;
        case 'investimento': colecao = 'investimentos'; break;
      }

      if ((transacaoParaEditar.tipo === 'despesa' || transacaoParaEditar.tipo === 'investimento') && editForm.categoria &&
      !categoriasDisponiveis.includes(editForm.categoria)) {
        
        const categoriaId = editForm.categoria.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-').replace(/^-|-$/g, '');

        await setDoc(doc(db, 'users', user.uid, 'categorias', categoriaId), {
          nome: editForm.categoria,
          tipo: transacaoParaEditar.tipo,
          personalizada: true,
          criadaEm: new Date()
        });

      }

      const dadosAtualizados: any = {
        nome: editForm.nome.trim(),
        tipo: editForm.subtipo || transacaoParaEditar.subtipo,
        valorPrevisto: editForm.valorPrevisto ? parseFloat(editForm.valorPrevisto.replace(',', '.')) : 0,
        valorReal: editForm.valorReal ? parseFloat(editForm.valorReal.replace(',', '.')) : 0,
        dataPrevista: editForm.dataPrevista ? editForm.dataPrevista.toISOString() : null,
        dataReal: editForm.dataReal ? editForm.dataReal.toISOString() : null,
        realizado: !!editForm.dataReal || !!editForm.valorReal,
        atualizadoEm: new Date()
      };

      if (transacaoParaEditar.tipo === 'despesa' || transacaoParaEditar.tipo === 'investimento') {
        dadosAtualizados.categoria = editForm.categoria || '';
      }

      const valorParaSalvar = dadosAtualizados.valorReal || dadosAtualizados.valorPrevisto;
      const dataParaCalculo = editForm.dataReal || editForm.dataPrevista;

      if (dataParaCalculo) {
        dadosAtualizados.data = dataParaCalculo.toISOString();
        dadosAtualizados.mes = dataParaCalculo.getMonth() + 1;
        dadosAtualizados.ano = dataParaCalculo.getFullYear();
        dadosAtualizados.valor = valorParaSalvar;
      }

      await updateDoc(doc(db, 'users', user.uid, colecao, transacaoParaEditar.id), dadosAtualizados);

      setShowEditModal(false);
      setTransacaoParaEditar(null);
      setNovaCategoria('');
      
      setEditForm({
        nome: '',
        subtipo: '',
        categoria: '',
        dataPrevista: null,
        valorPrevisto: '',
        dataReal: null,
        valorReal: '',
      });

      await carregarTransacoes();
      Alert.alert('Sucesso!', 'Transação atualizada com sucesso');

    } catch (error) {
      console.error('Erro ao editar transação:', error);
      Alert.alert('Erro', 'Não foi possível atualizar a transação');
    }

  };

  const formatarParaDinheiro = (text: string): string => {
    let numbers = text.replace(/\D/g, '');
    if (numbers === '') return '';
    const valor = parseInt(numbers, 10) / 100;
    return valor.toFixed(2).replace('.', ',');
  };
  
  const getTipoInfo = (tipo: TransacaoTipo, subtipoOuTipo?: string) => {
  
    if (tipo === 'renda' || tipo === 'despesa') {
      
      const subtipo = subtipoOuTipo || '';
      
      switch (tipo) {
       
        case 'renda':
          return { icon: '💰', color: '#00d2a8', label: subtipo === 'recorrente' ? 'Renda recorrente' : 'Renda extra', };
        case 'despesa':
          return { icon: '💸', color: '#F44336', label: subtipo === 'fixa' ? 'Despesa fixa' : 'Despesa variável', };

      }

    }
    
    return {
      icon: '📈',
      color: '#ee00ff',
      label: 'Caixinha',
    };

  };
  
  const formatarValor = (valor: number) => {
    return `R$ ${Math.abs(valor).toFixed(2).replace('.', ',')}`;
  };

  const handleValorChange = (campo: 'valorPrevisto' | 'valorReal', text: string) => {
    const formatado = formatarParaDinheiro(text);
    setEditForm(prev => ({ ...prev, [campo]: formatado }));
  };
  
  const formatarDataCurta = (dataString: string) => {
    const [dia, mes, ano] = dataString.split(' de ');
    return `${dia} ${mes.slice(0, 3)} ${ano}`;
  };
  
  const renderTransacaoItem = ({ item }: { item: Transacao }) => {
    
    const tipoInfo = getTipoInfo(item.tipo, item.subtipo);
    const valorFormatado = formatarValor(item.valor);
    const isDespesaOuInvestimento = item.tipo === 'despesa' || item.tipo === 'investimento';

    const isPrevisto = !item.realizado || (
      (item as any).dataPrevista && !(item as any).dataReal
    );
    
    const dataHora = obterDataTransacao(item);
    const horaFormatada = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    return (
    
    <View style={styles.transacaoItem}>
      
      <View style={styles.transacaoInfo}>
        
        <Text style={styles.transacaoNome} numberOfLines={1}>{item.nome}
        
        {isPrevisto && (
        
        <View style={styles.previstoContainer}>
          <Text style={styles.previstoText}>Previsto</Text>
        </View>
        
        )} </Text>

        <View style={styles.transacaoDetalhes}>
          
          {item.categoria ? (
          
          <>
          
          <Text style={styles.transacaoCategoria}>{item.categoria}</Text>
          <Text style={styles.transacaoSeparador}> • </Text>
          
          </>
          
          ) : null }
          
          <Text style={styles.transacaoTipo}>{tipoInfo.label}</Text>
          <Text style={styles.transacaoHora}>• {horaFormatada}</Text>

        </View>

      </View>
      
      <View style={styles.transacaoValorContainer}>
        
        <Text style={[ styles.transacaoValor, isDespesaOuInvestimento ? styles.valorNegativo : styles.valorPositivo,  isPrevisto && styles.valorPrevisto]}>
        {isDespesaOuInvestimento ? '-' : '+'} {valorFormatado} </Text>

        {isPrevisto && (
          <Text style={styles.previstoIndicador}>⏱️</Text>
        )}

      </View>

      <View style={styles.transacaoAcoes}>
        
        <TouchableOpacity style={styles.acaoButton} onPress={() => editarTransacao(item)}>
          <Text style={[styles.acaoIcon, styles.editarIcon]}>✏️</Text>
        </TouchableOpacity>
          
        <TouchableOpacity style={styles.acaoButton} onPress={() => { setTransacaoParaExcluir(item); setShowDeleteModal(true); }}>
          <Text style={[styles.acaoIcon, styles.excluirIcon]}>🗑️</Text>
        </TouchableOpacity>

      </View>
    </View>
    );

  };

  const renderCabecalhoSecao = ({ section }: { section: TransacaoAgrupada }) => (
    
    <View style={styles.cabecalhoSecao}>
    
      <Text style={styles.cabecalhoData}>{formatarDataCurta(section.title)}</Text>
    
      <View style={styles.cabecalhoTotalContainer}>
        
        <Text style={[ styles.cabecalhoTotal, section.total < 0 ? styles.totalNegativo : styles.totalPositivo ]}> {section.total < 0 ?
        '-' : '+'} {formatarValor(Math.abs(section.total))} </Text>

      </View>
    </View>
  );

  const renderFiltroAvancado = () => {
    
    return (
    
    <View style={styles.filtroAvancadoContainer}>

      <TouchableOpacity style={styles.filtroToggleButton} onPress={() => setShowFiltroAvancado(!showFiltroAvancado)}>
        
        <Text style={styles.filtroToggleIcon}>📅</Text>
        <Text style={styles.filtroToggleText}> {showFiltroAvancado ? 'Ocultar filtros' : 'Filtrar por período'}</Text>
        <Text style={styles.filtroToggleArrow}> {showFiltroAvancado ? '▼' : '▶'} </Text>

      </TouchableOpacity>

      {showFiltroAvancado && (
        
        <View style={styles.filtroOpcoesContainer}>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodoRapidoScroll}>
            
            <TouchableOpacity style={[styles.periodoRapidoButton, filtroPeriodo === 'todos' && styles.periodoRapidoButtonAtivo]} onPress
            ={() => setFiltroPeriodo('todos')}>
             
              <Text style={[styles.periodoRapidoText, filtroPeriodo === 'todos' && styles.periodoRapidoTextAtivo]}> Todos </Text>
           
            </TouchableOpacity>

            <TouchableOpacity style={[styles.periodoRapidoButton, filtroPeriodo === 'hoje' && styles.periodoRapidoButtonAtivo]} onPress
            ={() => setFiltroPeriodo('hoje')}>
           
              <Text style={[styles.periodoRapidoText, filtroPeriodo === 'hoje' && styles.periodoRapidoTextAtivo]}> Hoje </Text>
           
            </TouchableOpacity>

            <TouchableOpacity style={[styles.periodoRapidoButton, filtroPeriodo === 'mes' && styles.periodoRapidoButtonAtivo]} onPress=
            {() => setFiltroPeriodo('mes')}>
              
              <Text style={[styles.periodoRapidoText, filtroPeriodo === 'mes' && styles.periodoRapidoTextAtivo]}> Mês </Text>
           
            </TouchableOpacity>

            <TouchableOpacity style={[styles.periodoRapidoButton, filtroPeriodo === 'ano' && styles.periodoRapidoButtonAtivo]} onPress=
            {() => setFiltroPeriodo('ano')}>
          
              <Text style={[styles.periodoRapidoText, filtroPeriodo === 'ano' && styles.periodoRapidoTextAtivo]}> Ano </Text>
          
            </TouchableOpacity>

            <TouchableOpacity style={[styles.periodoRapidoButton, filtroPeriodo === 'personalizado' && styles.periodoRapidoButtonAtivo]}
            onPress={() => setFiltroPeriodo('personalizado')}>
             
              <Text style={[styles.periodoRapidoText, filtroPeriodo === 'personalizado' && styles.periodoRapidoTextAtivo]}> Personalizado </Text>
           
            </TouchableOpacity>

          </ScrollView>

          {filtroPeriodo === 'mes' && (
            
            <View style={styles.filtroDetalhadoContainer}>
             
              <View style={styles.seletorLinha}>
            
                <Text style={styles.seletorLabel}>Mês:</Text>
            
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.seletorScroll}>
                  
                  {meses.map((mes, index) => (
                   
                   <TouchableOpacity key={index} style={[styles.seletorItem, mesSelecionado === index + 1 && styles.seletorItemAtivo]}
                   onPress={() => setMesSelecionado(index + 1)}>
                     
                    <Text style={[styles.seletorItemText, mesSelecionado === index + 1 && styles.seletorItemTextAtivo]}> {mes.slice(0, 3)} </Text>
                   
                  </TouchableOpacity>

                  ))}

                </ScrollView>

              </View>

              <View style={styles.seletorLinha}>
               
                <Text style={styles.seletorLabel}>Ano:</Text>
               
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.seletorScroll}>
                  
                  {anos.map((ano) => (
                    
                    <TouchableOpacity key={ano} style={[styles.seletorItem, anoSelecionado === ano && styles.seletorItemAtivo]} onPress
                    ={() => setAnoSelecionado(ano)}>
                      
                      <Text style={[styles.seletorItemText, anoSelecionado === ano && styles.seletorItemTextAtivo]}> {ano} </Text>
                    
                    </TouchableOpacity>
                  ))}

                </ScrollView>

              </View>

            </View>
          )}

          {filtroPeriodo === 'ano' && (
            
            <View style={styles.filtroDetalhadoContainer}>
             
              <View style={styles.seletorLinha}>
            
                <Text style={styles.seletorLabel}>Ano:</Text>
               
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.seletorScroll}>
                 
                  {anos.map((ano) => (
                    
                    <TouchableOpacity key={ano} style={[styles.seletorItem, anoSelecionado === ano && styles.seletorItemAtivo]} onPress
                    ={() => setAnoSelecionado(ano)}>
                     
                      <Text style={[styles.seletorItemText, anoSelecionado === ano && styles.seletorItemTextAtivo]}> {ano} </Text>
                   
                    </TouchableOpacity>

                  ))}

                </ScrollView>

              </View>
            </View>
          )}

          {filtroPeriodo === 'personalizado' && (
           
           <View style={styles.filtroDetalhadoContainer}>
              <View style={styles.dataPersonalizadaLinha}>
                
                <View style={styles.dataPersonalizadaItem}>
                  
                  <Text style={styles.seletorLabel}>De:</Text>
                  
                  <TouchableOpacity style={styles.dataPersonalizadaButton} onPress={() => setShowDatePickerInicio(true)}>
                    
                    <Text style={styles.dataPersonalizadaText}> {dataInicioPersonalizada 
                    ? dataInicioPersonalizada.toLocaleDateString('pt-BR') : 'Selecionar'}
                    </Text>

                  </TouchableOpacity>

                </View>

                <View style={styles.dataPersonalizadaItem}>
                  
                  <Text style={styles.seletorLabel}>Até:</Text>
                  
                  <TouchableOpacity style={styles.dataPersonalizadaButton} onPress={() => setShowDatePickerFim(true)}>
                    
                    <Text style={styles.dataPersonalizadaText}> {dataFimPersonalizada 
                    ? dataFimPersonalizada.toLocaleDateString('pt-BR') : 'Selecionar'}
                    </Text>

                  </TouchableOpacity>

                </View>

              </View>

              <TouchableOpacity style={styles.limparFiltroButton} onPress={() => { setDataInicioPersonalizada(null); setDataFimPersonalizada(null); }}>
                <Text style={styles.limparFiltroText}>Limpar datas</Text>
              </TouchableOpacity>

            </View>

          )}

          {filtroPeriodo !== 'todos' && (
           
            <View style={styles.filtroAtivoContainer}>
           
              <Text style={styles.filtroAtivoIcon}>🔍</Text>

              <Text style={styles.filtroAtivoText}>
                {filtroPeriodo === 'hoje' && 'Mostrando transações de hoje'}
                {filtroPeriodo === 'mes' && `Mostrando transações de ${meses[mesSelecionado - 1]} de ${anoSelecionado}`}
                {filtroPeriodo === 'ano' && `Mostrando transações de ${anoSelecionado}`}
                {filtroPeriodo === 'personalizado' && 'Mostrando transações do período personalizado'}
              </Text>

              <TouchableOpacity onPress={() => setFiltroPeriodo('todos')}>
                <Text style={styles.filtroAtivoLimpar}>✕</Text>
              </TouchableOpacity>

            </View>

          )}

        </View>
      )}

      {showDatePickerInicio && (
        
        <DateTimePicker value={dataInicioPersonalizada || new Date()} mode="date" onChange={(event, selectedDate) => {
        setShowDatePickerInicio(false);
        
        if (selectedDate) {
          setDataInicioPersonalizada(selectedDate);
        }

        }} />

      )}

      {showDatePickerFim && (
       
        <DateTimePicker value={dataFimPersonalizada || new Date()} mode="date" onChange={(event, selectedDate) => { setShowDatePickerFim(false);
        
        if (selectedDate) {
          setDataFimPersonalizada(selectedDate);
        }
      
        }}  />
      )}

    </View>
  ); }

  if (loading) {
   
    return (
    
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#dadafa" />
      <Text style={styles.loadingText}>Carregando transações...</Text>
    </View>

    );
  }

  return (
  
  <View style={styles.container}>
    
    <View style={styles.header}>
      <Text style={styles.title}>Diário</Text>
      <Text style={styles.subtitle}>Todas as suas movimentações</Text>
    </View>
    
    <View style={styles.filtrosContainer}>
      <View style={styles.filtrosTipo}>
        
        {(['todos', 'renda', 'despesa', 'investimento'] as const).map(tipo => (
          
          <TouchableOpacity key={tipo} style={[ styles.filtroTipoButton, filtroTipo === tipo && styles.filtroTipoButtonAtivo]} onPress=
          {() => setFiltroTipo(tipo)}>
            
            <Text style={[ styles.filtroTipoText, filtroTipo === tipo && styles.filtroTipoTextAtivo ]}> {tipo === 'todos' ? 'Todos' :
            tipo === 'renda' ? '💰 Rendas' : tipo === 'despesa' ? '💸 Despesas' : '📈 Invest.'} </Text>

          </TouchableOpacity>

        ))}

      </View>
      
      <View style={styles.buscaContainer}>
        
        <TextInput style={styles.buscaInput} placeholder="Buscar por nome ou categoria..." placeholderTextColor="#8581FF" value={busca}
        onChangeText={setBusca} />
        
        {busca ? (
          
          <TouchableOpacity onPress={() => setBusca('')}>
            <Text style={styles.buscaClear}>✕</Text>
          </TouchableOpacity>

        ) : null}

      </View>

      {renderFiltroAvancado()}

    </View>

    {transacoesFiltradas.length === 0 ? (
      
      <View style={styles.emptyContainer}>
        
        <Text style={styles.emptyIcon}>📄</Text>
        <Text style={styles.emptyTitle}>Nenhuma transação encontrada</Text>
        <Text style={styles.emptyText}> {busca || filtroTipo !== 'todos' ? 'Tente ajustar os filtros ou a busca' : 'Adicione sua primeira transação!'} </Text>
      
      </View>
      
    ) : (
      
      <SectionList sections={transacoesFiltradas} keyExtractor={(item, index) => `${item.id}-${index}`} renderItem={renderTransacaoItem}
      renderSectionHeader={renderCabecalhoSecao} contentContainerStyle={styles.listaContainer} refreshControl={ <RefreshControl
      refreshing={refreshing} onRefresh={onRefresh} colors={['#0f248d']} tintColor="#0f248d" /> } showsVerticalScrollIndicator={false} />

    )}
    
    <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => { setShowEditModal(false);
    setTransacaoParaEditar(null); setNovaCategoria(''); setEditForm({ nome: '', subtipo: '', categoria: '', dataPrevista: null,
    valorPrevisto: '', dataReal: null, valorReal: '', }); }}>
      
      <View style={styles.modalOverlayEdit}>
          <View style={styles.modalContentEdit}>
            
            <View style={styles.modalHeaderEdit}>
              
              <Text style={styles.modalTitleEdit}> Editar {transacaoParaEditar?.tipo === 'renda' ? 'renda' : transacaoParaEditar?.tipo
              === 'despesa' ? 'despesa' : 'investimento'} </Text>
              
              <TouchableOpacity onPress={() => { setShowEditModal(false); setTransacaoParaEditar(null); setNovaCategoria(''); }}>
                <Text style={styles.modalCloseTextEdit}>✕</Text>
              </TouchableOpacity>

            </View>

            <ScrollView style={styles.editScrollView} showsVerticalScrollIndicator={false}>
              
              <View style={styles.editInputGroup}>
                
                <Text style={styles.editLabel}>Nome</Text>
               
                <TextInput style={styles.editInput} value={editForm.nome} onChangeText={(text) => setEditForm(prev => ({ ...prev, nome:
                text }))} placeholder="Digite o nome" placeholderTextColor="#8581FF" />

              </View>

              {(transacaoParaEditar?.tipo === 'renda' || transacaoParaEditar?.tipo === 'despesa') && (
                
                <View style={styles.editInputGroup}>
                 
                  <Text style={styles.editLabel}>Tipo</Text>
                 
                  <View style={styles.typeContainer}>
                    
                    {transacaoParaEditar?.tipo === 'renda' ? (
                    
                    <>
                    
                    <TouchableOpacity style={[styles.typeButton, editForm.subtipo === 'recorrente' && styles.typeButtonActive]} onPress=
                    {() => setEditForm(prev => ({ ...prev, subtipo: 'recorrente' }))}>
                      
                      <Text style={[styles.typeButtonText, editForm.subtipo === 'recorrente' && styles.typeButtonTextActive]}> Recorrente </Text>
                    
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={[styles.typeButton, editForm.subtipo === 'extra' && styles.typeButtonActive]} onPress={() => setEditForm(prev => ({ ...prev, subtipo: 'extra' }))}>
                      <Text style={[styles.typeButtonText, editForm.subtipo === 'extra' && styles.typeButtonTextActive]}> Extra </Text>
                    </TouchableOpacity>

                    </>

                    ) : (
                    
                    <>
                    
                    <TouchableOpacity style={[styles.typeButton, editForm.subtipo === 'fixa' && styles.typeButtonActive]} onPress={() =>
                    setEditForm(prev => ({ ...prev, subtipo: 'fixa' }))}>
                      
                      <Text style={[styles.typeButtonText, editForm.subtipo === 'fixa' && styles.typeButtonTextActive]}> Fixa </Text>
                    
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={[styles.typeButton, editForm.subtipo === 'variavel' && styles.typeButtonActive]} onPress=
                    {() => setEditForm(prev => ({ ...prev, subtipo: 'variavel' }))}>
                      
                      <Text style={[styles.typeButtonText, editForm.subtipo === 'variavel' && styles.typeButtonTextActive]}> Variável </Text>
                    
                    </TouchableOpacity>
                    
                    </>

                    )}

                  </View>
                </View>
              )}

              {(transacaoParaEditar?.tipo === 'despesa' || transacaoParaEditar?.tipo === 'investimento') && (
                
                <View style={styles.editInputGroup}>
                  
                  <Text style={styles.editLabel}>Categoria</Text>
            
                  <TextInput style={styles.editInput} value={editForm.categoria} onChangeText={(text) => setEditForm(prev => ({ ...prev,
                  categoria: text }))} placeholder="Digite ou selecione uma categoria" placeholderTextColor="#8581FF" />

                  {categoriasDisponiveis.length > 0 && (
                    
                    <View style={styles.sugestoesContainer}>
                    
                      <Text style={styles.sugestoesLabel}>Sugestões:</Text>
                    
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sugestoesScroll}>
                        
                        {categoriasDisponiveis.map((categoria, index) => (
                        
                        <TouchableOpacity key={index} style={[styles.sugestaoChip, editForm.categoria === categoria && styles.
                        sugestaoChipAtiva]} onPress={() => setEditForm(prev => ({ ...prev, categoria }))}>
                          
                          <Text style={[styles.sugestaoChipText, editForm.categoria === categoria && styles.sugestaoChipTextAtiva]}> {categoria} </Text>
                        
                        </TouchableOpacity>

                        ))}

                      </ScrollView>

                    </View>
                  )}
                </View>
              )}

              <View style={styles.editRow}>
                
                <View style={[styles.editInputGroup, styles.editInputHalf]}>
                 
                  <Text style={styles.editLabel}>Data prevista</Text>
                 
                  <TouchableOpacity style={styles.dateButtonEdit} onPress={() => setMostrarPickerDataPrevista(true)}>
                    <Text style={styles.dateButtonTextEdit}> {editForm.dataPrevista ? editForm.dataPrevista.toLocaleDateString('pt-BR') : 'Selecionar'} </Text>
                  </TouchableOpacity>

                  {mostrarPickerDataPrevista && (
                  
                  <DateTimePicker value={editForm.dataPrevista || new Date()} mode="date" onChange={(event, selectedDate) => {
                  setMostrarPickerDataPrevista(false); if (selectedDate) { setEditForm(prev => ({ ...prev, dataPrevista: selectedDate }));}}} />
                  
                  )}

                </View>
                
                <View style={[styles.editInputGroup, styles.editInputHalf]}>
                  
                  <Text style={styles.editLabel}>Data real</Text>
                  
                  <TouchableOpacity style={styles.dateButtonEdit} onPress={() => setMostrarPickerDataReal(true)}>
                    <Text style={styles.dateButtonTextEdit}> {editForm.dataReal ? editForm.dataReal.toLocaleDateString('pt-BR') : 'Selecionar'} </Text>
                  </TouchableOpacity>

                  {mostrarPickerDataReal && (
                  
                  <DateTimePicker value={editForm.dataReal || new Date()} mode="date" onChange={(event, selectedDate) => {
                  setMostrarPickerDataReal(false); if (selectedDate) { setEditForm(prev => ({ ...prev, dataReal: selectedDate }));}}} />
                  
                  )}

                </View>
              </View>
              
              <View style={styles.editRow}>
                
                <View style={[styles.editInputGroup, styles.editInputHalf]}>
                  
                  <Text style={styles.editLabel}>Previsto (R$)</Text>
                  
                  <View style={styles.inputWithCurrencyEdit}>
                   
                    <Text style={styles.currencySymbolEdit}>R$</Text>
                   
                    <TextInput style={styles.editInputWithCurrency} value={editForm.valorPrevisto} onChangeText={(text) =>
                    handleValorChange('valorPrevisto', text)} keyboardType="numeric" placeholder="0,00" placeholderTextColor="#8581FF" />
                  
                  </View>

                </View>
                
                <View style={[styles.editInputGroup, styles.editInputHalf]}>
                 
                  <Text style={styles.editLabel}>Real (R$)</Text>
                 
                  <View style={styles.inputWithCurrencyEdit}>
                    
                    <Text style={styles.currencySymbolEdit}>R$</Text>
                    
                    <TextInput style={styles.editInputWithCurrency} value={editForm.valorReal} onChangeText={(text) => handleValorChange
                    ('valorReal', text)} keyboardType="numeric" placeholder="0,00" placeholderTextColor="#8581FF" />
                  
                  </View>

                </View>
                
              </View>

              <View style={styles.editButtonsContainer}>
                
                <TouchableOpacity style={styles.modalConfirmButton} onPress={() => { setShowEditModal(false); setTransacaoParaEditar(null); setNovaCategoria(''); }}>
                  <Text style={[styles.modalConfirmText, { fontSize: 16}]}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.editButton, styles.editButtonSave]} onPress={salvarEdicao}>
                  <Text style={styles.editButtonTextSave}>Salvar</Text>
                </TouchableOpacity>

              </View>

            </ScrollView>

          </View>
        </View>
      </Modal>

      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => { setShowDeleteModal(false);
      setTransacaoParaExcluir(null);}}>
        
        <View style={styles.modalOverlay}>
         
          <View style={styles.modalContent}>
            
            <Text style={styles.modalTitle}>Excluir transação</Text>
            <Text style={styles.modalText}> Tem certeza que deseja excluir a transação </Text>
            <Text style={styles.modalNome}> "{transacaoParaExcluir?.nome}"?</Text>
            <Text style={styles.modalWarning}>⚠️ Esta ação não pode ser desfeita </Text>

            <View style={styles.modalButtons}>
              
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => { setShowDeleteModal(false); setTransacaoParaExcluir(null);}}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalConfirmButton} onPress={excluirTransacao}>
                <Text style={styles.modalConfirmText}>Excluir</Text>
              </TouchableOpacity>

            </View>

          </View>

        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#dadafa',
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: '#dadafa',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    color: '#0f248d',
    marginTop: 10,
    fontSize: 16,
    fontFamily: 'Alatsi_400Regular'
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },

  title: {
    fontSize: 28,
    fontFamily: 'Alatsi_400Regular',
    color: '#0f248d',
    marginBottom: 5,
  },

  subtitle: {
    fontSize: 16,
    color: '#0f248d',
    fontFamily: 'Cabin_400Regular'
  },

  filtrosContainer: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },

  filtrosTipo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  
  filtroTipoButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 36, 141, 0.1)',
  },

  filtroTipoButtonAtivo: {
    backgroundColor: '#0f248d',
  },

  filtroTipoText: {
    fontSize: 12,
    color: '#0f248d',
    fontFamily: 'Cabin_700Bold'
  },

  filtroTipoTextAtivo: {
    color: '#FFF',
  },

  buscaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },

  buscaInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f248d',
    fontFamily: 'Inter_400Regular'
  },

  buscaClear: {
    fontSize: 18,
    color: '#8581FF',
    paddingLeft: 10,
  },
  
  listaContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },

  cabecalhoSecao: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 36, 141, 0.1)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 10,
    marginTop: 5,
  },

  cabecalhoData: {
    fontSize: 16,
    fontFamily: 'Cabin_700Bold',
    color: '#0f248d',
  },
  
  cabecalhoTotalContainer: {
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
  },

  cabecalhoTotal: {
    fontSize: 14,
    fontFamily: 'Alatsi_400Regular'
  },

  totalPositivo: {
    color: '#00d2a8',
  },

  totalNegativo: {
    color: '#F44336',
  },

  transacaoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  transacaoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 36, 141, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  transacaoIcon: {
    fontSize: 20,
  },

  transacaoInfo: {
    flex: 1,
    marginRight: 8,
  },

  transacaoNome: {
    fontSize: 14,
    color: '#0f248d',
    marginBottom: 4,
    fontFamily: 'Alatsi_400Regular'
  },

  transacaoDetalhes: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  transacaoCategoria: {
    fontSize: 12,
    color: '#0f248d',
    fontFamily: 'Cabin_400Regular'
  },

  transacaoSeparador: {
    fontSize: 12,
    color: '#0f248d',
    fontFamily: 'Cabin_400Regular'
  },

  transacaoTipo: {
    fontSize: 10,
    color: '#496DC7',
    fontFamily: 'Inter_700Bold'
  },

  transacaoHora: {
    fontSize: 12,
    color: '#999',
    marginLeft: 5,
    fontFamily: 'Cabin_400Regular'
  },

  transacaoValorContainer: {
    marginRight: 5,
  },

  transacaoValor: {
    fontSize: 14,
    fontFamily: 'Alatsi_400Regular'
  },

  valorPositivo: {
    color: '#00d2a8',
  },

  valorNegativo: {
    color: '#F44336',
  },

  transacaoAcoes: {
    flexDirection: 'row',
  },

  acaoButton: {
    padding: 5,
  },

  acaoIcon: {
    fontSize: 18,
  },

  editarIcon: {
    color: '#0f248d',
  },

  excluirIcon: {
    color: '#F44336',
  },
  
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },

  emptyIcon: {
    fontSize: 60,
    marginBottom: 20,
    color: '#0f248d',
  },

  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Cabin_700Bold',
    color: '#0f248d',
    marginBottom: 10,
    textAlign: 'center',
  },

  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'Cabin_400Regular'
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 25,
    width: '80%',
    alignItems: 'center',
  },

  modalTitle: {
    fontSize: 22,
    fontFamily: 'Alatsi_400Regular',
    color: '#0f248d',
    marginBottom: 15,
  },

  modalText: {
    fontSize: 16,
    color: '#0f248d',
    textAlign: 'center',
    marginBottom: 5,
    fontFamily: 'Cabin_400Regular'
  },

  modalNome: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#0f248d',
    textAlign: 'center',
    marginBottom: 15,
  },

  modalWarning: {
    fontSize: 14,
    color: '#F44336',
    marginBottom: 20,
    fontFamily: 'Cabin_400Regular'
  },

  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },

  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F44336',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 10,
  },

  modalCancelText: {
    fontSize: 14,
    color: '#FFF',
    fontFamily: 'Cabin_700Bold'
  },

  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#EEE',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 10,
  },

  modalConfirmText: {
    fontSize: 18,
    color: '#666',
    fontFamily: 'Cabin_700Bold'
  },

  modalOverlayEdit: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },

  modalContentEdit: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },

  modalHeaderEdit: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0FF',
  },

  modalTitleEdit: {
    fontSize: 22,
    fontFamily: 'Alatsi_400Regular',
    color: '#0f248d',
  },

  modalCloseTextEdit: {
    fontSize: 24,
    color: '#8581FF',
  },

  editScrollView: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },

  editInputGroup: {
    marginBottom: 20,
  },

  editLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontFamily: 'Cabin_700Bold'
  },

  editInput: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#aab3ff',
    fontFamily: 'Inter_400Regular'
  },

  typeContainer: {
    flexDirection: 'row',
    gap: 10,
  },

  typeButton: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#aab3ff',
  },

  typeButtonActive: {
    backgroundColor: '#0f248d',
    borderColor: '#0f248d',
  },

  typeButtonText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Cabin_700Bold'
  },

  typeButtonTextActive: {
    color: '#FFF',
  },

  sugestoesContainer: {
    marginTop: 10,
  },

  sugestoesLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontFamily: 'Inter_400Regular'
  },

  sugestoesScroll: {
    flexDirection: 'row',
  },

  sugestaoChip: {
    backgroundColor: '#F0EFFF',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#aab3ff',
  },

  sugestaoChipAtiva: {
    backgroundColor: '#0f248d',
    borderColor: '#0f248d',
  },

  sugestaoChipText: {
    fontSize: 14,
    color: '#0f248d',
    fontFamily: 'Cabin_400Regular'
  },

  sugestaoChipTextAtiva: {
    color: '#FFF',
  },

  editRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  editInputHalf: {
    flex: 1,
    marginRight: 10,
  },

  dateButtonEdit: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#aab3ff',
  },

  dateButtonTextEdit: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Inter_400Regular'
  },

  inputWithCurrencyEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#aab3ff',
  },

  currencySymbolEdit: {
    paddingLeft: 16,
    fontSize: 16,
    color: '#333',
    fontFamily: 'Cabin_700Bold'
  },

  editInputWithCurrency: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#333',
    borderWidth: 0,
    fontFamily: 'Alatsi_400Regular'
  },

  editButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    marginBottom: 20,
  },

  editButton: {
    flex: 1,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },

  editButtonSave: {
    backgroundColor: '#0f248d',
    marginLeft: 10,
  },

  editButtonTextSave: {
    fontSize: 18,
    color: '#FFF',
    fontFamily: 'Cabin_700Bold'
  },
  
  previstoContainer: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 5,
    marginLeft: 3,
  },
  
  previstoText: {
    fontSize: 10,
    color: '#FF9800',
    fontFamily: 'Inter_700Bold'
  },
  
  valorPrevisto: {
    opacity: 0.7,
    fontStyle: 'italic',
  },
  
  previstoIndicador: {
    fontSize: 12,
    color: '#FF9800',
    marginLeft: 5,
  },

  filtroAvancadoContainer: {
    marginTop: 10,
    marginBottom: 5,
  },
  
  filtroToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 36, 141, 0.1)',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
  },
  
  filtroToggleIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  
  filtroToggleText: {
    flex: 1,
    fontSize: 14,
    color: '#0f248d',
    fontFamily: 'Cabin_700Bold',
  },
  
  filtroToggleArrow: {
    fontSize: 14,
    color: '#0f248d',
  },
  
  filtroOpcoesContainer: {
    marginTop: 10,
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 15,
  },
  
  periodoRapidoScroll: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  
  periodoRapidoButton: {
    backgroundColor: 'rgba(15, 36, 141, 0.1)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  
  periodoRapidoButtonAtivo: {
    backgroundColor: '#0f248d',
  },
  
  periodoRapidoText: {
    fontSize: 12,
    color: '#0f248d',
    fontFamily: 'Cabin_700Bold',
  },
  
  periodoRapidoTextAtivo: {
    color: '#FFF',
  },
  
  filtroDetalhadoContainer: {
    marginTop: 5,
  },
  
  seletorLinha: {
    marginBottom: 15,
  },
  
  seletorLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontFamily: 'Cabin_700Bold',
  },
  
  seletorScroll: {
    flexDirection: 'row',
  },
  
  seletorItem: {
    backgroundColor: '#F0EFFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#aab3ff',
  },
  
  seletorItemAtivo: {
    backgroundColor: '#0f248d',
    borderColor: '#0f248d',
  },
  
  seletorItemText: {
    fontSize: 12,
    color: '#0f248d',
    fontFamily: 'Cabin_700Bold',
  },
  
  seletorItemTextAtivo: {
    color: '#FFF',
  },
  
  dataPersonalizadaLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  
  dataPersonalizadaItem: {
    flex: 1,
    marginRight: 10,
  },
  
  dataPersonalizadaButton: {
    backgroundColor: '#F0EFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#aab3ff',
  },
  
  dataPersonalizadaText: {
    fontSize: 14,
    color: '#0f248d',
    fontFamily: 'Inter_400Regular',
  },
  
  limparFiltroButton: {
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginTop: 5,
  },
  
  limparFiltroText: {
    fontSize: 12,
    color: '#F44336',
    fontFamily: 'Cabin_700Bold',
  },
  
  filtroAtivoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 36, 141, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginTop: 15,
  },
  
  filtroAtivoIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  
  filtroAtivoText: {
    flex: 1,
    fontSize: 12,
    color: '#0f248d',
    fontFamily: 'Inter_400Regular',
  },
  
  filtroAtivoLimpar: {
    fontSize: 16,
    color: '#F44336',
    paddingHorizontal: 5,
  },

})