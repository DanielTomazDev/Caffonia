module.exports = {
    // Token do Bot Discord
    token: 'seu_token_aqui',
    
    // ID do Cliente Discord (opcional)
    clientId: 'seu_client_id_aqui',
    
    // Prefixo dos comandos
    prefix: '!',
    
    // Configurações de música
    music: {
        // Volume padrão (0.0 a 1.0)
        defaultVolume: 0.5,
        
        // Tempo limite para buscar música (em segundos)
        searchTimeout: 10000,
        
        // Máximo de músicas na fila
        maxQueueSize: 50
    }
};
