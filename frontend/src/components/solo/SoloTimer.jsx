const formatTime = (seconds) => {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m} : ${s}`;
};

const SoloTimer = ({ remainingSeconds, totalSeconds, colorToken, maxWidth = "w-full" }) => {
  const percentage = totalSeconds === 0 ? 0 : ((totalSeconds - remainingSeconds) / totalSeconds) * 100;
  return (
    <div className={maxWidth}>
      <div className="w-full h-2 rounded bg-base-200">
        <div
          className={`h-2 rounded bg-${colorToken} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-center mt-6">
        <div className={`text-6xl md:text-7xl font-bold text-${colorToken}`}>
          {formatTime(remainingSeconds)}
        </div>
      </div>
    </div>
  );
};

export default SoloTimer;


