import { useState } from "react";
import { Target, Flame } from "lucide-react";
import GoalsCard from "./GoalsCard";
import HabitTracker from "./HabitTracker";

const GoalsAndHabitsCard = ({ colorToken = "primary" }) => {
  const [activeTab, setActiveTab] = useState("goals");

  return (
    <div className="bg-base-100 rounded-xl p-6 shadow-sm border border-base-300 h-fit">
      {/* Header with Tabs */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-8 h-8 bg-${colorToken} rounded-lg flex items-center justify-center`}>
          <Target className="w-5 h-5 text-primary-content" />
        </div>
        <h2 className="text-3xl font-semibold text-base-content font-fredoka">Goals & Habits</h2>
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-base-200 rounded-lg p-1 mb-4">
        <button
          onClick={() => setActiveTab("goals")}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "goals"
              ? "bg-base-100 text-base-content shadow-sm"
              : "text-base-content/60 hover:text-base-content"
          }`}
        >
          <Target className="w-4 h-4" />
          Goals
        </button>
        <button
          onClick={() => setActiveTab("habits")}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "habits"
              ? "bg-base-100 text-base-content shadow-sm"
              : "text-base-content/60 hover:text-base-content"
          }`}
        >
          <Flame className="w-4 h-4" />
          Habits
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === "goals" ? (
          <div className="space-y-2 sm:space-y-3 mb-4">
            <GoalsCard colorToken={colorToken} />
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3 mb-4">
            <HabitTracker colorToken={colorToken} />
          </div>
        )}
      </div>
    </div>
  );
};

export default GoalsAndHabitsCard;
