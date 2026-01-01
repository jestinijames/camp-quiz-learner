type Team = {
  id: number;
  name: string;
  _count: {
    members: number;
  };
};

type Member = {
  id: number;
  firstName: string;
  email: string;
};

class DataService {
  private teamsCache: Team[] | null = null;
  private membersCache: Map<number, Member[]> = new Map();
  private cacheTimestamp: number | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private isCacheValid(): boolean {
    if (!this.cacheTimestamp) return false;
    return Date.now() - this.cacheTimestamp < this.CACHE_DURATION;
  }

  async getTeams(): Promise<Team[]> {
    // Return cached data if valid
    if (this.teamsCache && this.isCacheValid()) {
      return this.teamsCache;
    }

    try {
      const response = await fetch('/api/teams');
      if (!response.ok) {
        throw new Error('Failed to fetch teams');
      }
      
      const teams = await response.json();
      
      // Update cache
      this.teamsCache = teams;
      this.cacheTimestamp = Date.now();
      
      return teams;
    } catch (error) {
      console.error('Error fetching teams:', error);
      // Return cached data if available, even if expired
      return this.teamsCache || [];
    }
  }

  async getTeamMembers(teamId: number): Promise<Member[]> {
    // Return cached data if available
    if (this.membersCache.has(teamId)) {
      return this.membersCache.get(teamId)!;
    }

    try {
      const response = await fetch(`/api/teams/${teamId}/members`);
      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }
      const members = await response.json();
      // Update cache
      this.membersCache.set(teamId, members);
      return members;
    } catch (error) {
      console.error('Error fetching team members:', error);
      return [];
    }
  }

  // Clear cache when needed (e.g., after login/logout)
  clearCache(): void {
    this.teamsCache = null;
    this.membersCache.clear();
    this.cacheTimestamp = null;
  }
}

// Export a singleton instance
export const dataService = new DataService();