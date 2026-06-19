import { Team, Player, Match, MatchEvent } from './types';

/**
 * Computes the team standings dynamically based on the current lists of matches and teams.
 */
export function computeStandings(teams: Team[], matches: Match[]): Team[] {
  // Initialize standings stats to 0
  const statsMap = new Map<string, Team>();
  
  teams.forEach(team => {
    statsMap.set(team.id, {
      ...team,
      points: 0,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
    });
  });

  // Process finished matches and live matches (optional, usually only finished)
  matches.forEach(match => {
    if (match.status !== 'finished') return;

    const home = statsMap.get(match.homeTeamId);
    const away = statsMap.get(match.awayTeamId);

    if (home) {
      home.played += 1;
      home.goalsFor += match.scoreHome;
      home.goalsAgainst += match.scoreAway;

      if (match.scoreHome > match.scoreAway) {
        home.wins += 1;
        home.points += 3;
      } else if (match.scoreHome === match.scoreAway) {
        home.draws += 1;
        home.points += 1;
      } else {
        home.losses += 1;
      }
    }

    if (away) {
      away.played += 1;
      away.goalsFor += match.scoreAway;
      away.goalsAgainst += match.scoreHome;

      if (match.scoreAway > match.scoreHome) {
        away.wins += 1;
        away.points += 3;
      } else if (match.scoreAway === match.scoreHome) {
        away.draws += 1;
        away.points += 1;
      } else {
        away.losses += 1;
      }
    }
  });

  // Calculate goal differences
  const computedStandings = Array.from(statsMap.values()).map(team => ({
    ...team,
    goalDifference: team.goalsFor - team.goalsAgainst,
  }));

  // Sort by points desc, GD desc, GF desc, name asc
  return computedStandings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.name.localeCompare(b.name, 'ar');
  });
}

/**
 * Computes consolidated stats for players by combining their base info and football events
 */
export function computePlayerStats(players: Player[], matches: Match[]): Player[] {
  // Map to collect stats
  const playersMap = new Map<string, Player>();
  
  players.forEach(p => {
    playersMap.set(p.id, {
      ...p,
      goals: 0,
      yellowCards: 0,
      redCards: 0,
    });
  });

  // Loop through all events in all matches (both finished and live)
  matches.forEach(match => {
    match.events.forEach(event => {
      const p = playersMap.get(event.playerId);
      if (p) {
        if (event.type === 'goal') {
          p.goals += 1;
        } else if (event.type === 'yellow_card') {
          p.yellowCards += 1;
        } else if (event.type === 'red_card') {
          p.redCards += 1;
        }
      }
    });
  });

  return Array.from(playersMap.values());
}

/**
 * Generates match fixtures for Round-Robin tournament setup (Standard League)
 */
export function generateLeagueFixtures(teams: Team[]): Omit<Match, 'id'>[] {
  if (teams.length < 2) return [];

  const tempTeams = [...teams];
  // If odd number, add a ghost team "Bye" (استراحة)
  const isOdd = tempTeams.length % 2 !== 0;
  const dummyTeamId = 'dummy-bye';
  if (isOdd) {
    tempTeams.push({
      id: dummyTeamId,
      name: 'استراحة',
      logoColor: 'bg-gray-400',
      logoIcon: '💤',
      points: 0, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0
    });
  }

  const numTeams = tempTeams.length;
  const numRounds = numTeams - 1;
  const halfSize = numTeams / 2;

  const fixtures: Omit<Match, 'id'>[] = [];

  for (let round = 0; round < numRounds; round++) {
    const roundName = `الجولة ${round + 1}`;
    
    for (let i = 0; i < halfSize; i++) {
      const homeIdx = (round + i) % (numTeams - 1);
      const awayIdx = (numTeams - 1 - i + round) % (numTeams - 1);

      // The last team remains in fixed position, others rotate
      const home = i === 0 ? tempTeams[numTeams - 1] : tempTeams[homeIdx];
      const away = tempTeams[awayIdx];

      // Skip bye games
      if (home.id === dummyTeamId || away.id === dummyTeamId) continue;

      fixtures.push({
        homeTeamId: home.id,
        homeTeamName: home.name,
        awayTeamId: away.id,
        awayTeamName: away.name,
        scoreHome: 0,
        scoreAway: 0,
        status: 'not_started',
        stage: roundName,
        events: [],
        date: new Date(Date.now() + 86400000 * (round + 1)).toISOString().split('T')[0], // Day after day
        time: i % 2 === 0 ? '16:00' : '18:00',
      });
    }
  }

  return fixtures;
}

/**
 * Generates initial pairings for Elimination Bracket (Quarter/Semi finals depending on count)
 */
export function generateKnockoutFixtures(teams: Team[]): Omit<Match, 'id'>[] {
  if (teams.length < 2) return [];
  
  // Shuffle teams for dynamic draw experience!
  const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
  
  // Find standard bracket power of 2 (2, 4, 8, 16)
  const count = shuffledTeams.length;
  let stageName = 'نهائي الكأس';
  if (count > 4) {
    stageName = 'ربع النهائي';
  } else if (count > 2) {
    stageName = 'نصف النهائي';
  }

  const matches: Omit<Match, 'id'>[] = [];
  
  for (let i = 0; i < count; i += 2) {
    // If odd team remains, they automatically get a wildcard or we pair them if possible
    if (i + 1 < count) {
      const home = shuffledTeams[i];
      const away = shuffledTeams[i+1];
      
      matches.push({
        homeTeamId: home.id,
        homeTeamName: home.name,
        awayTeamId: away.id,
        awayTeamName: away.name,
        scoreHome: 0,
        scoreAway: 0,
        status: 'not_started',
        stage: stageName,
        events: [],
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        time: (i / 2) % 2 === 0 ? '16:00' : '18:30',
      });
    }
  }

  return matches;
}

/**
 * Generates group stage groupings and direct league matches for each group.
 */
export function generateGroupStageFixtures(teams: Team[]): { matches: Omit<Match, 'id'>[], teamGroupAssignments: { teamId: string, group: string }[] } {
  if (teams.length < 2) return { matches: [], teamGroupAssignments: [] };

  // Shuffled teams
  const shuffled = [...teams].sort(() => Math.random() - 0.5);
  const count = shuffled.length;

  // Choose group count:
  // <= 3 teams: 1 group
  // 4 - 7 teams: 2 groups
  // 8 - 11 teams: 3 groups
  // >= 12 teams: 4 groups
  let numGroups = 1;
  if (count >= 12) numGroups = 4;
  else if (count >= 8) numGroups = 3;
  else if (count >= 4) numGroups = 2;

  const groupNames = ['A', 'B', 'C', 'D'];
  const groups: Team[][] = Array.from({ length: numGroups }, () => []);
  
  shuffled.forEach((team, idx) => {
    const groupIdx = idx % numGroups;
    groups[groupIdx].push(team);
  });

  const matches: Omit<Match, 'id'>[] = [];
  const teamGroupAssignments: { teamId: string, group: string }[] = [];

  groups.forEach((groupTeams, gIdx) => {
    const groupLetter = groupNames[gIdx];
    
    // Save team assignments
    groupTeams.forEach(t => {
      teamGroupAssignments.push({ teamId: t.id, group: groupLetter });
    });

    // Generate RR fixtures for this group
    const groupFixtures = generateLeagueFixtures(groupTeams);
    groupFixtures.forEach((fix, index) => {
      matches.push({
        ...fix,
        group: groupLetter,
        stage: `Group ${groupLetter} - ${fix.stage}`
      });
    });
  });

  return { matches, teamGroupAssignments };
}
