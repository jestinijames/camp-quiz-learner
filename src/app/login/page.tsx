'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { dataService } from '@/lib/dataService';

type Team = {
  id: number;
  name: string;
  _count: {
    members: number;
  };
};

type Member = {
  id: number;
  name: string;
};

export default function LoginPage() {
  // Team login states
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [teamPassword, setTeamPassword] = useState('');
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Admin login states
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // General states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login, user, loading: authLoading } = useAuth();

  // Redirect immediately if user is authenticated
  useEffect(() => {
    if (user) {
      if (user.isAdmin) {
        window.location.href = '/admin/dashboard';
      } else {
        window.location.href = '/';
      }
    }
  }, [user]);

  // Fetch teams when component mounts
  useEffect(() => {
    const fetchTeams = async () => {
      setLoadingTeams(true);
      try {
        const teamsData = await dataService.getTeams();
        setTeams(teamsData);
      } catch (error) {
        console.error('Failed to fetch teams:', error);
        setError('Failed to load teams');
      } finally {
        setLoadingTeams(false);
      }
    };

    fetchTeams();
  }, []);

  // Fetch team members when a team is selected
  useEffect(() => {
    const fetchMembers = async () => {
      if (!selectedTeam) {
        setTeamMembers([]);
        setSelectedMember(null);
        return;
      }

      setLoadingMembers(true);
      try {
        const membersData = await dataService.getTeamMembers(selectedTeam.id);
        setTeamMembers(membersData);
        setSelectedMember(null); // Reset selected member
      } catch (error) {
        console.error('Failed to fetch team members:', error);
        setError('Failed to load team members');
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchMembers();
  }, [selectedTeam]);

  const handleTeamSelect = (teamId: string) => {
    const team = teams.find(t => t.id === parseInt(teamId));
    setSelectedTeam(team || null);
    setError(''); // Clear any previous errors
  };

  const handleMemberSelect = (memberId: string) => {
    const member = teamMembers.find(m => m.id === parseInt(memberId));
    setSelectedMember(member || null);
    setError(''); // Clear any previous errors
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const success = await login({
      username: adminUsername,
      password: adminPassword,
      isAdmin: true,
    });

    if (success) {
      window.location.href = '/admin/dashboard';
    } else {
      setError('Invalid admin credentials');
      setLoading(false);
    }
  };

  const handleTeamLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTeam || !selectedMember) {
      setError('Please select both team and member');
      return;
    }

    setLoading(true);
    setError('');

    const success = await login({
      teamName: selectedTeam.name,
      password: teamPassword,
      memberName: selectedMember.name,
    });

    if (success) {
      window.location.href = '/';
    } else {
      setError('Invalid team password');
      setLoading(false);
    }
  };

  // Show loading while checking authentication
  if (authLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p>Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Church Quiz App</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="team" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="team">Team Member</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
            </TabsList>
            
            <TabsContent value="team">
              <form onSubmit={handleTeamLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="teamSelect">Select Your Team</Label>
                  <Select onValueChange={handleTeamSelect} disabled={loadingTeams}>
                    <SelectTrigger className="w-full h-10">
                      <SelectValue 
                        placeholder={loadingTeams ? "Loading teams..." : "Choose your team"} 
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id.toString()}>
                          {team.name} ({team._count.members} members)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="memberSelect">Select Your Name</Label>
                  <Select 
                    onValueChange={handleMemberSelect} 
                    disabled={!selectedTeam || loadingMembers}
                    value={selectedMember?.id.toString() || ""}
                  >
                    <SelectTrigger className="w-full h-10">
                      <SelectValue 
                        placeholder={
                          !selectedTeam 
                            ? "First select a team" 
                            : loadingMembers 
                            ? "Loading members..." 
                            : teamMembers.length === 0
                            ? "No members found - type your name below"
                            : "Choose your name"
                        } 
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id.toString()}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Fallback input for new members */}
                {selectedTeam && teamMembers.length === 0 && !loadingMembers && (
                  <div className="space-y-2">
                    <Label htmlFor="newMemberName">Your Name (New Member)</Label>
                    <Input
                      id="newMemberName"
                      type="text"
                      placeholder="Enter your name"
                      className="h-10"
                      onChange={(e) => {
                        // Create a temporary member object for new users
                        setSelectedMember({ id: 0, name: e.target.value });
                      }}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="teamPassword">Team Password</Label>
                  <Input
                    id="teamPassword"
                    type="password"
                    value={teamPassword}
                    onChange={(e) => setTeamPassword(e.target.value)}
                    required
                    placeholder="Enter team password"
                    className="h-10"
                    disabled={!selectedTeam || !selectedMember}
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-10" 
                  disabled={loading || !selectedTeam || !selectedMember || !teamPassword}
                >
                  {loading ? 'Signing in...' : 'Sign in as Team Member'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="admin">
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="adminUsername">Username</Label>
                  <Input
                    id="adminUsername"
                    type="text"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    required
                    placeholder="Enter admin username"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminPassword">Password</Label>
                  <Input
                    id="adminPassword"
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    required
                    placeholder="Enter admin password"
                    className="h-10"
                  />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full h-10" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign in as Admin'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}