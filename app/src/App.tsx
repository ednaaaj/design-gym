import { useState } from 'react';
import { exercises } from './exercises/registry.ts';
import Landing from './screens/Landing.tsx';
import PracticeArena from './screens/PracticeArena.tsx';
import { skillAccuracy } from './lib/stats.ts';
import { addAttempt, load } from './lib/storage.ts';

export default function App() {
  const [screen, setScreen] = useState<'landing' | 'arena'>('landing');
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState(load);
  const [visitedArena, setVisitedArena] = useState(false);

  if (screen === 'landing') {
    return (
      <Landing
        attempts={attempts}
        focusTitle={visitedArena}
        onStart={(i) => {
          setIndex(i);
          setScreen('arena');
          setVisitedArena(true);
        }}
      />
    );
  }

  const exercise = exercises[index];
  return (
    <PracticeArena
      key={exercise.id}
      exercise={exercise}
      index={index}
      total={exercises.length}
      onNext={() => setIndex((i) => (i + 1) % exercises.length)}
      onBack={() => setScreen('landing')}
      onComplete={(r) =>
        setAttempts(addAttempt({ exerciseId: exercise.id, skill: exercise.skill, ...r }))
      }
      skillStat={skillAccuracy(attempts)[exercise.skill]}
    />
  );
}
