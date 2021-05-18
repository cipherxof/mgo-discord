type APIResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
}

type APIGames = {
  players: number;
  lobbies: GameLobby[];
}

type GameLobbyPlayer = {
  id: number;
  name: string;
  rank: number;
  host: boolean;
}

type GameLobby = {
  id: number;
  lobbyId: number;
  name: string;
  players: GameLobbyPlayer[];
  maxPlayers: number;
  locked: boolean;
  currentGame: number;
  games: Array<number[]>;
  comment: string;
  location: string;
}

type LobbyStats = {
  timeStarted: Date;
  peakPlayers: number;
}