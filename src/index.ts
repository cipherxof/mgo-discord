import Discord, { Message, TextChannel } from "discord.js";
import { LobbyType } from "./types/constants";
import { getGameEmbed, getGameLobbies, sendGameAlert } from "./utility";

// Configurables
const clientToken = "";
const gamesChannel = "817936605855088650";
const roleTag = "<@&818099974935805972>";

// Client data
const client = new Discord.Client();
const cacheMessages: Record<number, Discord.Message> = {};
const cacheLobbies: Record<number, GameLobby> = {};
const lobbyStats: Record<number, LobbyStats> = {};
let latestGameData: APIGames = { players: 0, lobbies: [] };

// Login to discord
client.login(clientToken);
client.on('ready', () => {
  console.log(`Logged in as ${client.user?.tag}!`);
  setInterval(queryLobbies, 5000);
});

// Handle commands
client.on('message', (msg: Message) => {
  const isAdmin = msg.member?.hasPermission("ADMINISTRATOR") === true;
  const contents = msg.content.trim();

  if (contents === "!players" || contents === "!games") {
    const gameCount = latestGameData.lobbies.length;
    if (gameCount === 0) {
      msg.channel.send(`There are currently no games being played.`);
    } else {
      msg.channel.send(`There are a total of ${latestGameData.players} players online and ${latestGameData.lobbies.length} ${gameCount === 1 ? "game" : "games"} being played on MGO2PC. <https://mgo2pc.com/games>`);
    }
  } else if (contents.substr(0, 7) === "!alert " && isAdmin) {
    sendGameAlert(contents.substr(7));
  }
});

/**
 * Gathers a list of currently active game lobbies and displays them in discord.
 */
const queryLobbies = async () => {
  const result = await getGameLobbies();

  if (!result.success) {
    console.log(`Failed retrieving lobbies: ${result.message}`);
    return;
  }

  latestGameData = result.data;

  const lobbies = result.data.lobbies;

  // Update  active lobbies
  for (const lobby of lobbies) {

    if (lobby.locked || lobby.lobbyId === LobbyType.Training || lobby.players.length === 0) continue;

    const channel = client.channels.cache.get(gamesChannel) as TextChannel;
    const embed = getGameEmbed(lobby);
    const stats = lobbyStats[lobby.id];

    if (!embed) {
      continue;
    }

    if (!cacheMessages[lobby.id]) {
      const message = await channel.send(roleTag, embed);
      cacheMessages[lobby.id] = message;
      lobbyStats[lobby.id] = {
        timeStarted: new Date(),
        peakPlayers: lobby.players.length
      }
    } else {
      const message = cacheMessages[lobby.id];
      message.edit(roleTag, embed);

      if (lobby.players.length > stats.peakPlayers) {
        stats.peakPlayers = lobby.players.length;
      }
    }

    cacheLobbies[lobby.id] = lobby;
  }

  // Remove dead lobbies
  for (const [key, value] of Object.entries(cacheMessages)) {
    const lobbyId: number = parseInt(key);
    const lobbyExists = lobbies.find((l) => l.id === lobbyId);
    const message = cacheMessages[lobbyId];
    const stats = lobbyStats[lobbyId];

    if (!lobbyExists && message) {
      const embed = getGameEmbed(cacheLobbies[lobbyId], true, stats);

      if (embed) {
        message.edit(embed);
      }

      delete cacheMessages[lobbyId];
      delete cacheLobbies[lobbyId];
    }
  }
};