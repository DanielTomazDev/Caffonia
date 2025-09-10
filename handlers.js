// Handlers complementares para o bot Caffonía Enhanced

const { EmbedBuilder } = require('discord.js');

// Handler para comando de pausa
async function handlePauseCommand(interaction) {
    const guildId = interaction.guildId;
    const queue = musicQueues.get(guildId);
    
    if (!queue || !queue.currentSong) {
        await interaction.reply('❌ Nenhuma música tocando!');
        return;
    }
    
    queue.player.pause();
    await interaction.reply('⏸️ Música pausada!');
}

// Handler para comando de resume
async function handleResumeCommand(interaction) {
    const guildId = interaction.guildId;
    const queue = musicQueues.get(guildId);
    
    if (!queue || !queue.currentSong) {
        await interaction.reply('❌ Nenhuma música pausada!');
        return;
    }
    
    queue.player.unpause();
    await interaction.reply('▶️ Música retomada!');
}

// Handler para comando de skip
async function handleSkipCommand(interaction) {
    const guildId = interaction.guildId;
    const queue = musicQueues.get(guildId);
    
    if (!queue || !queue.currentSong) {
        await interaction.reply('❌ Nenhuma música tocando!');
        return;
    }
    
    const skippedSong = queue.currentSong.title;
    queue.player.stop();
    await interaction.reply(`⏭️ Música pulada: **${skippedSong}**`);
}

// Handler para comando de stop
async function handleStopCommand(interaction) {
    const guildId = interaction.guildId;
    const queue = musicQueues.get(guildId);
    
    if (!queue) {
        await interaction.reply('❌ Nenhuma música tocando!');
        return;
    }
    
    queue.songs = [];
    queue.player.stop();
    if (queue.connection) {
        queue.connection.destroy();
    }
    musicQueues.delete(guildId);
    
    await interaction.reply('⏹️ Música parada e fila limpa!');
}

// Handler para comando de volume
async function handleVolumeCommand(interaction) {
    const volume = interaction.options.getInteger('nivel');
    const guildId = interaction.guildId;
    const queue = musicQueues.get(guildId);
    
    if (!queue || !queue.currentSong) {
        await interaction.reply('❌ Nenhuma música tocando!');
        return;
    }
    
    queue.volume = volume;
    if (queue.player.state.resource?.volume) {
        queue.player.state.resource.volume.setVolume(volume / 100);
    }
    
    await interaction.reply(`🔊 Volume ajustado para ${volume}%!`);
}

// Handler para comando de fila
async function handleQueueCommand(interaction) {
    const guildId = interaction.guildId;
    const queue = musicQueues.get(guildId);
    
    if (!queue || (!queue.currentSong && queue.songs.length === 0)) {
        await interaction.reply('📝 Fila vazia!');
        return;
    }
    
    const embed = new EmbedBuilder()
        .setColor('#FFE66D')
        .setTitle('📝 Fila de Músicas')
        .setFooter({ text: `Total: ${queue.songs.length + (queue.currentSong ? 1 : 0)} música(s)` });
    
    let description = '';
    
    if (queue.currentSong) {
        description += `**🎵 Tocando Agora:**\n${queue.currentSong.title} - ${queue.currentSong.artist}\n\n`;
    }
    
    if (queue.songs.length > 0) {
        description += '**📋 Próximas:**\n';
        queue.songs.slice(0, 10).forEach((song, index) => {
            description += `${index + 1}. ${song.title} - ${song.artist}\n`;
        });
        
        if (queue.songs.length > 10) {
            description += `\n... e mais ${queue.songs.length - 10} música(s)`;
        }
    }
    
    embed.setDescription(description || 'Fila vazia');
    
    await interaction.reply({ embeds: [embed] });
}

// Handler para sistema de playlists
async function handlePlaylistCommand(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    
    if (!userPlaylists.has(userId)) {
        userPlaylists.set(userId, {});
    }
    
    const userPlaylistsData = userPlaylists.get(userId);
    
    switch (subcommand) {
        case 'create':
            const playlistName = interaction.options.getString('nome');
            
            if (userPlaylistsData[playlistName]) {
                await interaction.reply('❌ Playlist já existe!');
                return;
            }
            
            userPlaylistsData[playlistName] = {
                name: playlistName,
                songs: [],
                createdAt: new Date(),
                totalDuration: 0
            };
            
            userPlaylists.set(userId, userPlaylistsData);
            await interaction.reply(`✅ Playlist **${playlistName}** criada!`);
            break;
            
        case 'add':
            const playlistToAdd = interaction.options.getString('playlist');
            const musicToAdd = interaction.options.getString('musica');
            
            if (!userPlaylistsData[playlistToAdd]) {
                await interaction.reply('❌ Playlist não encontrada!');
                return;
            }
            
            await interaction.deferReply();
            
            try {
                const song = await searchYoutube(musicToAdd);
                userPlaylistsData[playlistToAdd].songs.push(song);
                
                if (userPlaylistsData[playlistToAdd].songs.length > config.music.maxPlaylistSize) {
                    await interaction.editReply(`❌ Playlist cheia! Máximo de ${config.music.maxPlaylistSize} músicas.`);
                    return;
                }
                
                userPlaylists.set(userId, userPlaylistsData);
                await interaction.editReply(`✅ **${song.title}** adicionada à playlist **${playlistToAdd}**!`);
            } catch (error) {
                await interaction.editReply(`❌ Erro ao adicionar música: ${error.message}`);
            }
            break;
            
        case 'play':
            const playlistToPlay = interaction.options.getString('nome');
            
            if (!userPlaylistsData[playlistToPlay]) {
                await interaction.reply('❌ Playlist não encontrada!');
                return;
            }
            
            const playlist = userPlaylistsData[playlistToPlay];
            if (playlist.songs.length === 0) {
                await interaction.reply('❌ Playlist vazia!');
                return;
            }
            
            const member = interaction.member;
            if (!member.voice.channel) {
                await interaction.reply('❌ Você precisa estar em um canal de voz!');
                return;
            }
            
            await interaction.deferReply();
            
            const guildId = interaction.guildId;
            let queue = musicQueues.get(guildId);
            if (!queue) {
                queue = new EnhancedMusicQueue(guildId, member.voice.channel, interaction.channel);
                musicQueues.set(guildId, queue);
            }
            
            for (const song of playlist.songs) {
                song.requestedBy = userId;
                await queue.addSong({ ...song });
            }
            
            await interaction.editReply(`🎵 Tocando playlist **${playlistToPlay}** com ${playlist.songs.length} música(s)!`);
            break;
            
        case 'list':
            const playlists = Object.keys(userPlaylistsData);
            
            if (playlists.length === 0) {
                await interaction.reply('📝 Você não tem playlists criadas!');
                return;
            }
            
            const embed = new EmbedBuilder()
                .setColor('#A8E6CF')
                .setTitle('📋 Suas Playlists')
                .setDescription(playlists.map(name => {
                    const playlist = userPlaylistsData[name];
                    return `**${name}** - ${playlist.songs.length} música(s)`;
                }).join('\n'));
            
            await interaction.reply({ embeds: [embed] });
            break;
            
        case 'delete':
            const playlistToDelete = interaction.options.getString('nome');
            
            if (!userPlaylistsData[playlistToDelete]) {
                await interaction.reply('❌ Playlist não encontrada!');
                return;
            }
            
            delete userPlaylistsData[playlistToDelete];
            userPlaylists.set(userId, userPlaylistsData);
            await interaction.reply(`🗑️ Playlist **${playlistToDelete}** deletada!`);
            break;
    }
}

// Handler para sistema de favoritos
async function handleFavoriteCommand(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    
    if (!userFavorites.has(userId)) {
        userFavorites.set(userId, []);
    }
    
    const favorites = userFavorites.get(userId);
    
    switch (subcommand) {
        case 'add':
            const queue = musicQueues.get(guildId);
            if (!queue || !queue.currentSong) {
                await interaction.reply('❌ Nenhuma música tocando!');
                return;
            }
            
            const currentSong = queue.currentSong;
            
            // Verificar se já está nos favoritos
            if (favorites.find(song => song.url === currentSong.url)) {
                await interaction.reply('❌ Esta música já está nos seus favoritos!');
                return;
            }
            
            favorites.push({ ...currentSong });
            userFavorites.set(userId, favorites);
            
            await interaction.reply(`❤️ **${currentSong.title}** adicionada aos favoritos!`);
            break;
            
        case 'play':
            if (favorites.length === 0) {
                await interaction.reply('❌ Você não tem músicas favoritas!');
                return;
            }
            
            const member = interaction.member;
            if (!member.voice.channel) {
                await interaction.reply('❌ Você precisa estar em um canal de voz!');
                return;
            }
            
            await interaction.deferReply();
            
            let queue = musicQueues.get(guildId);
            if (!queue) {
                queue = new EnhancedMusicQueue(guildId, member.voice.channel, interaction.channel);
                musicQueues.set(guildId, queue);
            }
            
            // Embaralhar favoritos
            const shuffledFavorites = [...favorites].sort(() => Math.random() - 0.5);
            
            for (const song of shuffledFavorites) {
                song.requestedBy = userId;
                await queue.addSong({ ...song });
            }
            
            await interaction.editReply(`❤️ Tocando ${favorites.length} música(s) favorita(s) aleatoriamente!`);
            break;
            
        case 'list':
            if (favorites.length === 0) {
                await interaction.reply('❤️ Você não tem músicas favoritas!');
                return;
            }
            
            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('❤️ Suas Músicas Favoritas')
                .setDescription(favorites.slice(0, 10).map((song, index) => {
                    return `${index + 1}. **${song.title}** - ${song.artist}`;
                }).join('\n'))
                .setFooter({ text: `Total: ${favorites.length} música(s)` });
            
            await interaction.reply({ embeds: [embed] });
            break;
    }
}

// Handler para sistema de humor
async function handleMoodCommand(interaction) {
    const mood = interaction.options.getString('tipo');
    const guildId = interaction.guildId;
    const member = interaction.member;
    
    if (!member.voice.channel) {
        await interaction.reply('❌ Você precisa estar em um canal de voz!');
        return;
    }
    
    await interaction.deferReply();
    
    let queue = musicQueues.get(guildId);
    if (!queue) {
        queue = new EnhancedMusicQueue(guildId, member.voice.channel, interaction.channel);
        musicQueues.set(guildId, queue);
    }
    
    queue.mood = mood;
    
    // Buscar músicas do humor selecionado
    const moodQueries = getMoodPlaylist(mood);
    const randomQuery = moodQueries[Math.floor(Math.random() * moodQueries.length)];
    
    try {
        const results = await search(randomQuery, { limit: 5 });
        
        for (const result of results) {
            const song = {
                title: result.title,
                artist: result.channel?.name || 'Desconhecido',
                url: result.url,
                duration: result.durationFormatted,
                thumbnail: result.thumbnails?.[0]?.url,
                source: 'youtube',
                requestedBy: interaction.user.id
            };
            
            await queue.addSong(song);
        }
        
        const moodEmojis = {
            chill: '😌',
            focus: '🎯',
            gaming: '🎮',
            party: '🎉',
            sleep: '💤',
            workout: '🏃'
        };
        
        await interaction.editReply(`${moodEmojis[mood]} Modo **${mood}** ativado! Adicionadas 5 músicas à fila.`);
    } catch (error) {
        await interaction.editReply(`❌ Erro ao buscar músicas para o humor: ${error.message}`);
    }
}

// Handler para timer de sleep
async function handleSleepCommand(interaction) {
    const minutes = interaction.options.getInteger('minutos');
    const guildId = interaction.guildId;
    
    // Cancelar timer anterior se existir
    if (timers.has(guildId)) {
        clearTimeout(timers.get(guildId));
    }
    
    const timer = setTimeout(() => {
        const queue = musicQueues.get(guildId);
        if (queue) {
            queue.songs = [];
            queue.player.stop();
            if (queue.connection) {
                queue.connection.destroy();
            }
            musicQueues.delete(guildId);
            
            interaction.channel.send('💤 Timer de sleep ativado! Música parada.');
        }
        timers.delete(guildId);
    }, minutes * 60 * 1000);
    
    timers.set(guildId, timer);
    
    await interaction.reply(`⏰ Timer de sleep configurado para ${minutes} minuto(s)!`);
}

// Handler para Pomodoro
async function handlePomodoroCommand(interaction) {
    const cycles = interaction.options.getInteger('ciclos') || 4;
    const guildId = interaction.guildId;
    
    await interaction.reply(`🍅 Iniciando sessão Pomodoro com ${cycles} ciclo(s)!\n25min música → 5min pausa`);
    
    let currentCycle = 0;
    
    const pomodoroInterval = setInterval(() => {
        const queue = musicQueues.get(guildId);
        
        if (currentCycle % 2 === 0) {
            // Período de trabalho (música)
            interaction.channel.send(`🍅 Ciclo ${Math.floor(currentCycle / 2) + 1}: Período de trabalho (25min) - Música ativada!`);
            
            if (queue) {
                queue.player.unpause();
            }
        } else {
            // Período de pausa (silêncio)
            interaction.channel.send(`☕ Pausa de 5 minutos - Música pausada!`);
            
            if (queue) {
                queue.player.pause();
            }
        }
        
        currentCycle++;
        
        if (currentCycle >= cycles * 2) {
            clearInterval(pomodoroInterval);
            interaction.channel.send('🎉 Sessão Pomodoro concluída! Parabéns!');
        }
    }, currentCycle % 2 === 0 ? 25 * 60 * 1000 : 5 * 60 * 1000); // 25min ou 5min
}

// Handler para rádio 24/7
async function handleRadioCommand(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    
    switch (subcommand) {
        case 'start':
            const radioType = interaction.options.getString('tipo');
            const member = interaction.member;
            
            if (!member.voice.channel) {
                await interaction.reply('❌ Você precisa estar em um canal de voz!');
                return;
            }
            
            await interaction.deferReply();
            
            // URLs de rádios 24/7 do YouTube
            const radioUrls = {
                lofi: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', // Lofi Hip Hop Radio
                gaming: 'https://www.youtube.com/watch?v=4xDzrJKXOOY', // Gaming Music Radio
                work: 'https://www.youtube.com/watch?v=5qap5aO4i9A', // Work/Study Music
                chill: 'https://www.youtube.com/watch?v=DWcJFNfaw9c' // Chill Music Radio
            };
            
            let queue = musicQueues.get(guildId);
            if (!queue) {
                queue = new EnhancedMusicQueue(guildId, member.voice.channel, interaction.channel);
                musicQueues.set(guildId, queue);
            }
            
            const radioSong = {
                title: `Rádio ${radioType.toUpperCase()} 24/7`,
                artist: 'Rádio Online',
                url: radioUrls[radioType],
                duration: '∞',
                source: 'youtube',
                requestedBy: interaction.user.id,
                isRadio: true
            };
            
            queue.songs = [radioSong]; // Limpar fila e adicionar rádio
            queue.loop = 'song'; // Loop infinito
            
            await queue.playNext();
            
            radioStations.set(guildId, radioType);
            
            await interaction.editReply(`📻 Rádio ${radioType.toUpperCase()} 24/7 iniciada!`);
            break;
            
        case 'stop':
            if (radioStations.has(guildId)) {
                const queue = musicQueues.get(guildId);
                if (queue) {
                    queue.loop = 'off';
                    queue.player.stop();
                }
                radioStations.delete(guildId);
                await interaction.reply('📻 Rádio parada!');
            } else {
                await interaction.reply('❌ Nenhuma rádio ativa!');
            }
            break;
    }
}

// Handler para shuffle
async function handleShuffleCommand(interaction) {
    const guildId = interaction.guildId;
    const queue = musicQueues.get(guildId);
    
    if (!queue) {
        await interaction.reply('❌ Nenhuma música na fila!');
        return;
    }
    
    queue.shuffle = !queue.shuffle;
    
    if (queue.shuffle) {
        // Embaralhar a fila atual
        for (let i = queue.songs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [queue.songs[i], queue.songs[j]] = [queue.songs[j], queue.songs[i]];
        }
    }
    
    await interaction.reply(`🔀 Modo aleatório ${queue.shuffle ? 'ativado' : 'desativado'}!`);
}

// Handler para loop
async function handleLoopCommand(interaction) {
    const mode = interaction.options.getString('modo');
    const guildId = interaction.guildId;
    const queue = musicQueues.get(guildId);
    
    if (!queue) {
        await interaction.reply('❌ Nenhuma música tocando!');
        return;
    }
    
    if (mode) {
        queue.loop = mode;
    } else {
        // Ciclar entre os modos
        const modes = ['off', 'song', 'queue'];
        const currentIndex = modes.indexOf(queue.loop);
        queue.loop = modes[(currentIndex + 1) % modes.length];
    }
    
    const loopEmojis = {
        off: '❌ Desativado',
        song: '🔂 Música',
        queue: '🔁 Fila'
    };
    
    await interaction.reply(`🔁 Modo de repetição: ${loopEmojis[queue.loop]}`);
}

// Handler para autoplay
async function handleAutoplayCommand(interaction) {
    const guildId = interaction.guildId;
    const queue = musicQueues.get(guildId);
    
    if (!queue) {
        await interaction.reply('❌ Nenhuma música tocando!');
        return;
    }
    
    queue.autoplay = !queue.autoplay;
    await interaction.reply(`🎵 Reprodução automática ${queue.autoplay ? 'ativada' : 'desativada'}!`);
}

// Handler para qualidade
async function handleQualityCommand(interaction) {
    const quality = interaction.options.getString('nivel');
    const guildId = interaction.guildId;
    const queue = musicQueues.get(guildId);
    
    if (!queue) {
        await interaction.reply('❌ Nenhuma música tocando!');
        return;
    }
    
    queue.quality = quality;
    
    const qualityEmojis = {
        high: '🔊 Alta',
        low: '🔉 Baixa',
        auto: '🔄 Automática'
    };
    
    await interaction.reply(`🎧 Qualidade de áudio: ${qualityEmojis[quality]}`);
}

// Handler para estatísticas
async function handleStatsCommand(interaction) {
    const userId = interaction.user.id;
    
    if (!userStats.has(userId)) {
        await interaction.reply('📊 Você ainda não tem estatísticas!');
        return;
    }
    
    const stats = userStats.get(userId);
    const favorites = userFavorites.get(userId) || [];
    const playlists = Object.keys(userPlaylists.get(userId) || {});
    
    const embed = new EmbedBuilder()
        .setColor('#95E1D3')
        .setTitle('📊 Suas Estatísticas Musicais')
        .addFields(
            { name: '🎵 Total Reproduzido', value: `${stats.totalPlayed} música(s)`, inline: true },
            { name: '❤️ Favoritos', value: `${favorites.length} música(s)`, inline: true },
            { name: '📋 Playlists', value: `${playlists.length} playlist(s)`, inline: true }
        )
        .setFooter({ text: `Estatísticas de ${interaction.user.username}` });
    
    if (stats.history.length > 0) {
        const recentSongs = stats.history.slice(0, 5).map((song, index) => 
            `${index + 1}. ${song.title} - ${song.artist}`
        ).join('\n');
        
        embed.addFields({ name: '🕒 Reproduzidas Recentemente', value: recentSongs });
    }
    
    await interaction.reply({ embeds: [embed] });
}

// Handler para música atual
async function handleNowPlayingCommand(interaction) {
    const guildId = interaction.guildId;
    const queue = musicQueues.get(guildId);
    
    if (!queue || !queue.currentSong) {
        await interaction.reply('❌ Nenhuma música tocando!');
        return;
    }
    
    await queue.sendNowPlayingEmbed();
    await interaction.reply('🎵 Informações da música atual enviadas!');
}

// Handler para ajuda
async function handleHelpCommand(interaction) {
    const embed = new EmbedBuilder()
        .setColor('#FFD93D')
        .setTitle('🎵 Caffonía Enhanced - Comandos Disponíveis')
        .setDescription('Bot de música completo com Spotify, YouTube e muito mais!')
        .addFields(
            {
                name: '🎵 Reprodução Básica',
                value: '`/play` - Tocar do YouTube\n`/playspotify` - Tocar do Spotify\n`/pause` - Pausar\n`/resume` - Retomar\n`/skip` - Pular\n`/stop` - Parar\n`/queue` - Ver fila\n`/volume` - Ajustar volume',
                inline: true
            },
            {
                name: '📋 Playlists',
                value: '`/playlist create` - Criar playlist\n`/playlist add` - Adicionar música\n`/playlist play` - Tocar playlist\n`/playlist list` - Listar playlists\n`/playlist delete` - Deletar playlist',
                inline: true
            },
            {
                name: '❤️ Favoritos',
                value: '`/fav add` - Adicionar atual\n`/fav play` - Tocar favoritos\n`/fav list` - Listar favoritos',
                inline: true
            },
            {
                name: '🎭 Humores',
                value: '`/mood chill` - Música relaxante\n`/mood focus` - Para concentração\n`/mood gaming` - Para jogos\n`/mood party` - Festa\n`/mood sleep` - Para dormir\n`/mood workout` - Exercícios',
                inline: true
            },
            {
                name: '⏰ Timer & Pomodoro',
                value: '`/sleep` - Timer para parar\n`/pomodoro` - Sessão Pomodoro\n(25min música + 5min pausa)',
                inline: true
            },
            {
                name: '📻 Rádio 24/7',
                value: '`/radio start lofi` - Rádio Lo-Fi\n`/radio start gaming` - Rádio Gaming\n`/radio start work` - Rádio Trabalho\n`/radio stop` - Parar rádio',
                inline: true
            },
            {
                name: '⚙️ Configurações',
                value: '`/shuffle` - Modo aleatório\n`/loop` - Repetição\n`/autoplay` - Reprodução automática\n`/quality` - Qualidade do áudio',
                inline: true
            },
            {
                name: '📊 Informações',
                value: '`/stats` - Suas estatísticas\n`/nowplaying` - Música atual\n`/help` - Esta ajuda',
                inline: true
            }
        )
        .addFields({
            name: '✨ Funcionalidades Especiais',
            value: '• Controles por botões interativos\n• Integração Spotify + YouTube\n• Sistema inteligente de recomendações\n• Playlists personalizadas ilimitadas\n• Estatísticas detalhadas de uso\n• Modos de humor para cada ocasião\n• Timer e Pomodoro para produtividade\n• Rádio 24/7 sempre tocando\n• Qualidade de áudio ajustável',
            inline: false
        })
        .setFooter({ text: 'Desenvolvido com ❤️ por Daniel Tomaz | Caffonía Enhanced v2.0' });
    
    await interaction.reply({ embeds: [embed] });
}

// Handler para interações de botões
async function handleButtonInteraction(interaction) {
    const guildId = interaction.guildId;
    const queue = musicQueues.get(guildId);
    
    if (!queue) {
        await interaction.reply({ content: '❌ Nenhuma música tocando!', ephemeral: true });
        return;
    }
    
    switch (interaction.customId) {
        case 'pause_resume':
            if (queue.player.state.status === 'playing') {
                queue.player.pause();
                await interaction.reply({ content: '⏸️ Pausado!', ephemeral: true });
            } else {
                queue.player.unpause();
                await interaction.reply({ content: '▶️ Retomado!', ephemeral: true });
            }
            break;
            
        case 'skip':
            const skipped = queue.currentSong?.title || 'música';
            queue.player.stop();
            await interaction.reply({ content: `⏭️ **${skipped}** pulada!`, ephemeral: true });
            break;
            
        case 'shuffle':
            queue.shuffle = !queue.shuffle;
            await interaction.reply({ content: `🔀 Shuffle ${queue.shuffle ? 'ativado' : 'desativado'}!`, ephemeral: true });
            break;
            
        case 'loop':
            const modes = ['off', 'song', 'queue'];
            const currentIndex = modes.indexOf(queue.loop);
            queue.loop = modes[(currentIndex + 1) % modes.length];
            
            const loopNames = { off: 'Desativado', song: 'Música', queue: 'Fila' };
            await interaction.reply({ content: `🔁 Loop: ${loopNames[queue.loop]}`, ephemeral: true });
            break;
            
        case 'queue':
            await handleQueueCommand(interaction);
            break;
    }
}

module.exports = {
    handlePauseCommand,
    handleResumeCommand,
    handleSkipCommand,
    handleStopCommand,
    handleVolumeCommand,
    handleQueueCommand,
    handlePlaylistCommand,
    handleFavoriteCommand,
    handleMoodCommand,
    handleSleepCommand,
    handlePomodoroCommand,
    handleRadioCommand,
    handleShuffleCommand,
    handleLoopCommand,
    handleAutoplayCommand,
    handleQualityCommand,
    handleStatsCommand,
    handleNowPlayingCommand,
    handleHelpCommand,
    handleButtonInteraction
};
