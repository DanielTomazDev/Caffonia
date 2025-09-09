# 🎵 Caffonía Bot - Deploy no Netlify

Este guia te ajudará a fazer o deploy do bot Discord Caffonía no Netlify.

## 📋 Pré-requisitos

1. **Conta no Netlify** - [Crie uma conta gratuita](https://netlify.com)
2. **Conta no Discord Developer Portal** - [Discord Developer Portal](https://discord.com/developers/applications)
3. **GitHub** - Para hospedar o código

## 🚀 Passo a Passo

### 1. Preparar o Repositório

1. Faça commit de todos os arquivos para o GitHub
2. Certifique-se de que os seguintes arquivos estão presentes:
   - `netlify.toml`
   - `netlify/functions/server.js`
   - `public/_redirects`
   - `package.json` (atualizado)

### 2. Configurar Variáveis de Ambiente no Netlify

1. Acesse o [Netlify Dashboard](https://app.netlify.com)
2. Crie um novo site conectando ao seu repositório GitHub
3. Vá em **Site settings** > **Environment variables**
4. Adicione as seguintes variáveis:

```
DISCORD_TOKEN=seu_token_do_discord
DISCORD_CLIENT_ID=seu_client_id_do_discord
```

### 3. Configurar Build Settings

No Netlify, vá em **Site settings** > **Build & deploy** > **Build settings**:

- **Build command**: `npm run build`
- **Publish directory**: `public`
- **Functions directory**: `netlify/functions`

### 4. Deploy

1. Clique em **Deploy site**
2. Aguarde o build completar
3. O bot estará online automaticamente!

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
├── netlify/
│   └── functions/
│       └── server.js          # Função principal do Netlify
├── public/
│   └── _redirects             # Redirecionamentos
├── netlify.toml              # Configuração do Netlify
├── package.json              # Dependências
├── config.js                 # Configuração local (não commitado)
└── README-NETLIFY.md         # Este arquivo
```

## 🎵 Comandos Disponíveis

- `/play <música>` - Toca uma música
- `/pause` - Pausa a música
- `/resume` - Retoma a música
- `/skip` - Pula a música atual
- `/stop` - Para a música e limpa a fila
- `/queue` - Mostra a fila de músicas
- `/volume <0-100>` - Ajusta o volume
- `/help` - Mostra os comandos

## 🔍 Troubleshooting

### Bot não responde aos comandos
1. Verifique se as variáveis de ambiente estão corretas
2. Confirme se o bot tem as permissões necessárias
3. Verifique os logs do Netlify em **Functions** > **server**

### Erro de permissões
1. Reconvide o bot com as permissões corretas
2. Verifique se o bot tem permissão para **Connect** e **Speak** no canal de voz

### Bot não toca música
1. Verifique se o FFmpeg está funcionando
2. Confirme se as dependências estão instaladas corretamente

## 📊 Monitoramento

- **Logs**: Acesse **Functions** > **server** no Netlify Dashboard
- **Status**: Verifique se o bot está online no Discord
- **Uptime**: O Netlify mantém o bot online 24/7

## 🆘 Suporte

Se encontrar problemas:
1. Verifique os logs do Netlify
2. Confirme as configurações do Discord
3. Teste os comandos localmente primeiro

---

**Desenvolvido com ❤️ por Daniel Tomaz**
