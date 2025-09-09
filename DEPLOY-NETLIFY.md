# 🚀 Deploy Rápido no Netlify

## 1. Preparar o Código

```bash
# Fazer commit de todos os arquivos
git add .
git commit -m "Preparar para deploy no Netlify"
git push origin main
```

## 2. Configurar no Netlify

1. **Acesse**: [app.netlify.com](https://app.netlify.com)
2. **Clique**: "New site from Git"
3. **Conecte**: Seu repositório GitHub
4. **Configurações**:
   - Build command: `npm run build`
   - Publish directory: `public`
   - Functions directory: `netlify/functions`

## 3. Variáveis de Ambiente

No Netlify, vá em **Site settings** > **Environment variables**:

```
DISCORD_TOKEN=seu_token_aqui
DISCORD_CLIENT_ID=seu_client_id_aqui
```

## 4. Deploy

1. Clique em **Deploy site**
2. Aguarde o build
3. Bot estará online! 🎵

## 5. Testar

1. Convide o bot para seu servidor
2. Use `/help` para ver os comandos
3. Teste `/play música` em um canal de voz

---

**Pronto! Seu bot estará online 24/7 no Netlify! 🎶**
