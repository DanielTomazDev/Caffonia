// Configuração para Netlify
// Renomeie este arquivo para config.js e adicione suas credenciais

module.exports = {
    token: process.env.DISCORD_TOKEN || 'seu_token_aqui',
    clientId: process.env.DISCORD_CLIENT_ID || 'seu_client_id_aqui',
    prefix: '!',
    music: {
        maxQueueSize: 99,
        defaultVolume: 50
    }
};
