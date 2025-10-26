import React, { useState } from 'react';
import './App.css';
import StartScreen from './components/StartScreen';
import QuizScreen from './components/QuizScreen';
import ResultsScreen from './components/ResultsScreen';
import LoginScreen from './components/LoginScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { QuizAttempt } from './types';
import { Dropdown } from 'react-bootstrap';

type GameState = 'start' | 'quiz' | 'results';

const AppContent: React.FC = () => {
  const { user, loading, signOut } = useAuth();
  const [gameState, setGameState] = useState<GameState>('start');
  const [quizSize, setQuizSize] = useState<number>(0);
  const [lastQuizAttempts, setLastQuizAttempts] = useState<QuizAttempt[]>([]);

  const startQuiz = (size: number, isOfficialTest?: boolean) => {
    setQuizSize(size);
    setGameState('quiz');
    // Store official test flag for later use in results
    if (isOfficialTest) {
      localStorage.setItem('isOfficialTest', 'true');
    } else {
      localStorage.removeItem('isOfficialTest');
    }
  };

  const showResults = (attempts: QuizAttempt[]) => {
    setLastQuizAttempts(attempts);
    setGameState('results');
  };

  const restartQuiz = () => {
    setGameState('start');
    setQuizSize(0);
    setLastQuizAttempts([]);
    localStorage.removeItem('isOfficialTest');
  };

  if (loading) {
    return (
      <div className="App container py-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="App container py-4">
        <h2 className="mb-4 text-primary text-break">Ptice Srbije - Oglašavanje</h2>
        <LoginScreen />
      </div>
    );
  }

  return (
    <div className="App container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0 text-primary text-break">Ptice Srbije - Oglašavanje</h2>
        <div className="d-flex align-items-center gap-3">
          <Dropdown>
            <Dropdown.Toggle 
              variant="outline-secondary" 
              className="d-flex align-items-center justify-content-center bg-white border-0 p-0 rounded-circle overflow-hidden"
              style={{ width: '40px', height: '40px' }}
              bsPrefix="btn"
            >
              {user.user_metadata?.avatar_url ? (
                <img 
                  src={user.user_metadata.avatar_url} 
                  alt="User avatar" 
                  className="w-100 h-100 object-fit-cover"
                  onError={(e) => {
                    // Fallback to initial if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const fallback = document.createElement('span');
                      fallback.className = 'fw-bold text-success';
                      fallback.textContent = user.email?.charAt(0).toUpperCase() || 'U';
                      parent.appendChild(fallback);
                    }
                  }}
                />
              ) : (
                <span className="fw-bold text-success">
                  {user.email?.charAt(0).toUpperCase()}
                </span>
              )}
            </Dropdown.Toggle>
            <Dropdown.Menu align="end">
              <Dropdown.ItemText className="text-muted small">
                {user.email}
              </Dropdown.ItemText>
              <Dropdown.Divider />
              <Dropdown.Item onClick={signOut} className="text-danger">
                Odjavi se
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </div>
      {gameState === 'start' && <StartScreen onStart={startQuiz} userEmail={user.email || ''} />}
      {gameState === 'quiz' && <QuizScreen quizSize={quizSize} onFinish={showResults} />}
      {gameState === 'results' && <ResultsScreen attempts={lastQuizAttempts} onRestart={restartQuiz} />}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
