import { useState, useEffect } from "react";
import { fetchStats } from "../lib/sessionsApi";

const ProgressCard = ({ colorToken = "primary" }) => {
  const [stats, setStats] = useState(null);

  const loadStats = async () => {
    try {
      const fetchedStats = await fetchStats();
      setStats(fetchedStats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="bg-base-100 rounded-xl p-6 shadow-sm border border-base-300">
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-8 h-8 bg-${colorToken} rounded-lg flex items-center justify-center`}>
          <span className="text-primary-content font-bold">⚡</span>
        </div>
        <h3 className="text-3xl font-semibold text-base-content font-fredoka">Your Progress</h3>
      </div>
      
      {/* Today's Date and Time */}
      <div className="mb-4 text-center">
        <div className="text-lg font-semibold text-base-content">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
        <div className="text-base font-medium text-base-content/70 mt-1">
          {new Date().toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          })}
        </div>
      </div>
      
      {/* Today's Progress - Primary Metrics */}
      <div className="text-center mb-4">
        <div className={`text-5xl font-bold text-${colorToken} font-fredoka`}>
          {stats ? formatTime(stats.todayFocusSeconds) : "0m"}
        </div>
        <div className="text-sm text-base-content/60 mb-2">Focus Time Today</div>
        
        <div className={`text-3xl font-bold text-${colorToken} font-fredoka`}>
          {stats ? stats.todayCompletedCount : 0}
        </div>
        <div className="text-sm text-base-content/60">Completed Sessions</div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-base-content/70">This Week</span>
          <div className="text-right">
            <div className="text-base-content font-medium">{stats ? formatTime(stats.weekFocusSeconds) : "0m"}</div>
            <div className="text-xs text-base-content/60">{stats ? stats.weekCompletedCount : 0} sessions</div>
          </div>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-base-content/70">This Month</span>
          <div className="text-right">
            <div className="text-base-content font-medium">{stats ? formatTime(stats.monthFocusSeconds) : "0m"}</div>
            <div className="text-xs text-base-content/60">{stats ? stats.monthCompletedCount : 0} sessions</div>
          </div>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-base-content/70">This Year</span>
          <div className="text-right">
            <div className="text-base-content font-medium">{stats ? formatTime(stats.yearFocusSeconds) : "0m"}</div>
            <div className="text-xs text-base-content/60">{stats ? stats.yearCompletedCount : 0} sessions</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressCard;
