'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { SparklesIcon } from '@heroicons/react/24/solid';
import MatchLocationMap from './MatchLocationMap';

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
  metrics?: {
    totalMatches: number;
    totalTreesPlanted: number;
    totalTreesEstimated: number;
  };
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function computeEstimatedTrees(m: HockeyMatch) {
  return m.penaltyCorners * m.treesPerPenaltyCorner + m.fieldGoals * m.treesPerFieldGoal;
}

export default function MatchesSection({ totalTreesOverall }: { totalTreesOverall: number }) {
  const [matches, setMatches] = useState<HockeyMatch[]>([]);
  const [totalTreesPlanted, setTotalTreesPlanted] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openLocationMatchId, setOpenLocationMatchId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/hockey-india/matches', { cache: 'no-store' });
        const json: MatchesResponse = await res.json();
        if (!json.success) throw new Error('Failed to load matches');
        setMatches(json.data);
        // Use totalTreesPlanted from API metrics (calculated from all matches)
        if (json.metrics?.totalTreesPlanted !== undefined) {
          setTotalTreesPlanted(json.metrics.totalTreesPlanted);
        }
      } catch (err) {
        console.error(err);
        setError('Unable to load match impact right now.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Use totalTreesPlanted from API if available, otherwise fallback to totalTreesOverall
  const totalTreesFromMatches = totalTreesPlanted !== null ? totalTreesPlanted : totalTreesOverall;

  return (
    <section className="py-16 sm:py-20 md:py-24 bg-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 -left-10 h-64 w-64 rounded-full bg-blue-500/30 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-emerald-500/30 blur-3xl" />
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
          />
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center mb-12 sm:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-200"
          >
            <SparklesIcon className="h-4 w-4 text-emerald-300" />
            Live Match Impact
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mt-4 text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight"
          >
            Every Match Leaves a Forest Behind
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-4 text-base sm:text-lg text-slate-200/80 max-w-2xl mx-auto"
          >
            Track how Penalty Corners and Field Goals from each Hockey India match are turning into
            real trees on the ground.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mb-10 sm:mb-12"
        >
          <div className="mx-auto max-w-xl rounded-2xl border border-emerald-700 bg-emerald-900/30 p-5 sm:p-6 text-center">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-200">
              Total Trees Planted (Hockey India)
            </div>
            <div className="mt-3 text-3xl sm:text-4xl font-extrabold text-emerald-100">
              {totalTreesFromMatches.toLocaleString('en-IN')}
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-300">
            Loading match impact...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/40 bg-red-900/30 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : matches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-6 py-10 text-center">
            <p className="text-base sm:text-lg font-semibold text-white mb-2">Coming soon</p>
            <p className="text-slate-300 text-sm sm:text-base max-w-md mx-auto">
              As the tournament kicks off, you&apos;ll see each match and the trees it helped plant
              right here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-7 px-4 sm:px-0">
            {matches.map((match, index) => {
              const treesToShow =
                match.treesPlanted && match.treesPlanted > 0
                  ? match.treesPlanted
                  : computeEstimatedTrees(match);

              return (
              <motion.article
                key={match._id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: index * 0.03 }}
                className="relative overflow-hidden rounded-3xl border border-slate-700/70 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-900/50 p-5 sm:p-6 shadow-lg"
              >
                <div className="absolute inset-0 opacity-40 pointer-events-none">
                  <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-500/20 blur-2xl" />
                  <div className="absolute left-0 bottom-0 h-20 w-20 rounded-full bg-blue-500/10 blur-2xl" />
                </div>

                <div className="relative z-10 flex items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {match.tournament}
                    </div>
                    <div className="mt-1 text-xs text-slate-300">{match.venue}</div>
                    <div className="mt-1 text-[11px] text-slate-400">{formatDate(match.matchDate)}</div>
                  </div>
                </div>

                <div className="relative z-10 mb-4 flex items-center justify-between gap-3">
                  <div className="flex flex-1 items-center gap-3">
                    <div className="relative h-10 w-10 overflow-hidden rounded-full bg-slate-800/80 ring-2 ring-slate-600/80">
                      {match.homeTeam.flagUrl ? (
                        <Image
                          src={match.homeTeam.flagUrl}
                          alt={match.homeTeam.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[11px] text-slate-300">
                          {match.homeTeam.code}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{match.homeTeam.name}</div>
                      <div className="text-[11px] text-slate-300">{match.homeTeam.code}</div>
                    </div>
                  </div>
                  <div className="px-2 py-1 rounded-full border border-slate-700 bg-slate-900/80 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                    vs
                  </div>
                  <div className="flex flex-1 items-center justify-end gap-3">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-white">{match.awayTeam.name}</div>
                      <div className="text-[11px] text-slate-300">{match.awayTeam.code}</div>
                    </div>
                    <div className="relative h-10 w-10 overflow-hidden rounded-full bg-slate-800/80 ring-2 ring-slate-600/80">
                      {match.awayTeam.flagUrl ? (
                        <Image
                          src={match.awayTeam.flagUrl}
                          alt={match.awayTeam.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[11px] text-slate-300">
                          {match.awayTeam.code}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="relative z-10 grid grid-cols-2 gap-3 text-[11px] mb-4">
                  <div className="rounded-xl bg-slate-900/80 border border-blue-600/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-blue-100">Penalty Corners</span>
                      <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-100">
                        PC 🏑
                      </span>
                    </div>
                    <div className="mt-1 text-2xl font-black text-blue-100">
                      {match.penaltyCorners}
                    </div>
                    <div className="mt-1 text-[10px] text-blue-200/80">
                      {match.treesPerPenaltyCorner} trees per PC
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-900/80 border border-indigo-500/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-indigo-100">Field Goals</span>
                      <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] text-indigo-100">
                        Goal 🎯
                      </span>
                    </div>
                    <div className="mt-1 text-2xl font-black text-indigo-100">
                      {match.fieldGoals}
                    </div>
                    <div className="mt-1 text-[10px] text-indigo-200/80">
                      {match.treesPerFieldGoal} trees per goal
                    </div>
                  </div>
                </div>

                <div className="relative z-10 flex flex-col gap-2 rounded-xl bg-slate-900/80 border border-emerald-600/70 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
                        Trees Planted
                      </div>
                      <div className="mt-1 text-xl sm:text-2xl font-extrabold text-emerald-50">
                        {treesToShow.toLocaleString('en-IN')}
                      </div>
                    </div>
                    {match.location?.latitude !== undefined &&
                      match.location?.longitude !== undefined && (
                        <button
                          type="button"
                          onClick={() =>
                            setOpenLocationMatchId((current) =>
                              current === match._id ? null : match._id
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-semibold text-emerald-100 hover:bg-emerald-500/20"
                        >
                          <span className="text-xs">📍</span>
                          <span>
                            {openLocationMatchId === match._id ? 'Hide Location' : 'View Location'}
                          </span>
                        </button>
                      )}
                  </div>

                  {match.notes && (
                    <div className="rounded-lg bg-slate-900/80 px-3 py-2 text-[11px] text-slate-200">
                      {match.notes}
                    </div>
                  )}

                  {/* Location dropdown / map area */}
                  {openLocationMatchId === match._id &&
                    match.location?.latitude !== undefined &&
                    match.location?.longitude !== undefined && (
                      <div className="mt-2 rounded-xl border border-emerald-500/40 bg-slate-950/70 overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-emerald-500/30">
                          <div className="text-[11px] font-semibold text-emerald-100 truncate">
                            Trees planted for{' '}
                            <span className="text-emerald-300">
                              {match.homeTeam.name} vs {match.awayTeam.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setOpenLocationMatchId(null)}
                            className="text-[10px] text-emerald-200 hover:text-emerald-100"
                          >
                            Close
                          </button>
                        </div>
                        <MatchLocationMap
                          latitude={match.location.latitude}
                          longitude={match.location.longitude}
                          radiusMeters={match.location.radiusMeters}
                          matchLabel={`${match.homeTeam.name} vs ${match.awayTeam.name}`}
                          className="w-full h-44"
                        />
                      </div>
                    )}
                </div>
              </motion.article>
            )})}
          </div>
        )}
      </div>
    </section>
  );
}

