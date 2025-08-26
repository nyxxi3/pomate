import { useState } from "react";
import { Target, Plus } from "lucide-react";

const GoalsCard = () => {
  const [goals, setGoals] = useState([
    {
      id: 1,
      text: "Complete 6 Pomodoros",
      description: "Focus sessions completed today",
      completed: false,
    },
    {
      id: 2,
      text: "Study for 3 hours",
      description: "Deep work time tracked",
      completed: false,
    },
    {
      id: 3,
      text: "Exercise 30 min",
      description: "Physical activity for the day",
      completed: false,
    },
    {
      id: 4,
      text: "Read 20 pages",
      description: "Learning material progress",
      completed: false,
    },
    {
      id: 5,
      text: "Review weekly goals",
      description: "Planning and reflection time",
      completed: false,
    },
  ]);

  const handleToggleGoal = (goalId) => {
    setGoals(goals.map(goal => 
      goal.id === goalId 
        ? { ...goal, completed: !goal.completed }
        : goal
    ));
  };

  const handleAddGoal = () => {
    // TODO: Implement add goal functionality
    console.log("Add goal clicked");
  };

  return (
    <div className="bg-base-100 rounded-xl p-6 shadow-sm border border-base-300 h-fit">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <Target className="w-5 h-5 text-primary-content" />
        </div>
        <h2 className="text-xl font-semibold">Today's Goals</h2>
      </div>

      <div className="space-y-3 mb-4">
        {goals.map((goal) => (
          <div key={goal.id} className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={goal.completed}
              onChange={() => handleToggleGoal(goal.id)}
              className="checkbox checkbox-sm mt-1"
            />
            <div className="flex-1 min-w-0">
              <div className={`font-medium ${goal.completed ? 'line-through text-base-content/50' : ''}`}>
                {goal.text}
              </div>
              <div className="text-sm text-base-content/60">
                {goal.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleAddGoal}
        className="btn btn-outline btn-primary w-full gap-2"
      >
        <Plus className="w-4 h-4" />
        Add Goal
      </button>
    </div>
  );
};

export default GoalsCard;

