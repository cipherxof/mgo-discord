import Discord from "discord.js";
import https from "https";
import { MgoGameMode, MgoGameModeNames, MgoMap, MgoMapNames, MgoMode, MgoModeNames } from "./types/constants";

/**
 * Generate an embed of a game lobby.
 */
export const getGameEmbed = (lobby: GameLobby, closed = false, stats?: LobbyStats) => {
  try {
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
    title = `:flag_${lobby.location.toLowerCase()}: ${title}`;

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
      embed.addField('Host', `${host?.name}`)
      if (stats) {
        embed.addField('Lobby Duration', `${timeSince(stats.timeStarted)}`, true);
        embed.addField('Peak Player Count', `${stats.peakPlayers} / ${lobby.maxPlayers}`, true);
      }
      embed.setDescription(`This lobby is now closed.`);
    }

    embed.setFooter('Powered by https://mgo2pc.com', `https://mgo2pc.com/static/media/icon.png`);

    return embed;
  } catch (e) {
    console.error(e);
  }
}

/**
 * Gets the current list of active game lobbies.
 * @returns An api response of the /games endpoint on mgo2pc.com
 */
export const getGameLobbies = () => {
  return new Promise<APIResponse<APIGames>>((resolve, reject) => {
    const emptyResponse = { success: false, data: {} as APIGames };

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
          resolve(json);
        } catch (e) {
          console.error(e);
          resolve(emptyResponse);
        }
      })
    });

    req.on('error', (error) => {
      console.error(error);
      resolve(emptyResponse);
    })

    req.end();
  });
}

/**
 * Sends an in-game alert to all players.
 * @param message 
 */
export const sendGameAlert = (message: string) => {
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

/**
 * Get the time passed since a date in a readable format
 * @param date
 */
export function timeSince(date: Date) {
  const diff = new Date().getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  let interval = Math.floor(seconds / 31536000);

  if (interval > 1) {
    return interval + " years";
  }
  interval = Math.floor(seconds / 2592000);
  if (interval > 1) {
    return interval + " months";
  }
  interval = Math.floor(seconds / 86400);
  if (interval > 1) {
    return interval + " days";
  }
  interval = Math.floor(seconds / 3600);
  if (interval > 1) {
    return interval + " hours";
  }
  interval = Math.floor(seconds / 60);
  if (interval > 1) {
    return interval + " minutes";
  }
  return Math.floor(seconds) + " seconds";
}