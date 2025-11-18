import React, { useState, useEffect } from 'react';
import './App.css';
import StartScreen from './components/StartScreen';
import QuizScreen from './components/QuizScreen';
import ImageQuizScreen from './components/ImageQuizScreen';
import ResultsScreen from './components/ResultsScreen';
import LoginScreen from './components/LoginScreen';
import QuizHistoryModal from './components/QuizHistoryModal';
import AdminPanel from './components/AdminPanel';
import PreviewScreen from './components/PreviewScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { QuizAttempt, QuizType } from './types';
import { Dropdown, Button, Alert } from 'react-bootstrap';

type GameState = 'start' | 'quiz' | 'results' | 'admin' | 'preview';

const AppContent: React.FC = () => {
  const { user, loading, signOut, isAuthorized, unauthorizedMessage, isAdmin } = useAuth();
  const [gameState, setGameState] = useState<GameState>('start');
  const [quizSize, setQuizSize] = useState<number>(0);
  const [lastQuizAttempts, setLastQuizAttempts] = useState<QuizAttempt[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

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
    localStorage.removeItem('quizType');
  };

  const getQuizType = (): QuizType => {
    return (localStorage.getItem('quizType') as QuizType) || 'oglasavanje';
  };

  const getTitle = (): string => {
    if (gameState === 'admin' || gameState === 'preview') {
      return 'Ptice Srbije - Admin';
    }
    const quizType = getQuizType();
    return quizType === 'slike' ? 'Ptice Srbije - Izgled' : 'Ptice Srbije - Oglašavanje';
  };

  const getPageTitle = (): string => {
    // Na login strani i strani sa izborom testa uvek prikaži "Ptice Srbije - Testiranje"
    if (!user || gameState === 'start') {
      return 'Ptice Srbije - Testiranje';
    }
    // Na ostalim stranama koristi dinamički naslov
    return getTitle();
  };


  // Postavi naslov stranice
  useEffect(() => {
    if (!user || gameState === 'start') {
      document.title = 'Ptice Srbije - Testiranje';
    } else {
      document.title = getTitle();
    }
  }, [user, gameState]);

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
        <div className="d-flex align-items-center gap-3 mb-4">
          <img 
            src={`${process.env.PUBLIC_URL}/icon.png`} 
            alt="Ptice Srbije" 
            style={{ width: '40px', height: '40px' }}
            className="rounded-circle"
          />
          <h2 className="mb-0 text-success text-break">Ptice Srbije - Testiranje</h2>
        </div>
        {unauthorizedMessage && (
          <div className="alert alert-warning" role="alert">
            {unauthorizedMessage}
          </div>
        )}
        <LoginScreen />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="App container py-4">
        <div className="d-flex align-items-center gap-3 mb-4">
          <img 
            src={`${process.env.PUBLIC_URL}/icon.png`} 
            alt="Ptice Srbije" 
            style={{ width: '40px', height: '40px' }}
            className="rounded-circle"
          />
          <h2 className="mb-0 text-success text-break">Ptice Srbije - Testiranje</h2>
        </div>
        <Alert variant="danger">
          {unauthorizedMessage || 'Nemate pristup ovoj aplikaciji.'}
        </Alert>
        <div className="text-center mt-3">
          <Button variant="secondary" onClick={signOut}>
            Odjavi se i pokušaj ponovo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`App ${gameState === 'admin' || gameState === 'preview' ? 'container-fluid admin-view px-4' : 'container'} py-4`}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-3">
          <img 
            src={`${process.env.PUBLIC_URL}/icon.png`} 
            alt="Ptice Srbije" 
            style={{ width: '40px', height: '40px' }}
            className="rounded-circle"
          />
          <h2 className="mb-0 text-success text-break">{gameState === 'start' ? 'Ptice Srbije - Testiranje' : getTitle()}</h2>
        </div>
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
              <Dropdown.Item onClick={() => setShowHistoryModal(true)}>
                Istorija
              </Dropdown.Item>
              {isAdmin && (
                <>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={() => setGameState('admin')}>
                    Dashboard
                  </Dropdown.Item>
                </>
              )}
              <Dropdown.Divider />
              <Dropdown.Item onClick={signOut} className="text-danger">
                Odjavi se
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </div>
      {gameState === 'start' && <StartScreen onStart={startQuiz} userEmail={user.email || ''} isAdmin={isAdmin} />}
      {gameState === 'quiz' && (
        getQuizType() === 'slike' 
          ? <ImageQuizScreen quizSize={quizSize} onFinish={showResults} />
          : <QuizScreen quizSize={quizSize} onFinish={showResults} />
      )}
      {gameState === 'results' && <ResultsScreen attempts={lastQuizAttempts} onRestart={restartQuiz} />}
      {gameState === 'preview' && <PreviewScreen onBack={() => setGameState('admin')} />}
      {gameState === 'admin' && (
        <div className="row justify-content-center">
          <div className="col-12">
            <div className="mb-3 d-flex justify-content-between">
              <Button variant="outline-secondary" onClick={() => setGameState('start')}>
                ← Nazad na početnu
              </Button>
              <Button variant="outline-primary" onClick={() => setGameState('preview')}>
                Pregled Vrsta
              </Button>
            </div>
            <AdminPanel onNavigate={(page) => setGameState(page)} />
          </div>
        </div>
      )}
      
      <QuizHistoryModal 
        show={showHistoryModal} 
        onHide={() => setShowHistoryModal(false)} 
        userEmail={user.email || ''} 
      />
      
      <div className="text-center mt-4 mb-2">
        <small className="text-muted">
          Oglašavanja preuzeta sa <a href="https://xeno-canto.org/" target="_blank" rel="noopener noreferrer" className="text-decoration-none">xeno-canto.org</a>
        </small>
      </div>
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
