type APIResponse<T> = {
  success: boolean;
  data: T;
}

type GameLobbyPlayer = {
  id: number;
  name: string;
  rank: number;
  host: boolean;
}

type GameLobby = {
  id: number;
  name: string;
  players: GameLobbyPlayer[];
  maxPlayers: number;
  locked: boolean;
  currentGame: number;
  games: Array<number[]>;
  comment: string;
}

type APIGames = {
  players: number;
  lobbies: GameLobby[];
}