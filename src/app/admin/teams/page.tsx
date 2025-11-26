'use client';

import  { useState, useEffect } from 'react';

import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

type Member = { name: string };
type Team = {
  id?: number;
  name: string;
  password: string;
  members: Member[];
};

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([
    { name: '', password: '', members: [{ name: '' }, { name: '' }] },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchTeams() {
      try {
        const response = await axios.get<Team[]>('/api/admin/teams');
        if (response.data.length > 0) setTeams(response.data);
      } catch {
        // ignore or show error
      }
    }
    fetchTeams();
  }, []);

  function updateTeamField(i: number, field: keyof Team, value: string) {
    const newTeams = [...teams];
    (newTeams[i][field] as string) = value;
    setTeams(newTeams);
  }

  function updateMemberName(teamIndex: number, memberIndex: number, value: string) {
    const newTeams = [...teams];
    newTeams[teamIndex].members[memberIndex].name = value;
    setTeams(newTeams);
  }

  function addMember(teamIndex: number) {
    const newTeams = [...teams];
    newTeams[teamIndex].members.push({ name: '' });
    setTeams(newTeams);
  }

  function addTeam() {
    setTeams([...teams, { name: '', password: '', members: [{ name: '' }, { name: '' }] }]);
  }

  async function saveTeams() {
    setLoading(true);
    setError('');
    try {
      await axios.post('/api/admin/teams', { teams });
      alert('Teams saved successfully');
    } catch {
      setError('Failed to save teams');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold mb-4">Admin: Manage Teams & Members</h1>

      {teams.map((team, ti) => (
        <div key={ti} className="border rounded p-4 space-y-4">
          <Input
            placeholder="Team Name"
            value={team.name}
            onChange={e => updateTeamField(ti, 'name', e.target.value)}
          />
          <Input
            placeholder="Team Password"
            type="password"
            value={team.password}
            onChange={e => updateTeamField(ti, 'password', e.target.value)}
          />
          <Label className="font-semibold">Members</Label>
          {team.members.map((member, mi) => (
            <Input
              key={mi}
              placeholder={`Member ${mi + 1} Name`}
              className="mb-2"
              value={member.name}
              onChange={e => updateMemberName(ti, mi, e.target.value)}
            />
          ))}
          <Button variant="outline" onClick={() => addMember(ti)}>
            + Add Member
          </Button>
        </div>
      ))}

      <Button variant="secondary" onClick={addTeam}>
        + Add Team
      </Button>

      <div>
        <Button size="lg" onClick={saveTeams} disabled={loading}>
          {loading ? 'Saving...' : 'Save Teams'}
        </Button>
        {error && <p className="text-destructive mt-2">{error}</p>}
      </div>
    </div>
  );
}
