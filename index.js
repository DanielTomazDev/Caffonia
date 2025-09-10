const { Client, GatewayIntentBits, Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, REST, Routes } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, getVoiceConnection } = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core');
const { search } = require('play-dl');
const SpotifyWebApi = require('spotify-web-api-node');
const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');

// Configuração - usa variáveis de ambiente se disponíveis, senão usa config.js
const config = process.env.DISCORD_TOKEN ? {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    prefix: '!',
    music: {
        maxQueueSize: 100,
        defaultVolume: 50,
        maxPlaylistSize: 50
    },
    spotify: {
        clientId: process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET
    },
    features: {
        enableSpotify: true,
        enableYoutube: true,
        enablePlaylists: true,
        enableRadio: true,
        enableTimer: true,
        enableFavorites: true,
        enableMoodSystem: true
    }
} : require('./config');

// Cliente Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// Cliente Spotify
let spotifyApi = null;
if (config.features.enableSpotify && 
    config.spotify.clientId && 
    config.spotify.clientId !== 'seu_spotify_client_id_aqui' &&
    config.spotify.clientSecret && 
    config.spotify.clientSecret !== 'seu_spotify_client_secret_aqui') {
    
    spotifyApi = new SpotifyWebApi({
        clientId: config.spotify.clientId,
        clientSecret: config.spotify.clientSecret
    });
    
    // Autenticar com Spotify
    spotifyApi.clientCredentialsGrant()
        .then(data => {
            spotifyApi.setAccessToken(data.body['access_token']);
            console.log('✅ Spotify conectado!');
        })
        .catch(err => {
            console.log('⚠️ Spotify não configurado (credenciais inválidas)');
            spotifyApi = null;
        });
} else {
    console.log('⚠️ Spotify não configurado (configure as credenciais no config.js)');
}

// Sistemas de dados
const musicQueues = new Map();
const userPlaylists = new Map();
const userFavorites = new Map();
const userStats = new Map();
const timers = new Map();
const radioStations = new Map();

// Estrutura de fila de música aprimorada
class EnhancedMusicQueue {
    constructor(guildId, voiceChannel, textChannel) {
        this.guildId = guildId;
        this.voiceChannel = voiceChannel;
        this.textChannel = textChannel;
        this.songs = [];
        this.currentSong = null;
        this.player = createAudioPlayer();
        this.connection = null;
        this.volume = config.music.defaultVolume;
        this.loop = 'off'; // off, song, queue
        this.shuffle = false;
        this.autoplay = false;
        this.mood = 'normal';
        this.quality = 'high';
        this.history = [];
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.player.on(AudioPlayerStatus.Playing, () => {
            console.log(`🎵 Tocando: ${this.currentSong?.title}`);
            this.updateStats();
        });
        
        this.player.on(AudioPlayerStatus.Idle, () => {
            this.playNext();
        });
        
        this.player.on('error', error => {
            console.error('❌ Erro no player:', error);
            this.playNext();
        });
    }
    
    async addSong(song) {
        if (this.songs.length >= config.music.maxQueueSize) {
            throw new Error('Fila cheia! Máximo de ' + config.music.maxQueueSize + ' músicas.');
        }
        
        this.songs.push(song);
        
        if (!this.currentSong) {
            await this.playNext();
        }
    }
    
    async playNext() {
        if (this.loop === 'song' && this.currentSong) {
            await this.playSong(this.currentSong);
            return;
        }
        
        let nextSong = null;
        
        if (this.songs.length > 0) {
            if (this.shuffle) {
                const randomIndex = Math.floor(Math.random() * this.songs.length);
                nextSong = this.songs.splice(randomIndex, 1)[0];
            } else {
                nextSong = this.songs.shift();
            }
        } else if (this.loop === 'queue' && this.history.length > 0) {
            this.songs = [...this.history];
            this.history = [];
            nextSong = this.songs.shift();
        } else if (this.autoplay && this.currentSong) {
            nextSong = await this.getRecommendation();
        }
        
        if (nextSong) {
            if (this.currentSong) {
                this.history.push(this.currentSong);
            }
            await this.playSong(nextSong);
        } else {
            this.currentSong = null;
            if (this.connection && this.connection.state.status !== VoiceConnectionStatus.Destroyed) {
                try {
                    this.connection.destroy();
                } catch (error) {
                    console.log('⚠️ Conexão já foi destruída');
                }
            }
            musicQueues.delete(this.guildId);
        }
    }
    
    async playSong(song) {
        try {
            this.currentSong = song;
            
            if (!this.connection) {
                this.connection = joinVoiceChannel({
                    channelId: this.voiceChannel.id,
                    guildId: this.guildId,
                    adapterCreator: this.voiceChannel.guild.voiceAdapterCreator,
                });
                this.connection.subscribe(this.player);
            }
            
            let stream;
            if (song.source === 'youtube') {
                stream = ytdl(song.url, {
                    filter: 'audioonly',
                    highWaterMark: 1 << 25,
                    quality: this.quality === 'high' ? 'highestaudio' : 'lowestaudio'
                });
            } else {
                // Para outras fontes, usar busca no YouTube
                const searchResult = await search(song.title + ' ' + song.artist, { limit: 1 });
                if (searchResult.length > 0) {
                    stream = ytdl(searchResult[0].url, {
                        filter: 'audioonly',
                        highWaterMark: 1 << 25,
                        quality: this.quality === 'high' ? 'highestaudio' : 'lowestaudio'
                    });
                } else {
                    throw new Error('Não foi possível reproduzir a música');
                }
            }
            
            const resource = createAudioResource(stream, { inlineVolume: true });
            resource.volume.setVolume(this.volume / 100);
            this.player.play(resource);
            
            // Enviar embed da música atual
            await this.sendNowPlayingEmbed();
            
        } catch (error) {
            console.error('❌ Erro ao tocar música:', error);
            await this.playNext();
        }
    }
    
    async sendNowPlayingEmbed() {
        const embed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle('🎵 Tocando Agora')
            .setDescription(`**${this.currentSong.title}**`)
            .addFields(
                { name: '🎤 Artista', value: this.currentSong.artist || 'Desconhecido', inline: true },
                { name: '⏱️ Duração', value: this.currentSong.duration || 'Desconhecida', inline: true },
                { name: '🔊 Volume', value: `${this.volume}%`, inline: true },
                { name: '📱 Fonte', value: this.currentSong.source.toUpperCase(), inline: true },
                { name: '🔄 Loop', value: this.loop === 'off' ? 'Desativado' : this.loop === 'song' ? 'Música' : 'Fila', inline: true },
                { name: '🔀 Shuffle', value: this.shuffle ? 'Ativado' : 'Desativado', inline: true }
            )
            .setFooter({ text: `Fila: ${this.songs.length} música(s) • Mood: ${this.mood}` });
        
        if (this.currentSong.thumbnail) {
            embed.setThumbnail(this.currentSong.thumbnail);
        }
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('pause_resume')
                    .setLabel('⏯️')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('skip')
                    .setLabel('⏭️')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('shuffle')
                    .setLabel('🔀')
                    .setStyle(this.shuffle ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('loop')
                    .setLabel('🔁')
                    .setStyle(this.loop !== 'off' ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('queue')
                    .setLabel('📝')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        try {
            await this.textChannel.send({ embeds: [embed], components: [row] });
        } catch (error) {
            console.error('❌ Erro ao enviar embed:', error);
        }
    }
    
    updateStats() {
        if (!this.currentSong) return;
        
        const userId = this.currentSong.requestedBy;
        if (!userStats.has(userId)) {
            userStats.set(userId, { totalPlayed: 0, favoriteGenres: {}, history: [] });
        }
        
        const stats = userStats.get(userId);
        stats.totalPlayed++;
        stats.history.unshift(this.currentSong);
        if (stats.history.length > 50) stats.history.pop();
        
        userStats.set(userId, stats);
    }
    
    async getRecommendation() {
        // Lógica simples de recomendação baseada no histórico
        if (this.history.length === 0) return null;
        
        const lastSong = this.history[this.history.length - 1];
        try {
            const searchQuery = `${lastSong.artist} similar music`;
            const results = await search(searchQuery, { limit: 5 });
            if (results.length > 0) {
                const randomResult = results[Math.floor(Math.random() * results.length)];
                return {
                    title: randomResult.title,
                    artist: randomResult.channel?.name || 'Desconhecido',
                    url: randomResult.url,
                    duration: randomResult.durationFormatted,
                    thumbnail: randomResult.thumbnails?.[0]?.url,
                    source: 'youtube',
                    requestedBy: 'autoplay'
                };
            }
        } catch (error) {
            console.error('❌ Erro ao buscar recomendação:', error);
        }
        
        return null;
    }
}

// Comandos Slash
const commands = [
    // Comandos básicos
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('Toca uma música do YouTube')
        .addStringOption(option =>
            option.setName('musica')
                .setDescription('Nome da música ou URL do YouTube')
                .setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('playspotify')
        .setDescription('Toca uma música do Spotify')
        .addStringOption(option =>
            option.setName('musica')
                .setDescription('Nome da música ou URL do Spotify')
                .setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pausa a música atual'),
    
    new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Retoma a música pausada'),
    
    new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Pula a música atual'),
    
    new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Para a música e limpa a fila'),
    
    new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Mostra a fila de músicas'),
    
    new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Ajusta o volume')
        .addIntegerOption(option =>
            option.setName('nivel')
                .setDescription('Nível do volume (0-100)')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(100)),
    
    // Sistema de Playlists
    new SlashCommandBuilder()
        .setName('playlist')
        .setDescription('Gerenciar playlists')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Criar uma nova playlist')
                .addStringOption(option =>
                    option.setName('nome')
                        .setDescription('Nome da playlist')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Adicionar música à playlist')
                .addStringOption(option =>
                    option.setName('playlist')
                        .setDescription('Nome da playlist')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('musica')
                        .setDescription('Música para adicionar')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('play')
                .setDescription('Tocar uma playlist')
                .addStringOption(option =>
                    option.setName('nome')
                        .setDescription('Nome da playlist')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Listar suas playlists'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Deletar uma playlist')
                .addStringOption(option =>
                    option.setName('nome')
                        .setDescription('Nome da playlist')
                        .setRequired(true))),
    
    // Sistema de Favoritos
    new SlashCommandBuilder()
        .setName('fav')
        .setDescription('Gerenciar favoritos')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Adicionar música atual aos favoritos'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('play')
                .setDescription('Tocar músicas favoritas aleatoriamente'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Listar suas músicas favoritas')),
    
    // Sistema de Humores
    new SlashCommandBuilder()
        .setName('mood')
        .setDescription('Definir humor musical')
        .addStringOption(option =>
            option.setName('tipo')
                .setDescription('Tipo de humor')
                .setRequired(true)
                .addChoices(
                    { name: '😌 Chill', value: 'chill' },
                    { name: '🎯 Focus', value: 'focus' },
                    { name: '🎮 Gaming', value: 'gaming' },
                    { name: '🎉 Party', value: 'party' },
                    { name: '💤 Sleep', value: 'sleep' },
                    { name: '🏃 Workout', value: 'workout' }
                )),
    
    // Timer e Agendamento
    new SlashCommandBuilder()
        .setName('sleep')
        .setDescription('Para a música após um tempo')
        .addIntegerOption(option =>
            option.setName('minutos')
                .setDescription('Minutos até parar')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(180)),
    
    new SlashCommandBuilder()
        .setName('pomodoro')
        .setDescription('Inicia sessão Pomodoro (25min música, 5min pausa)')
        .addIntegerOption(option =>
            option.setName('ciclos')
                .setDescription('Número de ciclos')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(8)),
    
    // Rádio 24/7
    new SlashCommandBuilder()
        .setName('radio')
        .setDescription('Controlar rádio 24/7')
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Iniciar rádio')
                .addStringOption(option =>
                    option.setName('tipo')
                        .setDescription('Tipo de rádio')
                        .setRequired(true)
                        .addChoices(
                            { name: '🎵 Lo-Fi', value: 'lofi' },
                            { name: '🎮 Gaming', value: 'gaming' },
                            { name: '💼 Work', value: 'work' },
                            { name: '🌙 Chill', value: 'chill' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stop')
                .setDescription('Parar rádio')),
    
    // Configurações
    new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Ativa/desativa modo aleatório'),
    
    new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Controlar repetição')
        .addStringOption(option =>
            option.setName('modo')
                .setDescription('Modo de repetição')
                .setRequired(false)
                .addChoices(
                    { name: '❌ Desativado', value: 'off' },
                    { name: '🔂 Música', value: 'song' },
                    { name: '🔁 Fila', value: 'queue' }
                )),
    
    new SlashCommandBuilder()
        .setName('autoplay')
        .setDescription('Ativa/desativa reprodução automática'),
    
    new SlashCommandBuilder()
        .setName('quality')
        .setDescription('Ajustar qualidade do áudio')
        .addStringOption(option =>
            option.setName('nivel')
                .setDescription('Nível de qualidade')
                .setRequired(true)
                .addChoices(
                    { name: '🔊 Alta', value: 'high' },
                    { name: '🔉 Baixa', value: 'low' },
                    { name: '🔄 Auto', value: 'auto' }
                )),
    
    // Estatísticas
    new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Mostra suas estatísticas musicais'),
    
    new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Mostra a música atual'),
    
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Mostra todos os comandos disponíveis')
];

// Registrar comandos
const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
    try {
        console.log('🔄 Registrando comandos slash...');
        await rest.put(
            Routes.applicationCommands(config.clientId),
            { body: commands }
        );
        console.log('✅ Comandos slash registrados com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao registrar comandos:', error);
    }
})();

// Função para buscar música no YouTube
async function searchYoutube(query) {
    try {
        const results = await search(query, { limit: 1 });
        if (results.length === 0) {
            throw new Error('Nenhuma música encontrada!');
        }
        
        const result = results[0];
        return {
            title: result.title,
            artist: result.channel?.name || 'Desconhecido',
            url: result.url,
            duration: result.durationFormatted,
            thumbnail: result.thumbnails?.[0]?.url,
            source: 'youtube'
        };
    } catch (error) {
        console.error('❌ Erro ao buscar no YouTube:', error);
        throw error;
    }
}

// Função para buscar música no Spotify
async function searchSpotify(query) {
    if (!spotifyApi) {
        throw new Error('Spotify não configurado!');
    }
    
    try {
        const results = await spotifyApi.searchTracks(query, { limit: 1 });
        if (results.body.tracks.items.length === 0) {
            throw new Error('Nenhuma música encontrada no Spotify!');
        }
        
        const track = results.body.tracks.items[0];
        return {
            title: track.name,
            artist: track.artists.map(a => a.name).join(', '),
            url: track.external_urls.spotify,
            duration: `${Math.floor(track.duration_ms / 60000)}:${String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, '0')}`,
            thumbnail: track.album.images[0]?.url,
            source: 'spotify',
            spotifyId: track.id
        };
    } catch (error) {
        console.error('❌ Erro ao buscar no Spotify:', error);
        throw error;
    }
}

// Função para obter recomendações por humor
function getMoodPlaylist(mood) {
    const moodPlaylists = {
        chill: ['lofi hip hop', 'chill music', 'relaxing music', 'ambient music'],
        focus: ['study music', 'concentration music', 'instrumental music', 'classical music'],
        gaming: ['gaming music', 'electronic music', 'synthwave', 'epic music'],
        party: ['party music', 'dance music', 'pop hits', 'upbeat music'],
        sleep: ['sleep music', 'calm music', 'nature sounds', 'meditation music'],
        workout: ['workout music', 'motivational music', 'high energy music', 'gym music']
    };
    
    return moodPlaylists[mood] || moodPlaylists.chill;
}

// Importar handlers agora que as variáveis globais estão definidas
const handlers = require('./handlers');

// Definir as variáveis globais para os handlers
global.musicQueues = musicQueues;
global.userPlaylists = userPlaylists;
global.userFavorites = userFavorites;
global.userStats = userStats;
global.timers = timers;
global.radioStations = radioStations;
global.config = config;
global.spotifyApi = spotifyApi;
global.search = search;
global.searchYoutube = searchYoutube;
global.searchSpotify = searchSpotify;
global.getMoodPlaylist = getMoodPlaylist;
global.EnhancedMusicQueue = EnhancedMusicQueue;

// Carregar dados do usuário
async function loadUserData() {
    try {
        const playlistsData = await fs.readFile(path.join(__dirname, 'data', 'playlists.json'), 'utf8');
        const playlists = JSON.parse(playlistsData);
        for (const [userId, userPlaylists] of Object.entries(playlists)) {
            userPlaylists.set(userId, userPlaylists);
        }
    } catch (error) {
        console.log('📁 Criando arquivo de playlists...');
    }
    
    try {
        const favoritesData = await fs.readFile(path.join(__dirname, 'data', 'favorites.json'), 'utf8');
        const favorites = JSON.parse(favoritesData);
        for (const [userId, userFavs] of Object.entries(favorites)) {
            userFavorites.set(userId, userFavs);
        }
    } catch (error) {
        console.log('📁 Criando arquivo de favoritos...');
    }
}

// Salvar dados do usuário
async function saveUserData() {
    try {
        await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
        
        const playlistsObj = Object.fromEntries(userPlaylists);
        await fs.writeFile(path.join(__dirname, 'data', 'playlists.json'), JSON.stringify(playlistsObj, null, 2));
        
        const favoritesObj = Object.fromEntries(userFavorites);
        await fs.writeFile(path.join(__dirname, 'data', 'favorites.json'), JSON.stringify(favoritesObj, null, 2));
        
        console.log('💾 Dados salvos com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao salvar dados:', error);
    }
}

// Eventos do cliente
client.once(Events.ClientReady, async () => {
    console.log(`✅ ${client.user.tag} está online!`);
    console.log(`🎵 Bot Caffonía Enhanced carregado com sucesso!`);
    console.log(`📊 Funcionalidades ativas:`);
    console.log(`   - YouTube: ${config.features.enableYoutube ? '✅' : '❌'}`);
    console.log(`   - Spotify: ${config.features.enableSpotify ? '✅' : '❌'}`);
    console.log(`   - Playlists: ${config.features.enablePlaylists ? '✅' : '❌'}`);
    console.log(`   - Rádio 24/7: ${config.features.enableRadio ? '✅' : '❌'}`);
    console.log(`   - Timer: ${config.features.enableTimer ? '✅' : '❌'}`);
    
    await loadUserData();
    
    // Salvar dados a cada 5 minutos
    setInterval(saveUserData, 5 * 60 * 1000);
});

// Event listener para interações
client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isChatInputCommand()) {
        await handleSlashCommand(interaction);
    } else if (interaction.isButton()) {
        await handlers.handleButtonInteraction(interaction);
    }
});

// Função para lidar com comandos slash
async function handleSlashCommand(interaction) {
    const { commandName } = interaction;
    const guildId = interaction.guildId;
    const member = interaction.member;
    const userId = interaction.user.id;

    try {
        switch (commandName) {
            case 'play':
                await handlePlayCommand(interaction, 'youtube');
                break;
                
            case 'playspotify':
                await handlePlayCommand(interaction, 'spotify');
                break;
                
            case 'pause':
                await handlers.handlePauseCommand(interaction);
                break;
                
            case 'resume':
                await handlers.handleResumeCommand(interaction);
                break;
                
            case 'skip':
                await handlers.handleSkipCommand(interaction);
                break;
                
            case 'stop':
                await handlers.handleStopCommand(interaction);
                break;
                
            case 'queue':
                await handlers.handleQueueCommand(interaction);
                break;
                
            case 'volume':
                await handlers.handleVolumeCommand(interaction);
                break;
                
            case 'playlist':
                await handlers.handlePlaylistCommand(interaction);
                break;
                
            case 'fav':
                await handlers.handleFavoriteCommand(interaction);
                break;
                
            case 'mood':
                await handlers.handleMoodCommand(interaction);
                break;
                
            case 'sleep':
                await handlers.handleSleepCommand(interaction);
                break;
                
            case 'pomodoro':
                await handlers.handlePomodoroCommand(interaction);
                break;
                
            case 'radio':
                await handlers.handleRadioCommand(interaction);
                break;
                
            case 'shuffle':
                await handlers.handleShuffleCommand(interaction);
                break;
                
            case 'loop':
                await handlers.handleLoopCommand(interaction);
                break;
                
            case 'autoplay':
                await handlers.handleAutoplayCommand(interaction);
                break;
                
            case 'quality':
                await handlers.handleQualityCommand(interaction);
                break;
                
            case 'stats':
                await handlers.handleStatsCommand(interaction);
                break;
                
            case 'nowplaying':
                await handlers.handleNowPlayingCommand(interaction);
                break;
                
            case 'help':
                await handlers.handleHelpCommand(interaction);
                break;
                
            default:
                await interaction.reply('❌ Comando não reconhecido!');
        }
    } catch (error) {
        console.error('❌ Erro no comando:', error);
        const errorMessage = '❌ Ocorreu um erro ao executar o comando!';
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply(errorMessage);
        } else {
            await interaction.followUp(errorMessage);
        }
    }
}

// Importar handlers será feito após definir as variáveis globais

// Implementação do handler de play
async function handlePlayCommand(interaction, source = 'youtube') {
    const music = interaction.options.getString('musica');
    const member = interaction.member;
    const guildId = interaction.guildId;
    
    if (!member.voice.channel) {
        await interaction.reply('❌ Você precisa estar em um canal de voz!');
        return;
    }
    
    const permissions = member.voice.channel.permissionsFor(interaction.guild.members.me);
    if (!permissions.has('Connect') || !permissions.has('Speak')) {
        await interaction.reply('❌ Eu não tenho permissão para conectar ou falar neste canal!');
        return;
    }
    
    await interaction.deferReply();
    
    try {
        let song;
        
        if (source === 'spotify' && config.features.enableSpotify) {
            song = await searchSpotify(music);
        } else {
            song = await searchYoutube(music);
        }
        
        song.requestedBy = interaction.user.id;
        
        let queue = musicQueues.get(guildId);
        if (!queue) {
            queue = new EnhancedMusicQueue(guildId, member.voice.channel, interaction.channel);
            musicQueues.set(guildId, queue);
        }
        
        await queue.addSong(song);
        
        if (queue.currentSong && queue.currentSong !== song) {
            const embed = new EmbedBuilder()
                .setColor('#4ECDC4')
                .setTitle('✅ Música Adicionada à Fila')
                .setDescription(`**${song.title}**`)
                .addFields(
                    { name: '🎤 Artista', value: song.artist, inline: true },
                    { name: '⏱️ Duração', value: song.duration, inline: true },
                    { name: '📱 Fonte', value: song.source.toUpperCase(), inline: true },
                    { name: '📝 Posição na Fila', value: `${queue.songs.length + 1}`, inline: true }
                );
            
            if (song.thumbnail) {
                embed.setThumbnail(song.thumbnail);
            }
            
            await interaction.editReply({ embeds: [embed] });
        } else {
            await interaction.editReply('🎵 Iniciando reprodução...');
        }
        
    } catch (error) {
        await interaction.editReply(`❌ Erro ao buscar música: ${error.message}`);
    }
}

// Implementação dos outros handlers...
// (Continuarei implementando todos os handlers na próxima mensagem devido ao limite de caracteres)

// Login do bot
client.login(config.token);
