# 📱 FinanceRS App —  Controle Financeiro Pessoal

<div align="center">

![React Native](https://img.shields.io/badge/React%20Native-0.72-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![Firebase](https://img.shields.io/badge/Firebase-9.0-orange?logo=firebase)
![Expo](https://img.shields.io/badge/Expo-49-purple?logo=expo)
![](https://img.shields.io/badge/Status-Concluído-green)

**Controle suas finanças de forma simples, intuitiva e visual**

</div>

## 📖 Sobre o Projeto

O **FinanceRS** é um aplicativo mobile de controle financeiro pessoal desenvolvido como projeto de portfólio. A ideia surgiu da necessidade de substituir planilhas complexas e aplicativos confusos por uma ferramenta simples, visual e que realmente ajudasse no dia a dia. O resultado é um app completo, com todas as funcionalidades essenciais para gerenciar finanças de forma prática.

---

### 🎯 Objetivos
- **Portfólio Profissional**: Demonstrar habilidades em React Native, TypeScript, Firebase e UI/UX
- **Aprendizado Prático**: Aplicar conceitos avançados em um projeto real
- **Solução Útil**: Criar uma ferramenta funcional para o dia a dia
- **Design Intuitivo**: Oferecer uma experiência limpa e agradável

---

## 🚀 Tecnologias Utilizadas

### Frontend Mobile
| Tecnologia | Finalidade |
|------------|------------|
| **React Native** | Framework principal para desenvolvimento mobile |
| **TypeScript** | Tipagem estática para maior segurança no código |
| **Expo** | Ambiente de desenvolvimento rápido |
| **React Navigation** | Navegação entre telas (Stack, Tabs) |
| **Context API** | Gerenciamento de estado global |
| **AsyncStorage** | Persistência local de preferências |
| **React Native SVG** | Gráficos dinâmicos (pizza e distribuição) |
| **React Native Draggable Flatlist** | Reordenação de metas com arrastar e soltar |
| **React Native Gesture Handler** | Interações de toque aprimoradas |

### Backend & Banco de Dados
| Tecnologia | Finalidade |
|------------|------------|
| **Firebase Authentication** | Autenticação de usuários (login, cadastro, recuperação de senha) |
| **Firebase Firestore** | Banco de dados NoSQL para transações, metas, categorias e configurações |

---

## ✨ Funcionalidades Implementadas

### 🔐 Autenticação
- Cadastro de novos usuários
- Login com e-mail e senha
- Recuperação de senha via e-mail (com link seguro do Firebase)
- Logout com modal de confirmação

### 🏠 Dashboard Principal
- **Gráfico de pizza** mostrando distribuição entre renda, despesas e investimentos
- **Saldo do mês** com destaque visual
- **Resumo financeiro** (rendas, despesas fixas, variáveis, investimentos)
- **Navegação entre meses** com indicação visual
- **Categorias** com ícones personalizados

### 📊 Diário de Transações
- **Listagem agrupada por data** com visual de extrato bancário
- **CRUD completo** para rendas, despesas e investimentos

- **Filtros avançados**:

  - Por tipo (todos, rendas, despesas, investimentos)
  - Por período (hoje, mês, ano, personalizado)
  - Por busca textual (nome ou categoria
  
- **Identificação visual** de transações previstas x realizadas
- **Edição inline** com modal bottom sheet
- **Exclusão com modal de confirmação**

### 🏷️ Categorias Personalizáveis
- Categorias padrão para despesas e investimentos
- **Criação de categorias personalizadas** com nome e tipo
- **Exclusão segura** com verificação de uso
- Validação para evitar duplicidade

### 🎯 Sistema de Metas
- Adicionar metas com título e valor opcional
- **Checkbox para marcar como concluída**
- **Drag and drop** para reordenar prioridades
- Edição de metas (título e valor)
- Exclusão com modal de confirmação
- Contador visual de metas concluídas

### ⚙️ Configurações
- **Edição de dados da conta** (nome e e-mail)
- **Alteração de senha** com reautenticação
- **Exclusão de conta** com modal de confirmação e senha
- **Modo noturno** com persistência por usuário no Firestore
- Exportação de dados (em desenvolvimento)

### 🎨 Design e Experiência
- **Tema claro e escuro** com persistência por usuário
- **Cores consistentes** e paleta agradável
- **Ícones personalizados** para melhor identificação
- **Modais bottom sheet** para ações contextuais
- **Feedback visual** em todas as interações

---

## 📱 Como Executar o Projeto

### Pré-requisitos
- Node.js (v18 ou superior)
- npm ou yarn
- Expo CLI (`npm install -g expo-cli`)
- Conta no Firebase

### Passos para rodar localmente

```bash
# Clone o repositório
git clone https://github.com/numaniice/financers-app.git
cd financers-app

# Instale as dependências
npm install

# Configure as variáveis de ambiente
# Crie um arquivo .env na raiz com suas credenciais do Firebase

# Inicie o projeto
npx expo start

```

### Configuração do Firebase
1. Crie um projeto no Firebase Console
2 Habilite Authentication (E-mail/Senha)
3. Crie um banco Firestore
4. Configure as regras de segurança
5. Copie as credenciais e adicione ao arquivo .env

---

## 🎓 Aprendizados

Este projeto me proporcionou:
- Estruturação profissional de um app React Native completo
- Integração com Firebase (Auth, Firestore)
- Gerenciamento de estado com Context API
- Tipagem estática com TypeScript
- Navegação complexa com React Navigation
- Design responsivo e adaptável
- Experiência do usuário e feedback visual
- Persistência de dados e sincronização em tempo real

## 📝 Licença
Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 👨‍💻 Autor
Ravi Brocco Soares
