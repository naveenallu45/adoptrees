'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { SparklesIcon, PlusIcon, MapPinIcon } from '@heroicons/react/24/outline';
import LocationPicker from '../../../../components/WellWisher/LocationPicker';

interface TeamInfo {
  name: string;
  code: string;
  flagUrl?: string;
}

interface HockeyMatch {
  _id: string;
  matchId: string;
  tournament: string;
  venue: string;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  matchDate: string;
  penaltyCorners: number;
  fieldGoals: number;
  treesPerPenaltyCorner: number;
  treesPerFieldGoal: number;
  treesPlanted: number;
  notes?: string;
  location?: {
    latitude: number;
    longitude: number;
    radiusMeters?: number;
  };
}

interface MatchesResponse {
  success: boolean;
  data: HockeyMatch[];
  metrics: {
    totalMatches: number;
    totalTreesPlanted: number;
    totalTreesEstimated: number;
  };
}

const DEFAULT_TREES_PC = 50;
const DEFAULT_TREES_FG = 100;

export default function HockeyIndiaMatchesAdminPage() {
  const [matches, setMatches] = useState<HockeyMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<HockeyMatch | null>(null);
  const [metrics, setMetrics] = useState<MatchesResponse['metrics'] | null>(null);
  const [_uploadingHomeFlag, setUploadingHomeFlag] = useState(false);
  const [_uploadingAwayFlag, setUploadingAwayFlag] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);

  const [form, setForm] = useState({
    matchId: '',
    tournament: 'FIH Hockey World Cup 2026 Qualifiers',
    venue: 'Gachibowli Stadium, Hyderabad, Telangana',
    matchDate: '',
    homeTeamName: 'India',
    homeTeamCode: 'IND',
    homeFlagUrl: '',
    awayTeamName: '',
    awayTeamCode: '',
    awayFlagUrl: '',
    penaltyCorners: 0,
    fieldGoals: 0,
    treesPerPenaltyCorner: DEFAULT_TREES_PC,
    treesPerFieldGoal: DEFAULT_TREES_FG,
    treesPlanted: 0,
    notes: '',
    locationLatitude: undefined as number | undefined,
    locationLongitude: undefined as number | undefined,
  });

  useEffect(() => {
    const loadMatches = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/hockey-india/matches', { cache: 'no-store' });
        const json: MatchesResponse = await res.json();
        if (!json.success) {
          throw new Error('Failed to load matches');
        }
        setMatches(json.data);
        setMetrics(json.metrics);
      } catch (err) {
        console.error(err);
        setError('Failed to load Hockey India matches');
      } finally {
        setLoading(false);
      }
    };

    loadMatches();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === 'penaltyCorners' ||
          name === 'fieldGoals' ||
          name === 'treesPerPenaltyCorner' ||
          name === 'treesPerFieldGoal' ||
          name === 'treesPlanted'
          ? Number(value || 0)
          : value,
    }));
  };

  const handleFlagUpload = async (side: 'home' | 'away', file: File | null) => {
    if (!file) return;
    setUploadError(null);

    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image file.');
      return;
    }

    try {
      if (side === 'home') setUploadingHomeFlag(true);
      if (side === 'away') setUploadingAwayFlag(true);

      const data = new FormData();
      data.append('file', file);

      const res = await fetch('/api/admin/hockey-india/upload-flag', {
        method: 'POST',
        body: data,
      });

      const json = await res.json();
      if (!json.success || !json.url) {
        throw new Error(json.message || 'Upload failed');
      }

      setForm((prev) => ({
        ...prev,
        homeFlagUrl: side === 'home' ? json.url : prev.homeFlagUrl,
        awayFlagUrl: side === 'away' ? json.url : prev.awayFlagUrl,
      }));
    } catch (err) {
      console.error(err);
      setUploadError('Failed to upload image. Please try again.');
    } finally {
      if (side === 'home') setUploadingHomeFlag(false);
      if (side === 'away') setUploadingAwayFlag(false);
    }
  };

  const openCreateForm = () => {
    setEditing(null);
    setForm({
      matchId: '',
      tournament: 'FIH Hockey World Cup 2026 Qualifiers',
      venue: 'Gachibowli Stadium, Hyderabad, Telangana',
      matchDate: '',
      homeTeamName: 'India',
      homeTeamCode: 'IND',
      homeFlagUrl: '',
      awayTeamName: '',
      awayTeamCode: '',
      awayFlagUrl: '',
      penaltyCorners: 0,
      fieldGoals: 0,
      treesPerPenaltyCorner: DEFAULT_TREES_PC,
      treesPerFieldGoal: DEFAULT_TREES_FG,
      treesPlanted: 0,
      notes: '',
      locationLatitude: undefined,
      locationLongitude: undefined,
    });
    setFormOpen(true);
  };

  const openEditForm = (match: HockeyMatch) => {
    setEditing(match);
    setForm({
      matchId: match.matchId,
      tournament: match.tournament,
      venue: match.venue,
      matchDate: match.matchDate ? match.matchDate.substring(0, 10) : '',
      homeTeamName: match.homeTeam.name,
      homeTeamCode: match.homeTeam.code,
      homeFlagUrl: match.homeTeam.flagUrl || '',
      awayTeamName: match.awayTeam.name,
      awayTeamCode: match.awayTeam.code,
      awayFlagUrl: match.awayTeam.flagUrl || '',
      penaltyCorners: match.penaltyCorners,
      fieldGoals: match.fieldGoals,
      treesPerPenaltyCorner: match.treesPerPenaltyCorner,
      treesPerFieldGoal: match.treesPerFieldGoal,
      treesPlanted: match.treesPlanted,
      notes: match.notes || '',
      locationLatitude: match.location?.latitude,
      locationLongitude: match.location?.longitude,
    });
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        matchId: form.matchId || `${form.homeTeamCode}-${form.awayTeamCode}-${form.matchDate}`,
        tournament: form.tournament,
        venue: form.venue,
        matchDate: new Date(form.matchDate),
        homeTeam: {
          name: form.homeTeamName,
          code: form.homeTeamCode,
          flagUrl: form.homeFlagUrl || undefined,
        },
        awayTeam: {
          name: form.awayTeamName,
          code: form.awayTeamCode,
          flagUrl: form.awayFlagUrl || undefined,
        },
        penaltyCorners: form.penaltyCorners,
        fieldGoals: form.fieldGoals,
        treesPerPenaltyCorner: form.treesPerPenaltyCorner,
        treesPerFieldGoal: form.treesPerFieldGoal,
        treesPlanted: form.treesPlanted,
        notes: form.notes || undefined,
        location:
          form.locationLatitude !== undefined && form.locationLongitude !== undefined
            ? {
              latitude: form.locationLatitude,
              longitude: form.locationLongitude,
              radiusMeters: 300,
            }
            : null,
      };

      const res = await fetch('/api/admin/hockey-india/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || 'Failed to save match');
      }

      setMatches((prev) => {
        const existingIndex = prev.findIndex((m) => m.matchId === json.data.matchId);
        if (existingIndex !== -1) {
          const updated = [...prev];
          updated[existingIndex] = json.data;
          return updated;
        }
        return [json.data, ...prev];
      });

      setFormOpen(false);
    } catch (err) {
      console.error(err);
      setError('Failed to save match');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (matchId: string) => {
    if (!confirm('Are you sure you want to delete this match? This cannot be undone.')) return;

    try {
      const res = await fetch(`/api/admin/hockey-india/matches?matchId=${matchId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Delete failed');

      setMatches((prev) => prev.filter((m) => m.matchId !== matchId));
    } catch (err) {
      console.error(err);
      setError('Failed to delete match');
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const computeEstimatedTrees = (m: HockeyMatch) =>
    m.penaltyCorners * m.treesPerPenaltyCorner + m.fieldGoals * m.treesPerFieldGoal;

  return (
    <div className="space-y-8 px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <span>Hockey India Matches</span>
            <SparklesIcon className="h-7 w-7 text-blue-500" />
          </h1>
          <p className="mt-2 text-gray-600">
            Manage per-match Penalty Corners, Field Goals, and trees planted for the Adoptrees ×
            Hockey India collaboration.
          </p>
        </div>
        <button
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Add Match
        </button>
      </div>

      {metrics && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-blue-50 p-4 border border-blue-100">
            <div className="text-xs font-semibold uppercase text-blue-600">Total Matches</div>
            <div className="mt-2 text-2xl font-bold text-blue-900">{metrics.totalMatches}</div>
          </div>
          <div className="rounded-2xl bg-green-50 p-4 border border-green-100">
            <div className="text-xs font-semibold uppercase text-green-700">Trees Planted</div>
            <div className="mt-2 text-2xl font-bold text-green-900">
              {metrics.totalTreesPlanted.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="rounded-2xl bg-amber-50 p-4 border border-amber-100">
            <div className="text-xs font-semibold uppercase text-amber-700">
              Trees Estimated (PC + Field Goals)
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-900">
              {metrics.totalTreesEstimated.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      )}

      {(error || uploadError) && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error || uploadError}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center text-gray-500 text-sm">
          Loading matches...
        </div>
      ) : matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 py-12 text-center">
          <p className="text-lg font-semibold text-gray-800 mb-2">No matches yet</p>
          <p className="text-gray-600 mb-4">Add the first match to start tracking impact.</p>
          <button
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Add Match
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {matches.map((match) => {
            const treesToShow =
              match.treesPlanted && match.treesPlanted > 0
                ? match.treesPlanted
                : computeEstimatedTrees(match);

            return (
              <motion.div
                key={match._id}
                whileHover={{ y: -4, scale: 1.01 }}
                className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <div className="text-xs font-semibold uppercase text-gray-500">
                      {match.tournament}
                    </div>
                    <div className="mt-1 text-sm text-gray-700">{match.venue}</div>
                    <div className="mt-1 text-xs text-gray-500">{formatDate(match.matchDate)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditForm(match)}
                      className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(match.matchId)}
                      className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="flex flex-1 items-center gap-3">
                    <div className="relative h-10 w-10 overflow-hidden rounded-full bg-gray-100 border border-gray-200">
                      {match.homeTeam.flagUrl ? (
                        <Image
                          src={match.homeTeam.flagUrl}
                          alt={match.homeTeam.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                          {match.homeTeam.code}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{match.homeTeam.name}</div>
                      <div className="text-xs text-gray-500">{match.homeTeam.code}</div>
                    </div>
                  </div>

                  <div className="text-xs font-semibold uppercase text-gray-400">vs</div>

                  <div className="flex flex-1 items-center justify-end gap-3">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">{match.awayTeam.name}</div>
                      <div className="text-xs text-gray-500">{match.awayTeam.code}</div>
                    </div>
                    <div className="relative h-10 w-10 overflow-hidden rounded-full bg-gray-100 border border-gray-200">
                      {match.awayTeam.flagUrl ? (
                        <Image
                          src={match.awayTeam.flagUrl}
                          alt={match.awayTeam.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                          {match.awayTeam.code}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                  <div className="rounded-xl bg-blue-50 p-3">
                    <div className="font-semibold text-blue-900">Penalty Corners</div>
                    <div className="mt-1 text-2xl font-bold text-blue-700">
                      {match.penaltyCorners}
                    </div>
                    <div className="mt-1 text-[11px] text-blue-700/80">
                      {match.treesPerPenaltyCorner} trees per PC
                    </div>
                  </div>
                  <div className="rounded-xl bg-indigo-50 p-3">
                    <div className="font-semibold text-indigo-900">Field Goals</div>
                    <div className="mt-1 text-2xl font-bold text-indigo-700">
                      {match.fieldGoals}
                    </div>
                    <div className="mt-1 text-[11px] text-indigo-700/80">
                      {match.treesPerFieldGoal} trees per goal
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase text-green-700">
                      Trees Planted
                    </div>
                    <div className="mt-1 text-xl font-extrabold text-green-800">
                      {treesToShow.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[11px] text-green-700/80">
                      {match.treesPlanted && match.treesPlanted > 0
                        ? `of ${computeEstimatedTrees(match).toLocaleString('en-IN')} estimated`
                        : 'Auto-calculated from PCs & goals'}
                    </div>
                  </div>
                  {match.notes && (
                    <div className="flex-1 rounded-lg bg-gray-50 px-3 py-2 text-[11px] text-gray-600">
                      {match.notes}
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editing ? 'Edit Match' : 'Add Match'}
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  Fill match details, then add Team 1 and Team 2 with their flags.
                </p>
              </div>
              <button
                onClick={() => setFormOpen(false)}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700">
                    Match ID (optional)
                  </label>
                  <input
                    name="matchId"
                    value={form.matchId}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. IND-AUS-2026-03-08"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700">Match Date</label>
                  <input
                    type="date"
                    name="matchDate"
                    value={form.matchDate}
                    onChange={handleChange}
                    required
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700">Tournament</label>
                  <input
                    name="tournament"
                    value={form.tournament}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700">Venue</label>
                  <input
                    name="venue"
                    value={form.venue}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-600">
                <span className="font-semibold">Scoring rules:</span>{' '}
                50 trees for every Penalty Corner 🏑 and 100 trees for every Field Goal 💯.
              </div>

              <div className="grid gap-4 md:grid-cols-2 border-t border-gray-100 pt-4 mt-3">
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-semibold text-gray-700 uppercase">
                        Team 1
                      </div>
                      <div className="text-[11px] text-gray-500">Home team</div>
                    </div>
                  </div>
                  <div className="mb-2 flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
                    <div className="relative h-10 w-10 overflow-hidden rounded-full bg-gray-100 border border-gray-200">
                      {form.homeFlagUrl ? (
                        <Image
                          src={form.homeFlagUrl}
                          alt={form.homeTeamName || 'Team 1'}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[11px] text-gray-400">
                          {form.homeTeamCode || 'T1'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-gray-700">
                        Team logo
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFlagUpload('home', e.target.files?.[0] || null)}
                        className="mt-1 block w-full text-[11px] text-gray-600 file:mr-2 file:rounded-full file:border-0 file:bg-blue-50 file:px-2 file:py-1 file:text-[11px] file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <input
                      name="homeTeamName"
                      value={form.homeTeamName}
                      onChange={handleChange}
                      required
                      placeholder="Team name"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      name="homeTeamCode"
                      value={form.homeTeamCode}
                      onChange={handleChange}
                      required
                      placeholder="Code (e.g. IND)"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      name="homeFlagUrl"
                      value={form.homeFlagUrl}
                      onChange={handleChange}
                      placeholder="Flag image URL (optional)"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-semibold text-gray-700 uppercase">
                        Team 2
                      </div>
                      <div className="text-[11px] text-gray-500">Away team</div>
                    </div>
                  </div>
                  <div className="mb-2 flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
                    <div className="relative h-10 w-10 overflow-hidden rounded-full bg-gray-100 border border-gray-200">
                      {form.awayFlagUrl ? (
                        <Image
                          src={form.awayFlagUrl}
                          alt={form.awayTeamName || 'Team 2'}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[11px] text-gray-400">
                          {form.awayTeamCode || 'T2'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-gray-700">
                        Team logo
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFlagUpload('away', e.target.files?.[0] || null)}
                        className="mt-1 block w-full text-[11px] text-gray-600 file:mr-2 file:rounded-full file:border-0 file:bg-blue-50 file:px-2 file:py-1 file:text-[11px] file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <input
                      name="awayTeamName"
                      value={form.awayTeamName}
                      onChange={handleChange}
                      required
                      placeholder="Team name"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      name="awayTeamCode"
                      value={form.awayTeamCode}
                      onChange={handleChange}
                      required
                      placeholder="Code (e.g. AUS)"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      name="awayFlagUrl"
                      value={form.awayFlagUrl}
                      onChange={handleChange}
                      placeholder="Flag image URL (optional)"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3 border-t border-gray-100 pt-4 mt-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700">
                    Penalty Corners
                  </label>
                  <input
                    type="number"
                    name="penaltyCorners"
                    min={0}
                    value={form.penaltyCorners}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700">Field Goals</label>
                  <input
                    type="number"
                    name="fieldGoals"
                    min={0}
                    value={form.fieldGoals}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700">
                    Trees Planted (actual)
                  </label>
                  <input
                    type="number"
                    name="treesPlanted"
                    min={0}
                    value={form.treesPlanted}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Planting location selector */}
              <div className="mt-4 border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700">
                      Planting Location (optional)
                    </label>
                    <p className="mt-1 text-[11px] text-gray-500">
                      Choose where trees for this match are planted. This will power the public
                      &ldquo;View location&rdquo; button on the Hockey India page.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLocationPickerOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-green-500 px-3 py-1.5 text-[11px] font-semibold text-green-700 hover:bg-green-50"
                  >
                    <MapPinIcon className="h-4 w-4" />
                    {form.locationLatitude && form.locationLongitude ? 'Edit Location' : 'Set Location'}
                  </button>
                </div>

                {form.locationLatitude !== undefined &&
                  form.locationLongitude !== undefined && (
                    <div className="mt-2 inline-flex items-center gap-3 rounded-lg bg-green-50 px-3 py-2 border border-green-200 text-[11px] text-green-800">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-white text-xs font-bold">
                        📍
                      </span>
                      <div>
                        <div className="flex items-center justify-between gap-4">
                          <div className="font-semibold">
                            Location selected for this match&apos;s trees
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setForm((prev) => ({
                                ...prev,
                                locationLatitude: undefined,
                                locationLongitude: undefined,
                              }));
                            }}
                            className="text-[10px] font-bold text-red-600 hover:text-red-700 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="font-mono text-[10px] mt-0.5">
                          Lat: {form.locationLatitude.toFixed(5)}, Lng:{' '}
                          {form.locationLongitude.toFixed(5)}
                        </div>
                      </div>
                    </div>
                  )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700">
                    Trees per Penalty Corner
                  </label>
                  <input
                    type="number"
                    name="treesPerPenaltyCorner"
                    min={0}
                    value={form.treesPerPenaltyCorner}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700">
                    Trees per Field Goal
                  </label>
                  <input
                    type="number"
                    name="treesPerFieldGoal"
                    min={0}
                    value={form.treesPerFieldGoal}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">Notes</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Optional context about this match or planting"
                />
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-2">
                <div className="text-xs text-gray-500">
                  Estimated trees:{' '}
                  <span className="font-semibold text-gray-800">
                    {(
                      form.penaltyCorners * form.treesPerPenaltyCorner +
                      form.fieldGoals * form.treesPerFieldGoal
                    ).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFormOpen(false)}
                    className="rounded-full border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-lg hover:bg-blue-700 disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : 'Save Match'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Location picker modal (shared Google Maps selector) */}
      <LocationPicker
        isOpen={locationPickerOpen}
        onClose={() => setLocationPickerOpen(false)}
        onSelect={(lat, lng) =>
          setForm((prev) => ({
            ...prev,
            locationLatitude: lat,
            locationLongitude: lng,
          }))
        }
        initialLatitude={form.locationLatitude}
        initialLongitude={form.locationLongitude}
      />
    </div>
  );
}

