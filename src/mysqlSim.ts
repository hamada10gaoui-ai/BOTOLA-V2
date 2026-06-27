import { Tournament, Team, Player, Referee, Match } from './types';

// Simple interface for query execution results
export interface SQLQueryResult {
  columns: string[];
  rows: any[][];
  error?: string;
  queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE' | 'UNKNOWN';
  message?: string;
}

/**
 * A highly interactive, educational MySQL simulator running inside the client
 * to demonstrate relational database integrity, schemas, and live query execution.
 * 
 * It translates tournament application states into fully queryable relational tables.
 */
export class MySQLSimulator {
  private tournaments: Tournament[] = [];
  private teams: Team[] = [];
  private players: Player[] = [];
  private referees: Referee[] = [];
  private matches: Match[] = [];
  
  constructor(
    tournaments: Tournament[],
    teams: Team[],
    players: Player[],
    referees: Referee[],
    matches: Match[]
  ) {
    this.tournaments = tournaments;
    this.teams = teams;
    this.players = players;
    this.referees = referees;
    this.matches = matches;
  }

  // Generate a live INSERT query string for tournament actions
  public static getInsertTournamentSQL(t: Tournament, ownerId: string, pin: string): string {
    return `INSERT INTO tournaments (id, name, organizer_name, owner_id, draw_type, pin_code) \nVALUES ('${t.id}', '${t.name.replace(/'/g, "''")}', '${t.organizerName.replace(/'/g, "''")}', '${ownerId}', '${t.drawType}', '${pin}');`;
  }

  public static getInsertTeamSQL(team: Team, tournamentId: string): string {
    return `INSERT INTO teams (id, tournament_id, name, logo_url, color) \nVALUES ('${team.id}', '${tournamentId}', '${team.name.replace(/'/g, "''")}', ${team.logoIcon ? `'${team.logoIcon}'` : 'NULL'}, '${team.logoColor}');`;
  }

  public static getDeleteTeamSQL(teamId: string): string {
    return `DELETE FROM teams WHERE id = '${teamId}'; -- cascades to players and matches`;
  }

  public static getInsertPlayerSQL(p: Player): string {
    return `INSERT INTO players (id, team_id, name, number, goals, assists, yellow_cards, red_cards) \nVALUES ('${p.id}', '${p.teamId}', '${p.name.replace(/'/g, "''")}', ${p.number || 'NULL'}, ${p.goals || 0}, ${(p as any).assists || 0}, ${p.yellowCards || 0}, ${p.redCards || 0});`;
  }

  public static getInsertRefereeSQL(r: Referee, tournamentId: string): string {
    return `INSERT INTO referees (id, tournament_id, name, phone) \nVALUES ('${r.id}', '${tournamentId}', '${r.name.replace(/'/g, "''")}', ${r.phone ? `'${r.phone}'` : 'NULL'});`;
  }

  public static getInsertMatchSQL(m: Match, tournamentId: string): string {
    return `INSERT INTO matches (id, tournament_id, round, home_team_id, away_team_id, home_score, away_score, status, elapsed_time, referee_id) \nVALUES ('${m.id}', '${tournamentId}', '${m.stage.replace(/'/g, "''")}', '${m.homeTeamId}', '${m.awayTeamId}', ${m.scoreHome}, ${m.scoreAway}, '${m.status}', ${m.chronoSeconds || 0}, ${m.refereeId ? `'${m.refereeId}'` : 'NULL'});`;
  }

  public static getUpdateMatchSQL(m: Match): string {
    return `UPDATE matches \nSET home_score = ${m.scoreHome}, away_score = ${m.scoreAway}, status = '${m.status}', elapsed_time = ${m.chronoSeconds || 0} \nWHERE id = '${m.id}';`;
  }

  public static getInsertMatchEventSQL(eventId: string, matchId: string, type: string, playerId: string, assistPlayerId: string | null, minute: number): string {
    return `INSERT INTO match_events (id, match_id, type, player_id, assist_player_id, minute) \nVALUES ('${eventId}', '${matchId}', '${type}', '${playerId}', ${assistPlayerId ? `'${assistPlayerId}'` : 'NULL'}, ${minute});`;
  }

  /**
   * Executes a parsed SQL SELECT statement against our relational state
   */
  public executeQuery(sql: string): SQLQueryResult {
    const cleanSql = sql.trim().replace(/;$/, '');
    const upperSql = cleanSql.toUpperCase();

    if (upperSql.startsWith('SELECT')) {
      return this.handleSelect(cleanSql);
    } else if (upperSql.startsWith('INSERT')) {
      return {
        columns: [],
        rows: [],
        queryType: 'INSERT',
        message: 'Query OK, 1 row affected (Simulated local state).'
      };
    } else if (upperSql.startsWith('UPDATE')) {
      return {
        columns: [],
        rows: [],
        queryType: 'UPDATE',
        message: 'Query OK, rows updated successfully (Simulated local state).'
      };
    } else if (upperSql.startsWith('DELETE')) {
      return {
        columns: [],
        rows: [],
        queryType: 'DELETE',
        message: 'Query OK, rows deleted successfully (Simulated local state).'
      };
    } else if (upperSql.startsWith('CREATE') || upperSql.startsWith('USE') || upperSql.startsWith('SET')) {
      return {
        columns: [],
        rows: [],
        queryType: 'CREATE',
        message: 'Command executed successfully. Database state intact.'
      };
    }

    return {
      columns: [],
      rows: [],
      queryType: 'UNKNOWN',
      error: `Syntax Error: Unsupported SQL keyword or syntax error near "${cleanSql.split(' ')[0]}".`
    };
  }

  private handleSelect(sql: string): SQLQueryResult {
    const cleanSql = sql.replace(/\s+/g, ' ');
    const parts = cleanSql.split(/ FROM /i);
    if (parts.length < 2) {
      return {
        columns: [],
        rows: [],
        queryType: 'SELECT',
        error: "SQL Syntax Error: Missing FROM clause."
      };
    }

    const selectFields = parts[0].replace(/SELECT/i, '').trim();
    const remainingParts = parts[1].split(/WHERE/i);
    const tableNameWithAlias = remainingParts[0].trim().split(' ');
    const tableName = tableNameWithAlias[0].toUpperCase();

    // Determine target table
    let data: any[] = [];
    switch (tableName) {
      case 'TEAMS':
        data = this.teams.map(t => ({
          id: t.id,
          tournament_id: (t as any).tournamentId || 'tour-active',
          name: t.name,
          color: t.logoColor,
          logo_url: t.logoIcon || 'NULL'
        }));
        break;
      case 'PLAYERS':
        data = this.players.map(p => ({
          id: p.id,
          team_id: p.teamId,
          name: p.name,
          number: p.number,
          goals: p.goals || 0,
          assists: (p as any).assists || 0,
          yellow_cards: p.yellowCards || 0,
          red_cards: p.redCards || 0
        }));
        break;
      case 'MATCHES':
        data = this.matches.map(m => ({
          id: m.id,
          round: m.stage || '',
          home_team_id: m.homeTeamId,
          away_team_id: m.awayTeamId,
          home_score: m.scoreHome,
          away_score: m.scoreAway,
          status: m.status,
          elapsed_time: m.chronoSeconds || 0,
          referee_id: m.refereeId || 'NULL'
        }));
        break;
      case 'REFEREES':
        data = this.referees.map(r => ({
          id: r.id,
          name: r.name,
          phone: r.phone || 'NULL'
        }));
        break;
      case 'TOURNAMENTS':
        data = this.tournaments.map(t => ({
          id: t.id,
          name: t.name,
          organizer_name: t.organizerName,
          draw_type: t.drawType
        }));
        break;
      default:
        // Attempting to look for subqueries or other tables
        return {
          columns: [],
          rows: [],
          queryType: 'SELECT',
          error: `Table "${tableName}" not found in database schema.`
        };
    }

    // Handle ORDER BY
    const orderByParts = parts[1].split(/ORDER BY/i);
    let whereClause = remainingParts[1] ? remainingParts[1].split(/ORDER BY/i)[0].trim() : '';
    let orderByClause = orderByParts[1] ? orderByParts[1].trim() : '';

    // Apply basic WHERE filtering
    let filteredData = [...data];
    if (whereClause) {
      try {
        // Handle simple column = 'value' or column > number
        if (whereClause.includes('=')) {
          const [col, val] = whereClause.split('=').map(s => s.trim().replace(/'/g, ''));
          const colKey = col.toLowerCase();
          filteredData = filteredData.filter(item => {
            const itemVal = item[colKey];
            return String(itemVal).toUpperCase() === String(val).toUpperCase();
          });
        } else if (whereClause.includes('>')) {
          const [col, val] = whereClause.split('>').map(s => s.trim());
          const colKey = col.toLowerCase();
          const numericVal = parseFloat(val);
          filteredData = filteredData.filter(item => {
            const itemVal = item[colKey];
            return parseFloat(itemVal) > numericVal;
          });
        }
      } catch (e) {
        console.error("Filter parse error:", e);
      }
    }

    // Apply sorting
    if (orderByClause) {
      try {
        const [col, direction] = orderByClause.split(/\s+/).map(s => s.trim());
        const colKey = col.toLowerCase();
        const desc = direction && direction.toUpperCase() === 'DESC';
        filteredData.sort((a, b) => {
          const valA = a[colKey];
          const valB = b[colKey];
          if (typeof valA === 'number' && typeof valB === 'number') {
            return desc ? valB - valA : valA - valB;
          }
          return desc 
            ? String(valB).localeCompare(String(valA))
            : String(valA).localeCompare(String(valB));
        });
      } catch (e) {
        console.error("Order By parse error:", e);
      }
    }

    // Limit columns selection
    if (filteredData.length === 0) {
      const allCols = data.length > 0 ? Object.keys(data[0]) : ['id'];
      const columns = selectFields === '*' ? allCols : selectFields.split(',').map(s => s.trim().toLowerCase());
      return {
        columns,
        rows: [],
        queryType: 'SELECT',
        message: 'Empty set (0.00 sec)'
      };
    }

    const firstItem = filteredData[0];
    const allColumns = Object.keys(firstItem);
    const selectedColumns = selectFields === '*' 
      ? allColumns 
      : selectFields.split(',').map(s => s.trim());

    // Map rows
    const rows = filteredData.map(item => {
      return selectedColumns.map(col => {
        const key = col.toLowerCase();
        return item[key] !== undefined ? item[key] : 'NULL';
      });
    });

    return {
      columns: selectedColumns,
      rows,
      queryType: 'SELECT',
      message: `${rows.length} row${rows.length > 1 ? 's' : ''} in set (0.01 sec)`
    };
  }
}
