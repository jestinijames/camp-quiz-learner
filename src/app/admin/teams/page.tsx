'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, UserX } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Member = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
};

type Team = {
  id?: number;
  name: string;
  members: Member[];
};

export default function ManageTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTeams();
  }, []);

  async function fetchTeams() {
    try {
      const response = await axios.get<Team[]>('/api/admin/teams');
      setTeams(response.data);
    } catch {
      setError('Failed to fetch teams');
    }
  }

  async function addTeam() {
    if (!newTeamName.trim()) {
      setError('Team name is required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await axios.post('/api/admin/teams', { name: newTeamName.trim() });
      setNewTeamName('');
      await fetchTeams();
    } catch {
      setError('Failed to add team');
    } finally {
      setLoading(false);
    }
  }

  async function deleteTeam(teamId: number) {
    if (!confirm('Are you sure you want to delete this team? Members will be unassigned.')) {
      return;
    }

    setLoading(true);
    try {
      await axios.delete(`/api/admin/teams/${teamId}`);
      await fetchTeams();
    } catch {
      setError('Failed to delete team');
    } finally {
      setLoading(false);
    }
  }

  async function reassignMember(memberId: number, newTeamId: number, currentTeamId: number) {
    if (newTeamId === currentTeamId) return;

    setLoading(true);
    try {
      await axios.patch('/api/member/reassign', { memberId, teamId: newTeamId });
      await fetchTeams();
    } catch {
      setError('Failed to reassign member');
    } finally {
      setLoading(false);
    }
  }

  async function deleteMember(memberId: number, memberName: string) {
    if (!confirm(`Are you sure you want to delete ${memberName}? This will permanently remove their account.`)) {
      return;
    }

    setLoading(true);
    try {
      await axios.delete(`/api/member/${memberId}`);
      await fetchTeams();
    } catch {
      setError('Failed to delete member');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Manage Teams</h1>
        <p className="text-muted-foreground">
          Create teams to organize members. Members are assigned to teams during approval.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Team</CardTitle>
          <CardDescription>Create a new team to assign members to</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="Enter team name"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTeam()}
              disabled={loading}
            />
            <Button onClick={addTeam} disabled={loading || !newTeamName.trim()}>
              {loading ? 'Adding...' : 'Add Team'}
            </Button>
          </div>
          {error && <p className="text-destructive mt-2 text-sm">{error}</p>}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">
          Teams & Members ({teams.length} {teams.length === 1 ? 'team' : 'teams'})
        </h2>
        
        {teams.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <p className="text-muted-foreground text-center">
                No teams available. Create your first team above.
              </p>
            </CardContent>
          </Card>
        ) : (
          teams.map((team) => (
            <Card key={team.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{team.name}</CardTitle>
                    <CardDescription>
                      {team.members?.length || 0} {(team.members?.length || 0) === 1 ? 'member' : 'members'}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteTeam(team.id!)}
                    disabled={loading}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!team.members || team.members.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-4">
                    No members assigned to this team yet
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {team.members.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">
                            {member.firstName} {member.lastName}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {member.email}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Select
                                value={team.id?.toString()}
                                onValueChange={(value) => 
                                  reassignMember(member.id, parseInt(value), team.id!)
                                }
                                disabled={loading}
                              >
                                <SelectTrigger className="w-[140px] h-8">
                                  <SelectValue placeholder="Move to..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {teams
                                    .filter(t => t.id !== team.id)
                                    .map((t) => (
                                      <SelectItem key={t.id} value={t.id!.toString()}>
                                        {t.name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteMember(member.id, `${member.firstName} ${member.lastName}`)}
                                disabled={loading}
                              >
                                <UserX className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
