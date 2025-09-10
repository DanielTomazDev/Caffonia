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
        maxQueueSize: 100,
        
        // Máximo de músicas por playlist
        maxPlaylistSize: 50
    },
    
    // Configurações do Spotify
    spotify: {
        clientId: 'seu_spotify_client_id_aqui',
        clientSecret: 'seu_spotify_client_secret_aqui'
    },
    
    // Funcionalidades habilitadas
    features: {
        enableSpotify: true,
        enableYoutube: true,
        enablePlaylists: true,
        enableRadio: true,
        enableTimer: true,
        enableFavorites: true,
        enableMoodSystem: true
    }
};
