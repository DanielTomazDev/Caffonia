# 🎵 Configuração do Spotify - Bot Caffonía

## 📋 Como Obter Credenciais do Spotify

### 1. Acesse o Spotify Developer Dashboard
- Vá para [developer.spotify.com](https://developer.spotify.com/dashboard)
- Faça login com sua conta Spotify

### 2. Criar uma Aplicação
1. Clique em **"Create an App"**
2. Preencha os campos:
   - **App name**: `Caffonía Bot`
   - **App description**: `Bot de música para Discord`
   - **Website**: (opcional)
   - **Redirect URI**: `http://localhost:3000/callback`
3. Aceite os termos e clique em **"Create"**

### 3. Obter as Credenciais
1. Na página da sua aplicação, você verá:
   - **Client ID**: Copie este valor
   - **Client Secret**: Clique em "Show Client Secret" e copie

### 4. Configurar no Bot

#### Para uso local (`config.js`):
```javascript
spotify: {
    clientId: 'seu_spotify_client_id_aqui',
    clientSecret: 'seu_spotify_client_secret_aqui'
}
```

#### Para Railway (Variáveis de Ambiente):
```
SPOTIFY_CLIENT_ID=seu_spotify_client_id_aqui
SPOTIFY_CLIENT_SECRET=seu_spotify_client_secret_aqui
```

## 🎵 Comandos do Spotify

### Tocar Música do Spotify
```
/playspotify Never Gonna Give You Up
/playspotify spotify:track:4PTG3Z6ehGkBFwjybzWkR8
/playspotify https://open.spotify.com/track/4PTG3Z6ehGkBFwjybzWkR8
```

### Como Funciona
1. O bot busca a música no Spotify
2. Obtém informações (título, artista, duração)
3. Busca a mesma música no YouTube
4. Reproduz do YouTube (para evitar problemas de copyright)

## ⚠️ Limitações

### Spotify API
- **Rate Limits**: 1000 requests por hora
- **Apenas metadados**: Não reproduz diretamente do Spotify
- **Reprodução**: Usa YouTube como fonte de áudio

### Funcionalidades Disponíveis
- ✅ Buscar músicas do Spotify
- ✅ Obter informações de tracks
- ✅ Buscar por artista, álbum, playlist
- ✅ Integração com sistema de favoritos
- ✅ Adicionar a playlists do bot
- ❌ Reprodução direta do Spotify (limitação da API)

## 🔧 Troubleshooting

### Erro: "Spotify não configurado"
- Verifique se as credenciais estão corretas
- Confirme se a aplicação está ativa no Spotify Dashboard

### Erro: "Invalid client credentials"
- Client ID ou Client Secret incorretos
- Verifique se copiou as credenciais completas

### Erro: "Rate limit exceeded"
- Muitas requisições ao Spotify
- Aguarde alguns minutos antes de tentar novamente

## 💡 Dicas

### Para Melhor Experiência
1. **Use nomes específicos**: "Never Gonna Give You Up Rick Astley"
2. **Copie links do Spotify**: Funciona com URLs diretas
3. **Combine com YouTube**: Use `/play` para YouTube, `/playspotify` para Spotify

### Playlists do Spotify
- O bot pode buscar informações de playlists públicas
- Use URLs de playlists para adicionar múltiplas músicas
- Funciona com álbuns completos

---

**Desenvolvido com ❤️ por Daniel Tomaz**
