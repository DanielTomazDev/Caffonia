const { Client, GatewayIntentBits, Events, ActivityType } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core');
const { search } = require('play-dl');
const config = require('./config');

// Criar cliente Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// Sistema de fila de música
const musicQueues = new Map();

// Estrutura de fila de música
class MusicQueue {
    constructor(guildId, voiceChannel, textChannel) {
        this.guildId = guildId;
        this.voiceChannel = voiceChannel;
        this.textChannel = textChannel;
        this.songs = [];
        this.currentSong = null;
        this.connection = null;
        this.player = null;
        this.volume = 0.5;
        this.isPlaying = false;
        this.isPaused = false;
    }

    async addSong(song) {
        this.songs.push(song);
        if (!this.isPlaying && this.songs.length === 1) {
            this.play();
        }
    }

    async play() {
        if (this.songs.length === 0) {
            this.isPlaying = false;
            return;
        }

        this.currentSong = this.songs.shift();
        this.isPlaying = true;
        this.isPaused = false;

        try {
            // Conectar ao canal de voz usando @discordjs/voice
            if (!this.connection) {
                this.connection = joinVoiceChannel({
                    channelId: this.voiceChannel.id,
                    guildId: this.guildId,
                    adapterCreator: this.voiceChannel.guild.voiceAdapterCreator,
                });

                // Aguardar conexão
                this.connection.on(VoiceConnectionStatus.Ready, () => {
                    console.log('Conectado ao canal de voz!');
                });
            }

            // Criar player de áudio
            if (!this.player) {
                this.player = createAudioPlayer();
                this.connection.subscribe(this.player);
            }

            console.log('Tentando reproduzir áudio real...');
            console.log('URL:', this.currentSong.url);
            
            // Usar @distube/ytdl-core para obter stream
            const stream = ytdl(this.currentSong.url, {
                filter: 'audioonly',
                highWaterMark: 1 << 25,
                requestOptions: {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                }
            });

            console.log('Stream obtido com sucesso!');

            // Criar resource de áudio
            const resource = createAudioResource(stream, {
                inputType: 'arbitrary'
            });

            // Reproduzir áudio
            this.player.play(resource);
            this.player.volume = this.volume;

            this.textChannel.send(`🎵 **Tocando:** ${this.currentSong.title}`);
            this.textChannel.send(`🔗 **URL:** ${this.currentSong.url}`);

            // Quando terminar, tocar próxima
            this.player.on(AudioPlayerStatus.Idle, () => {
                this.play();
            });

        } catch (error) {
            console.error('Erro ao reproduzir música:', error);
            this.textChannel.send('❌ Erro ao reproduzir a música! Tentando próxima...');
            setTimeout(() => {
                this.play();
            }, 2000);
        }
    }

    pause() {
        if (this.player && this.isPlaying) {
            this.player.pause();
            this.isPaused = true;
        }
    }

    resume() {
        if (this.player && this.isPaused) {
            this.player.unpause();
            this.isPaused = false;
        }
    }

    skip() {
        if (this.player) {
            this.player.stop();
        }
    }

    stop() {
        if (this.player) {
            this.player.stop();
        }
        this.songs = [];
        this.isPlaying = false;
        this.isPaused = false;
        if (this.connection) {
            this.connection.destroy();
            this.connection = null;
        }
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.player) {
            this.player.volume = this.volume;
        }
    }
}

// Evento de interação (slash commands)
client.on(Events.InteractionCreate, async (interaction) => {
    console.log('Interação recebida:', interaction.commandName);
    
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options } = interaction;

    try {
        switch (commandName) {
            case 'play':
                const query = options.getString('musica');
                if (!query) {
                    return await interaction.reply('❌ Por favor, forneça o nome da música!');
                }

                const voiceChannel = interaction.member.voice.channel;
                if (!voiceChannel) {
                    return await interaction.reply('❌ Você precisa estar em um canal de voz!');
                }

                // Verificar permissões do bot
                const botMember = interaction.guild.members.cache.get(client.user.id);
                if (!botMember.permissionsIn(voiceChannel).has(['Connect', 'Speak'])) {
                    return await interaction.reply('❌ O bot não tem permissão para conectar e falar neste canal!');
                }

                try {
                    console.log('Buscando música:', query);
                    
                    // Buscar música usando play-dl
                    const results = await search(query, { limit: 1 });
                    if (results.length === 0) {
                        return await interaction.reply('❌ Nenhuma música encontrada!');
                    }
                    
                    const video = results[0];
                    const song = {
                        title: video.title,
                        url: video.url,
                        duration: video.durationInSec || 180
                    };

                    console.log('Música encontrada:', song.title);

                    let queue = musicQueues.get(interaction.guild.id);
                    if (!queue) {
                        queue = new MusicQueue(interaction.guild.id, voiceChannel, interaction.channel);
                        musicQueues.set(interaction.guild.id, queue);
                    }

                    await queue.addSong(song);
                    await interaction.reply(`✅ **${song.title}** adicionada à fila!`);

                } catch (error) {
                    console.error('Erro no comando play:', error);
                    await interaction.reply('❌ Erro ao buscar a música!');
                }
                break;

            case 'pause':
                const pauseQueue = musicQueues.get(interaction.guild.id);
                if (!pauseQueue || !pauseQueue.isPlaying) {
                    return await interaction.reply('❌ Nenhuma música tocando!');
                }
                pauseQueue.pause();
                await interaction.reply('⏸️ Música pausada!');
                break;

            case 'resume':
                const resumeQueue = musicQueues.get(interaction.guild.id);
                if (!resumeQueue || !resumeQueue.isPaused) {
                    return await interaction.reply('❌ Nenhuma música pausada!');
                }
                resumeQueue.resume();
                await interaction.reply('▶️ Música retomada!');
                break;

            case 'skip':
                const skipQueue = musicQueues.get(interaction.guild.id);
                if (!skipQueue || !skipQueue.isPlaying) {
                    return await interaction.reply('❌ Nenhuma música tocando!');
                }
                skipQueue.skip();
                await interaction.reply('⏭️ Música pulada!');
                break;

            case 'stop':
                const stopQueue = musicQueues.get(interaction.guild.id);
                if (!stopQueue) {
                    return await interaction.reply('❌ Nenhuma música tocando!');
                }
                stopQueue.stop();
                await interaction.reply('⏹️ Música parada e fila limpa!');
                break;

            case 'queue':
                const queueQueue = musicQueues.get(interaction.guild.id);
                if (!queueQueue || queueQueue.songs.length === 0) {
                    return await interaction.reply('❌ Fila vazia!');
                }

                let queueText = '📋 **Fila de Músicas:**\n';
                queueQueue.songs.forEach((song, index) => {
                    queueText += `${index + 1}. ${song.title}\n`;
                });

                await interaction.reply(queueText);
                break;

            case 'volume':
                const volume = options.getInteger('volume');
                const volumeQueue = musicQueues.get(interaction.guild.id);
                if (!volumeQueue) {
                    return await interaction.reply('❌ Nenhuma música tocando!');
                }

                if (volume === null) {
                    return await interaction.reply(`🔊 Volume atual: ${Math.round(volumeQueue.volume * 100)}%`);
                }

                if (volume < 0 || volume > 100) {
                    return await interaction.reply('❌ Volume deve ser um número entre 0 e 100!');
                }

                volumeQueue.setVolume(volume / 100);
                await interaction.reply(`🔊 Volume alterado para ${volume}%!`);
                break;

            case 'help':
                const helpText = `🎵 Caffonía - Bot de Música para Discord

/play <música> - Toca uma música
/pause - Pausa a música
/resume - Retoma a música
/skip - Pula a música atual
/stop - Para a música e limpa a fila
/queue - Mostra a fila de músicas
/volume <0-100> - Ajusta o volume
/help - Mostra esta ajuda

Status: Bot funcionando com áudio real! ✅
API: @discordjs/voice + @distube/ytdl-core ✅
Conexão: Entra em canais de voz ✅
Áudio: Reprodução real funcionando ✅

Desenvolvido com ❤️ por Daniel Tomaz`;
                await interaction.reply(helpText);
                break;
        }
    } catch (error) {
        console.error('Erro ao executar comando:', error);
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp('❌ Erro ao executar o comando!');
            } else {
                await interaction.reply('❌ Erro ao executar o comando!');
            }
        } catch (replyError) {
            console.error('Erro ao responder interação:', replyError);
        }
    }
});

// Evento de ready
client.once(Events.ClientReady, async () => {
    console.log(`🎵 Caffonía está online! Logado como ${client.user.tag}`);
    client.user.setActivity('música no Discord', { type: ActivityType.Listening });
    
    // Registrar slash commands
    const { REST, Routes } = require('discord.js');
    const rest = new REST({ version: '10' }).setToken(config.token);
    
    const commands = [
        {
            name: 'play',
            description: 'Toca uma música',
            options: [
                {
                    name: 'musica',
                    description: 'Nome da música',
                    type: 3,
                    required: true
                }
            ]
        },
        {
            name: 'pause',
            description: 'Pausa a música atual'
        },
        {
            name: 'resume',
            description: 'Retoma a música pausada'
        },
        {
            name: 'skip',
            description: 'Pula para a próxima música'
        },
        {
            name: 'stop',
            description: 'Para a música e limpa a fila'
        },
        {
            name: 'queue',
            description: 'Mostra a fila de músicas'
        },
        {
            name: 'volume',
            description: 'Ajusta o volume',
            options: [
                {
                    name: 'volume',
                    description: 'Volume de 0 a 100',
                    type: 4,
                    required: false
                }
            ]
        },
        {
            name: 'help',
            description: 'Mostra a lista de comandos'
        }
    ];
    
    try {
        console.log('🔄 Registrando slash commands...');
        await rest.put(
            Routes.applicationCommands(config.clientId),
            { body: commands }
        );
        console.log('✅ Slash commands registrados com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao registrar slash commands:', error);
    }
});

// Evento de desconexão de voz
client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    const queue = musicQueues.get(newState.guild.id);
    if (queue && queue.voiceChannel.id === newState.channelId) {
        const members = queue.voiceChannel.members.filter(member => !member.user.bot);
        if (members.size === 0) {
            queue.stop();
            musicQueues.delete(newState.guild.id);
        }
    }
});

// Login do bot
client.login(config.token);
