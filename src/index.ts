import Discord, { TextChannel } from "discord.js";
import https from "https";
import { MgoGameMode, MgoGameModeNames, MgoMap, MgoMapNames, MgoMode, MgoModeNames } from "./constants";

const client = new Discord.Client();
const clientToken = "";
const cacheMessages: Record<number, Discord.Message> = {};
const cacheLobbies: Record<number, GameLobby> = {};

// Login to discord
client.login(clientToken);
client.on('ready', () => {
  console.log(`Logged in as ${client.user?.tag}!`);
  setInterval(queryLobbies, 5000);
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
    .setURL("https://mgo2pc.com/games")
    .setDescription(lobby.comment.replace(/(\r\n|\n|\r)/gm, " "))
    .setThumbnail(`https://mgo2pc.com/static/media/maps/${currentGameData[1]}.jpg`)
    .addField('Map', `${map}`, true)
    .addField('Mode', `${gameMode}`, true)

  let playerList = '';
  for (const player of lobby.players) {
    playerList += `${player.name}\n`;
  }

  embed.addField(`Players (${lobby.players.length}/${lobby.maxPlayers})`, playerList);
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

        // update active lobbies
        for (const lobby of lobbies) {
          const channel = client.channels.cache.get("817184487061454928") as TextChannel;
          const embed = getGameEmbed(lobby);

          if (!cacheMessages[lobby.id]) {
            const message = await channel.send(embed);
            cacheMessages[lobby.id] = message;
          } else {
            const message = cacheMessages[lobby.id];
            message.edit(embed);
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