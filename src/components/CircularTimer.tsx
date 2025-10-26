import React from 'react';
import './CircularTimer.css';

interface Props {
  time: number;
  duration: number;
}

const CircularTimer: React.FC<Props> = ({ time, duration }) => {
  const radius = 18; // Smaller radius to fit in 50px container
  const circumference = 2 * Math.PI * radius;
  const progress = time / duration;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="timer-wrapper">
      <svg className="timer-svg">
        <circle
          className="timer-circle timer-background"
          cx="50%" cy="50%"
          r={radius}
        />
        <circle
          className="timer-circle timer-progress"
          cx="50%" cy="50%"
          r={radius}
          style={{ strokeDashoffset }}
          strokeDasharray={circumference}
        />
      </svg>
      <div className="timer-text">{time}</div>
    </div>
  );
};

export default CircularTimer;
