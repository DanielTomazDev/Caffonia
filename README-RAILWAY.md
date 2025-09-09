# 🎵 Caffonía Bot - Deploy no Railway

Este guia te ajudará a fazer o deploy do bot Discord Caffonía no Railway para funcionar 24/7 com áudio.

## 📋 Pré-requisitos

1. **Conta no Railway** - [Crie uma conta gratuita](https://railway.app)
2. **Conta no Discord Developer Portal** - [Discord Developer Portal](https://discord.com/developers/applications)
3. **GitHub** - Para hospedar o código

## 🚀 Passo a Passo

### 1. Preparar o Repositório

1. Faça commit de todos os arquivos para o GitHub
2. Certifique-se de que os seguintes arquivos estão presentes:
   - `railway.json`
   - `Procfile`
   - `config-railway.js`
   - `index.js` (atualizado)
   - `package.json`

### 2. Configurar no Railway

1. Acesse [railway.app](https://railway.app)
2. Clique em **"New Project"**
3. Selecione **"Deploy from GitHub repo"**
4. Conecte sua conta GitHub
5. Selecione o repositório `Caffonía`

### 3. Configurar Variáveis de Ambiente

No Railway, vá em **Variables** e adicione:

```
DISCORD_TOKEN=seu_token_do_discord
DISCORD_CLIENT_ID=seu_client_id_do_discord
```

### 4. Deploy

1. O Railway fará o deploy automaticamente
2. Aguarde o build completar
3. O bot estará online 24/7! 🎵

## 🎵 Comandos Disponíveis

- `/play <música>` - Toca uma música
- `/pause` - Pausa a música
- `/resume` - Retoma a música
- `/skip` - Pula a música atual
- `/stop` - Para a música e limpa a fila
- `/queue` - Mostra a fila de músicas
- `/volume <0-100>` - Ajusta o volume
- `/help` - Mostra os comandos

## 🔧 Configuração do Bot

### 1. Discord Developer Portal

1. Acesse [Discord Developer Portal](https://discord.com/developers/applications)
2. Selecione sua aplicação
3. Vá em **Bot** e copie o **Token**
4. Vá em **General Information** e copie o **Application ID**

### 2. Permissões do Bot

No Discord Developer Portal, em **Bot** > **Privileged Gateway Intents**, habilite:
- ✅ **MESSAGE CONTENT INTENT**
- ✅ **SERVER MEMBERS INTENT** (opcional)

### 3. Convite do Bot

Use este link para convidar o bot (substitua `CLIENT_ID` pelo seu Application ID):

```
https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=3145728&scope=bot%20applications.commands
```

## 📁 Estrutura de Arquivos

```
Caffonía/
├── railway.json              # Configuração do Railway
├── Procfile                  # Comando de inicialização
├── config-railway.js         # Configuração para Railway
├── index.js                  # Bot principal (atualizado)
├── package.json              # Dependências
└── README-RAILWAY.md         # Este arquivo
```

## 🔍 Troubleshooting

### Bot não responde aos comandos
1. Verifique se as variáveis de ambiente estão corretas
2. Confirme se o bot tem as permissões necessárias
3. Verifique os logs do Railway

### Erro de permissões
1. Reconvide o bot com as permissões corretas
2. Verifique se o bot tem permissão para **Connect** e **Speak** no canal de voz

### Bot não toca música
1. Verifique se o FFmpeg está funcionando
2. Confirme se as dependências estão instaladas corretamente

## 📊 Monitoramento

- **Logs**: Acesse **Deployments** > **View Logs** no Railway
- **Status**: Verifique se o bot está online no Discord
- **Uptime**: O Railway mantém o bot online 24/7

## 💰 Custos

- **Plano gratuito**: 500 horas/mês
- **Plano Pro**: $5/mês para uso ilimitado
- **Para uso 24/7**: Recomendado o plano Pro

## 🆘 Suporte

Se encontrar problemas:
1. Verifique os logs do Railway
2. Confirme as configurações do Discord
3. Teste os comandos localmente primeiro

---

**Desenvolvido com ❤️ por Daniel Tomaz**
