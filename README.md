# 🎵 Caffonía - Bot de Música para Discord

Um bot de música completo e moderno para Discord, desenvolvido com Node.js e Discord.js v14.

## ✨ Funcionalidades

- 🎵 **Reprodução de música** - Toca músicas do YouTube
- ⏸️ **Controle de reprodução** - Pausar, retomar, pular e parar
- 📋 **Sistema de fila** - Adicione múltiplas músicas à fila
- 🔊 **Controle de volume** - Ajuste o volume de 0% a 100%
- 🔍 **Busca inteligente** - Busque músicas por nome ou URL
- 🎧 **Conexão automática** - Conecta automaticamente aos canais de voz
- 📊 **Status em tempo real** - Mostra o que está tocando


## 🎮 Comandos

| Comando | Descrição | Exemplo |
|---------|-----------|---------|
| `!play <música>` | Toca uma música | `!play Never Gonna Give You Up` |
| `!pause` | Pausa a música atual | `!pause` |
| `!resume` | Retoma a música pausada | `!resume` |
| `!skip` | Pula para a próxima música | `!skip` |
| `!stop` | Para a música e limpa a fila | `!stop` |
| `!queue` | Mostra a fila de músicas | `!queue` |
| `!volume <0-100>` | Ajusta o volume | `!volume 75` |
| `!help` | Mostra a lista de comandos | `!help` |

## 📋 Permissões necessárias

O bot precisa das seguintes permissões:

- **Enviar Mensagens** - Para responder aos comandos
- **Conectar** - Para entrar em canais de voz
- **Falar** - Para reproduzir áudio
- **Usar Atividade de Voz** - Para detectar quando usuários entram/saem
- **Adicionar Reações** - Para feedback visual


### Estrutura do projeto

```
caffonia-bot/
├── index.js          # Arquivo principal do bot
├── config.js         # Configurações do bot
├── config.example.js # Exemplo de configuração
├── package.json      # Dependências e scripts
└── README.md         # Este arquivo
```

### Dependências principais

- **discord.js** - API do Discord
- **@discordjs/voice** - Reprodução de áudio
- **@distube/ytdl-core** - Download de vídeos do YouTube
- **play-dl** - Busca de músicas
- **libsodium-wrappers** - Criptografia para áudio
- **ffmpeg-static** - Processamento de áudio

## 🐛 Solução de problemas

### Bot não conecta ao canal de voz
- Verifique se o bot tem permissão para conectar ao canal
- Certifique-se de que o bot está online
- Verifique se o token está correto

### Música não toca
- Verifique sua conexão com a internet
- Certifique-se de que o YouTube está acessível
- Verifique os logs do console para erros

### Comandos não funcionam
- Verifique se o prefixo está correto
- Certifique-se de que o bot tem permissão para enviar mensagens
- Verifique se o bot está online

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 🤝 Contribuições

Contribuições são bem-vindas! Sinta-se à vontade para:

- Reportar bugs
- Sugerir novas funcionalidades
- Enviar pull requests
- Melhorar a documentação

## 📞 Suporte

Se você encontrar algum problema ou tiver dúvidas:

1. Verifique a seção de solução de problemas
2. Procure por issues similares no repositório
3. Crie uma nova issue com detalhes do problema

---

Desenvolvido com ❤️ por **Daniel Tomaz**
