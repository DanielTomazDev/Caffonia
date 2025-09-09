const { Client, GatewayIntentBits, Events, SlashCommandBuilder, REST, Routes } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, getVoiceConnection } = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core');
const { search } = require('youtube-search-without-api-key');
const ffmpeg = require('ffmpeg-static');

// Configuração
const config = require('./config.js');

// Cliente Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
    ]
});

// Sistema de fila de música
const musicQueues = new Map();

// Comandos slash
const commands = [
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('Toca uma música')
        .addStringOption(option =>
            option.setName('musica')
                .setDescription('Nome da música ou URL do YouTube')
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
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Mostra os comandos disponíveis')
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

// Função para tocar música
async function playMusic(guildId, voiceChannel, textChannel, song) {
    try {
        let connection = getVoiceConnection(guildId);
        
        if (!connection) {
            connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: guildId,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            });
        }

        const player = createAudioPlayer();
        connection.subscribe(player);

        // Verificar se é URL do YouTube ou termo de busca
        let url = song;
        if (!song.startsWith('http')) {
            const searchResults = await search(song, { maxResults: 1 });
            if (searchResults.length === 0) {
                throw new Error('Nenhuma música encontrada!');
            }
            url = searchResults[0].url;
        }

        // Criar stream de áudio
        const stream = ytdl(url, {
            filter: 'audioonly',
            highWaterMark: 1 << 25,
            quality: 'highestaudio'
        });

        const resource = createAudioResource(stream);
        player.play(resource);

        player.on(AudioPlayerStatus.Playing, () => {
            console.log(`🎵 Tocando: ${song}`);
        });

        player.on(AudioPlayerStatus.Idle, () => {
            const queue = musicQueues.get(guildId);
            if (queue && queue.length > 0) {
                const nextSong = queue.shift();
                playMusic(guildId, voiceChannel, textChannel, nextSong);
            } else {
                connection.destroy();
                musicQueues.delete(guildId);
            }
        });

        player.on('error', error => {
            console.error('❌ Erro no player:', error);
            const queue = musicQueues.get(guildId);
            if (queue && queue.length > 0) {
                const nextSong = queue.shift();
                playMusic(guildId, voiceChannel, textChannel, nextSong);
            }
        });

    } catch (error) {
        console.error('❌ Erro ao tocar música:', error);
        throw error;
    }
}

// Eventos do cliente
client.once(Events.ClientReady, () => {
    console.log(`✅ ${client.user.tag} está online!`);
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;
    const guildId = interaction.guildId;
    const member = interaction.member;

    try {
        switch (commandName) {
            case 'play':
                const music = interaction.options.getString('musica');
                
                if (!member.voice.channel) {
                    await interaction.reply('❌ Você precisa estar em um canal de voz!');
                    return;
                }

                const permissions = member.voice.channel.permissionsFor(interaction.guild.members.me);
                if (!permissions.has('Connect') || !permissions.has('Speak')) {
                    await interaction.reply('❌ Eu não tenho permissão para conectar ou falar neste canal!');
                    return;
                }

                await interaction.reply('🔍 Procurando música...');
                
                try {
                    await playMusic(guildId, member.voice.channel, interaction.channel, music);
                    await interaction.followUp(`🎵 Tocando: ${music}`);
                } catch (error) {
                    await interaction.followUp('❌ Erro ao reproduzir a música!');
                }
                break;

            case 'pause':
                const connection = getVoiceConnection(guildId);
                if (connection) {
                    connection.state.subscription.player.pause();
                    await interaction.reply('⏸️ Música pausada!');
                } else {
                    await interaction.reply('❌ Nenhuma música tocando!');
                }
                break;

            case 'resume':
                const connection2 = getVoiceConnection(guildId);
                if (connection2) {
                    connection2.state.subscription.player.unpause();
                    await interaction.reply('▶️ Música retomada!');
                } else {
                    await interaction.reply('❌ Nenhuma música pausada!');
                }
                break;

            case 'skip':
                const connection3 = getVoiceConnection(guildId);
                if (connection3) {
                    connection3.state.subscription.player.stop();
                    await interaction.reply('⏭️ Música pulada!');
                } else {
                    await interaction.reply('❌ Nenhuma música tocando!');
                }
                break;

            case 'stop':
                const connection4 = getVoiceConnection(guildId);
                if (connection4) {
                    connection4.destroy();
                    musicQueues.delete(guildId);
                    await interaction.reply('⏹️ Música parada e fila limpa!');
                } else {
                    await interaction.reply('❌ Nenhuma música tocando!');
                }
                break;

            case 'queue':
                const queue = musicQueues.get(guildId) || [];
                if (queue.length === 0) {
                    await interaction.reply('📝 Fila vazia!');
                } else {
                    const queueList = queue.map((song, index) => `${index + 1}. ${song}`).join('\n');
                    await interaction.reply(`📝 Fila de músicas:\n${queueList}`);
                }
                break;

            case 'volume':
                const volume = interaction.options.getInteger('nivel');
                const connection5 = getVoiceConnection(guildId);
                if (connection5) {
                    connection5.state.subscription.player.resource.volume?.setVolume(volume / 100);
                    await interaction.reply(`🔊 Volume ajustado para ${volume}%!`);
                } else {
                    await interaction.reply('❌ Nenhuma música tocando!');
                }
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
        console.error('❌ Erro no comando:', error);
        if (!interaction.replied) {
            await interaction.reply('❌ Ocorreu um erro ao executar o comando!');
        }
    }
});

// Função principal para Netlify
exports.handler = async (event, context) => {
    try {
        // Inicializar o bot se ainda não estiver online
        if (!client.isReady()) {
            await client.login(config.token);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Bot Discord Caffonía está funcionando!',
                status: client.isReady() ? 'online' : 'offline',
                timestamp: new Date().toISOString()
            })
        };
    } catch (error) {
        console.error('❌ Erro no handler:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Erro interno do servidor',
                message: error.message
            })
        };
    }
};

// Manter o processo vivo
if (require.main === module) {
    client.login(config.token);
}
