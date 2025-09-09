const { Client, GatewayIntentBits, Events, SlashCommandBuilder, REST, Routes } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, getVoiceConnection } = require('@discordjs/voice');
const { search } = require('youtube-search-without-api-key');

// Configuração
const config = {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    prefix: '!',
    music: {
        maxQueueSize: 99,
        defaultVolume: 50
    }
};

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

// Função para buscar música
async function searchMusic(query) {
    try {
        const searchResults = await search(query, { maxResults: 1 });
        if (searchResults.length === 0) {
            throw new Error('Nenhuma música encontrada!');
        }
        return {
            title: searchResults[0].title,
            url: searchResults[0].url,
            thumbnail: searchResults[0].thumbnail
        };
    } catch (error) {
        console.error('❌ Erro ao buscar música:', error);
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
                
                await interaction.reply('🔍 Procurando música...');
                
                try {
                    const musicInfo = await searchMusic(music);
                    await interaction.followUp(`🎵 **${musicInfo.title}**\n🔗 ${musicInfo.url}\n\n⚠️ **Nota**: A reprodução de áudio não está disponível no Netlify. Use o bot local para reproduzir música!`);
                } catch (error) {
                    await interaction.followUp('❌ Nenhuma música encontrada!');
                }
                break;

            case 'pause':
                await interaction.reply('⏸️ **Comando pausa**\n⚠️ A reprodução de áudio não está disponível no Netlify. Use o bot local para reproduzir música!');
                break;

            case 'resume':
                await interaction.reply('▶️ **Comando retomar**\n⚠️ A reprodução de áudio não está disponível no Netlify. Use o bot local para reproduzir música!');
                break;

            case 'skip':
                await interaction.reply('⏭️ **Comando pular**\n⚠️ A reprodução de áudio não está disponível no Netlify. Use o bot local para reproduzir música!');
                break;

            case 'stop':
                await interaction.reply('⏹️ **Comando parar**\n⚠️ A reprodução de áudio não está disponível no Netlify. Use o bot local para reproduzir música!');
                break;

            case 'queue':
                await interaction.reply('📝 **Fila de músicas**\n⚠️ A reprodução de áudio não está disponível no Netlify. Use o bot local para reproduzir música!');
                break;

            case 'volume':
                const volume = interaction.options.getInteger('nivel');
                await interaction.reply(`🔊 **Volume ${volume}%**\n⚠️ A reprodução de áudio não está disponível no Netlify. Use o bot local para reproduzir música!`);
                break;

            case 'help':
                const helpText = `🎵 Caffonía - Bot de Música para Discord

/play <música> - Busca uma música no YouTube
/pause - Comando pausa (apenas local)
/resume - Comando retomar (apenas local)
/skip - Comando pular (apenas local)
/stop - Comando parar (apenas local)
/queue - Mostra fila (apenas local)
/volume <0-100> - Ajusta volume (apenas local)
/help - Mostra esta ajuda

Status: Bot online no Netlify! ✅
Funcionalidade: Busca de músicas ✅
Limitação: Reprodução apenas local ⚠️
Para reproduzir: Use o bot local! 🎶

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
