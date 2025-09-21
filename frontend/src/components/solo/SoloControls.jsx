import { Play, Pause, Square, SkipForward } from "lucide-react";

const SoloControls = ({ running, hasStarted = false, isStrictMode = false, onToggleRunning, onStop, onSkip, showSkip, colorToken = "primary", disableStart = false, disablePause = false }) => {
  return (
    <div className="flex flex-wrap items-center gap-3 justify-center w-full">
      {!hasStarted ? (
        <button
          onClick={onToggleRunning}
          disabled={disableStart}
          className={`btn btn-${colorToken} gap-2 active:scale-[0.98] transition-transform duration-150 btn-sm md:btn-md ${disableStart ? "btn-disabled" : ""}`}
        >
          <Play className="w-4 h-4" /> Start
        </button>
      ) : (
        <>
          {/* In strict mode, only show pause/resume button if not currently running or if not in strict mode */}
          {/* Also hide pause/resume button if disablePause is true */}
          {(!isStrictMode || !running) && !disablePause && (
            <button
              onClick={onToggleRunning}
              className={`btn btn-${colorToken} gap-2 active:scale-[0.98] transition-transform duration-150 btn-sm md:btn-md`}
            >
              {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {running ? "Pause" : "Resume"}
            </button>
          )}
          <button onClick={onStop} className={`btn btn-ghost gap-2 btn-sm md:btn-md text-${colorToken}`}>
            <Square className="w-4 h-4" /> Stop
          </button>
        </>
      )}
      {showSkip && (
        <button onClick={onSkip} className={`btn btn-ghost gap-2 btn-sm md:btn-md text-${colorToken}`}>
          <SkipForward className="w-4 h-4" /> Skip
        </button>
      )}
    </div>
  );
};

export default SoloControls;


