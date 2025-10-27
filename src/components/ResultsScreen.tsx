import React from 'react';
import { QuizAttempt } from '../types';
import { Card, Button, ListGroup, Badge } from 'react-bootstrap';
import './QuizScreen.css';

interface Props {
  attempts: QuizAttempt[];
  onRestart: () => void;
}

const ResultsScreen: React.FC<Props> = ({ attempts, onRestart }) => {
  const isOfficialTest = localStorage.getItem('isOfficialTest') === 'true';
  
  const totalScore = attempts.reduce((acc, attempt) => acc + attempt.points, 0);
  const successRate = Math.max(0, Math.round((totalScore / attempts.length) * 100));
  const isSuccessful = successRate >= 40;

  return (
    <Card className="shadow-sm">
      <Card.Body className="text-center">
        {/* Celebration Animation */}
        <div className="mb-4">
          {isSuccessful ? (
            <div className="celebration-animation">
              <div className="trophy-container">
                <div className="trophy">🏆</div>
                <div className="confetti">
                  <div className="confetti-piece"></div>
                  <div className="confetti-piece"></div>
                  <div className="confetti-piece"></div>
                  <div className="confetti-piece"></div>
                  <div className="confetti-piece"></div>
                </div>
              </div>
              <h3 className="text-success mb-2">Bravo! 🎉</h3>
              <p className="text-muted">Odličan rezultat!</p>
            </div>
          ) : (
            <div className="encouragement-animation">
              <div className="sad-face">😔</div>
              <h3 className="text-warning mb-2">Nije loše!</h3>
              <p className="text-muted">Probajte ponovo, sigurno ćete biti bolji!</p>
            </div>
          )}
        </div>

        <h2 className="mb-4">Vaš rezultat: {totalScore} poena ({successRate}%)</h2>
        {isOfficialTest && (
          <div className="alert alert-info mb-4">
            <strong>Zvanični test:</strong> Ovaj rezultat je sažet u zvaničnim rezultatima.
          </div>
        )}
        
        <ListGroup className="mb-4">
          {attempts.map((attempt, index) => (
            <ListGroup.Item 
              key={index} 
              className={`d-flex justify-content-between align-items-center mb-2 rounded-3 ${
                attempt.points > 0 ? 'border-success border-3 bg-light-success' : 
                attempt.points < 0 ? 'border-danger border-3 bg-light-danger' : 
                'border-secondary border-3 bg-light-secondary'
              }`}
            >
              <div className="text-start">
                <div><strong>Pitanje #{index + 1}:</strong> {attempt.question.correctBird.naziv_srpskom}</div>
                <small>
                  Vaš odgovor: {
                    attempt.userAnswer ? (
                      <span className={attempt.isCorrect ? 'text-success fw-bold' : 'text-danger fw-bold'}> {attempt.userAnswer}</span>
                    ) : (
                      <span className="text-warning fw-bold">Niste odgovorili (isteklo vreme)</span>
                    )
                  }
                  { !attempt.isCorrect && attempt.userAnswer &&
                    <><br/><small className="text-success">Tačan odgovor: {attempt.question.correctBird.naziv_srpskom}</small></>
                  }
                </small>
              </div>
              <Badge bg={attempt.points > 0 ? 'success' : attempt.points < 0 ? 'danger' : 'secondary'} pill>
                {attempt.points} p
              </Badge>
            </ListGroup.Item>
          ))}
        </ListGroup>

        <div className="d-grid">
          <Button 
            variant="primary" 
            size="lg" 
            onClick={onRestart} 
            className="rounded-3 py-3"
          >
            Pokreni ponovo
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default ResultsScreen;
