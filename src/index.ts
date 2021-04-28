import Discord, { Message, TextChannel } from "discord.js";
import https from "https";
import { MgoGameMode, MgoGameModeNames, MgoMap, MgoMapNames, MgoMode, MgoModeNames } from "./constants";

// this code needs some cleanup, badly.

const client = new Discord.Client();
const clientToken = "ODMwOTc1NzM0NzA4MTc0ODk4.YHOgdQ.1OclibUy0fRBKvvOKCxuRAlyDcc";
const cacheMessages: Record<number, Discord.Message> = {};
const cacheLobbies: Record<number, GameLobby> = {};
const channelId = "817936605855088650";
let latestGameData: APIGames | undefined;

// Login to discord
client.login(clientToken);
client.on('ready', () => {
  console.log(`Logged in as ${client.user?.tag}!`);
  setInterval(queryLobbies, 5000);
});

// Handle commands
client.on('message', (msg: Message) => {
  const isAdmin = msg.member?.hasPermission("ADMINISTRATOR") === true;

  if (msg.content.trim() === "!players" || msg.content.trim() === "!games") {
    const gameCount = latestGameData?.lobbies.length;
    if (gameCount === 0) {
      msg.channel.send(`There are currently no games being played.`);
    } else {

      msg.channel.send(`There are a total of ${latestGameData?.players} players online and ${latestGameData?.lobbies.length} ${gameCount === 1 ? "game" : "games"} being played on MGO2PC. <https://mgo2pc.com/games>`);
    }
  } else if (msg.content.substr(0, 7) === "!alert " && isAdmin) {
    const alertMsg = msg.content.substr(7);
    console.log(alertMsg);
    sendAlert(alertMsg);
  }
});

const getGameEmbed = (lobby: GameLobby, closed = false) => {
  const currentGameData = lobby.games[lobby.currentGame];
  const gameModeId = currentGameData[0];
  const mapId = currentGameData[1];
  const modeId = currentGameData[2];
  const gameMode = lobby.lobbyId === 7 ? "Combat Training" : MgoGameModeNames[gameModeId as MgoGameMode];
  const map = MgoMapNames[mapId as MgoMap];
  const mode = MgoModeNames[modeId as MgoMode];
  const host = lobby.players.find((p) => p.host);
  const date = new Date();
  let title = closed ? `~~${lobby.name}~~` : `${lobby.name}`;
  title = `:flag_${lobby.location.toLowerCase()} ${title}`;

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
    hostname: 'www.mgo2pc.com',
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
          if (lobby.locked || lobby.lobbyId === 6) continue;

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

const sendAlert = (message: string) => {
  const https = require('http')

  const data = JSON.stringify({
    msg: encodeURI(message)
  })

  const options = {
    hostname: 'localhost',
    port: 80,
    path: '/api/v1/alert',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  }

  const req = https.request(options, (res: any) => {
    console.log(`statusCode: ${res.statusCode}`)

    res.on('data', (d: any) => {
      process.stdout.write(d)
    })
  })

  req.on('error', (error: any) => {
    console.error(error)
  })

  req.write(data)
  req.end()
}