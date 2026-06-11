export interface MatchEvent {
  id: string;
  type: 'goal' | 'yellow_card' | 'red_card' | 'penalty' | 'substitution' | 'kickoff' | 'fulltime';
  minute: number;
  player: string;
  detail?: string; // e.g. "Assisted by Messi" or "Yellow for simulation" or "Sub: Pedri for Gavi"
  teamId: string; // ID of the team involved
}

export interface Match {
  id: string;
  homeTeam: {
    id: string;
    name: string;
    code: string;
    flag: string;
  };
  awayTeam: {
    id: string;
    name: string;
    code: string;
    flag: string;
  };
  homeScore: number;
  awayScore: number;
  status: 'upcoming' | 'live' | 'finished';
  date: string;
  time: string;
  group: string;
  stadium: string;
  minute: number;
  events: MatchEvent[];
  lineups?: {
    home: {
      formation: string;
      starting: { name: string; number: number; position: string }[];
      substitutes: string[];
    };
    away: {
      formation: string;
      starting: { name: string; number: number; position: string }[];
      substitutes: string[];
    };
  };
}

export interface TeamStanding {
  teamId: string;
  name: string;
  code: string;
  flag: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  status: 'Q' | 'E' | 'Pending'; // Qualified, Eliminated, Pending
}

export interface GroupStandings {
  groupName: string; // Group A, Group B, etc.
  standings: TeamStanding[];
}

export interface TopScorer {
  rank: number;
  name: string;
  team: string;
  flag: string;
  goals: number;
  assists: number;
  matchesPlayed: number;
}

export interface MVPPlayer {
  rank: number;
  name: string;
  team: string;
  flag: string;
  position: string;
  rating: number; // e.g., 8.92
  impact: string; // short summary
}

export interface UserPrediction {
  id: string;
  userId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  pointsEarned?: number;
  status: 'pending' | 'correct' | 'incorrect'; // points calculated when match finishes
  createdAt: string;
}

export interface LeaderboardUser {
  userId: string;
  displayName: string;
  points: number;
  accuracy: number; // percentage
  rank: number;
}

export interface UserProfileData {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isPremium: boolean;
  points: number;
  predictionsCount: number;
}
