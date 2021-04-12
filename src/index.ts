import Discord, { Message, TextChannel } from "discord.js";
import https from "https";
import { MgoGameMode, MgoGameModeNames, MgoMap, MgoMapNames, MgoMode, MgoModeNames } from "./constants";

const client = new Discord.Client();
const clientToken = "";
const cacheMessages: Record<number, Discord.Message> = {};
const cacheLobbies: Record<number, GameLobby> = {};
const channelId = "817184487061454928";
let latestGameData: APIGames | undefined;

// Login to discord
client.login(clientToken);
client.on('ready', () => {
  console.log(`Logged in as ${client.user?.tag}!`);
  setInterval(queryLobbies, 5000);
});

// Handle DMs
client.on('message', (msg: Message) => {
  if (msg.content.trim() === "!players" || msg.content.trim() === "!games") {
    const gameCount = latestGameData?.lobbies.length;
    if (gameCount === 0) {
      msg.channel.send(`There are currently no games being played.`);
    } else {
      msg.channel.send(`There are currently ${latestGameData?.players} players in ${latestGameData?.lobbies.length} ${gameCount === 1 ? "game" : "games"} on MGO2PC. <https://mgo2pc.com/games>`);
    }
  }
});

const getGameEmbed = (lobby: GameLobby, closed = false) => {
  const currentGameData = lobby.games[lobby.currentGame];
  const gameModeId = currentGameData[0];
  const mapId = currentGameData[1];
  const modeId = currentGameData[2];
  const gameMode = MgoGameModeNames[gameModeId as MgoGameMode];
  const map = MgoMapNames[mapId as MgoMap];
  const mode = MgoModeNames[modeId as MgoMode];
  const host = lobby.players.find((p) => p.host);
  const date = new Date();
  const title = closed ? `~~${lobby.name}~~` : `${lobby.name}`;

  const embed = new Discord.MessageEmbed()
    //`${lobby.name} (${lobby.players.length}/${lobby.maxPlayers})`
    .setTitle(title)

  if (!closed) {
    embed.setDescription(' ')
      .setURL("https://mgo2pc.com/games")
      .setThumbnail(`https://mgo2pc.com/static/media/maps/${currentGameData[1]}.jpg`)
      .addField('Map', `${map}`, true)
      .addField('Mode', `${gameMode}`, true)

    let playerList = '';
    for (const player of lobby.players) {
      playerList += `${player.name}\n`;
    }

    embed.addField(`Players (${lobby.players.length}/${lobby.maxPlayers})`, playerList);
  } else {
    embed.addField('Host', `${host?.name}`, true)
    embed.setDescription(`This lobby is now closed.`)
  }

  embed.setFooter('Powered by https://mgo2pc.com', `https://mgo2pc.com/static/media/icon.png`);

  return embed;
}

const queryLobbies = () => {
  const options = {
    hostname: 'mgo2pc.com',
    port: 443,
    path: '/api/v1/games',
    method: 'GET'
  };

  const req = https.request(options, res => {
    res.on('data', async (d: Buffer) => {
      try {
        const json: APIResponse<APIGames> = JSON.parse(d.toString());
        const lobbies = json.data.lobbies;

        latestGameData = json.data;

        // update active lobbies
        for (const lobby of lobbies) {
          if (lobby.locked) continue;

          const channel = client.channels.cache.get(channelId) as TextChannel;
          const embed = getGameEmbed(lobby);

          if (!cacheMessages[lobby.id]) {
            const message = await channel.send('<@&818099974935805972>', embed);
            cacheMessages[lobby.id] = message;
          } else {
            const message = cacheMessages[lobby.id];
            message.edit('<@&818099974935805972>', embed);
          }

          cacheLobbies[lobby.id] = lobby;
        }

        // remove dead lobbies
        for (const [key, value] of Object.entries(cacheMessages)) {
          const lobbyId: number = parseInt(key);
          const lobbyExists = lobbies.find((l) => l.id === lobbyId);

          if (!lobbyExists && cacheMessages[lobbyId]) {
            const message = cacheMessages[lobbyId];
            const embed = getGameEmbed(cacheLobbies[lobbyId], true);
            message.edit(embed);

            delete cacheMessages[lobbyId];
            delete cacheLobbies[lobbyId];
          }
        }

      } catch (e) {
        console.error(e);
      }
    })
  });

  req.on('error', (error) => {
    console.error(error);
  })

  req.end();
}