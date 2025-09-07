const formatHM = (seconds) => `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;

const StatItem = ({ label, value }) => (
  <div className="flex flex-col items-center">
    <div className="text-lg font-semibold">{value}</div>
    <div className="text-xs text-base-content/60">{label}</div>
  </div>
);

const SoloStats = ({ stats }) => {
  return (
    <div className="w-full flex items-center justify-center gap-8 text-center">
      <div className="flex flex-col items-center">
        <div className="text-lg font-semibold text-primary">{formatHM(stats?.totalFocusSeconds ?? 0)}</div>
        <div className="text-xs text-primary/80 font-medium">Total Focus Time</div>
      </div>
      <StatItem label="Completed Today" value={stats?.todayCompletedCount ?? 0} />
      <StatItem label="Completed This Week" value={stats?.weekCompletedCount ?? 0} />
      <StatItem label="Completed This Month" value={stats?.monthCompletedCount ?? 0} />
    </div>
  );
};

export default SoloStats;



