import React, { useEffect, useMemo } from 'react';
import { QuizAttempt } from '../types';
import { Card, Button, ListGroup, Badge } from 'react-bootstrap';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import './QuizScreen.css';

interface Props {
  attempts: QuizAttempt[];
  onRestart: () => void;
}

const ResultsScreen: React.FC<Props> = ({ attempts, onRestart }) => {
  const { user } = useAuth();
  const isOfficialTest = localStorage.getItem('isOfficialTest') === 'true';
  
  const totalScore = useMemo(() => {
    return attempts.reduce((acc, attempt) => acc + attempt.points, 0);
  }, [attempts]);

  useEffect(() => {
    const saveResult = async () => {
      if (!user?.email) {
        console.error('Korisnik nije prijavljen');
        return;
      }

      const resultToSave = {
        broj_pitanja: attempts.length,
        poeni: totalScore,
        user_email: user.email,
        zvanican_test: isOfficialTest,
        rezultat: { // Storing detailed results in a JSONB field
          attempts: attempts.map(a => ({
            question: a.question.correctBird.naziv_srpskom,
            userAnswer: a.userAnswer,
            correctAnswer: a.question.correctBird.naziv_srpskom,
            points: a.points
          }))
        }
      };

      const { error } = await supabase.from('rezultati_kviza').insert([resultToSave]);

      if (error) {
        console.error('Greška pri čuvanju rezultata:', error);
        // Optionally, show an alert to the user
      }
    };

    if (attempts.length > 0) {
      saveResult();
    }
  }, [attempts, totalScore, user, isOfficialTest]);

  return (
    <Card className="shadow-sm">
      <Card.Body className="text-center">
        <Card.Title className="mb-4">
          {isOfficialTest ? "Zvanični test je završen!" : "Kviz je završen!"}
        </Card.Title>
        <h2 className="mb-4">Vaš rezultat: {totalScore} poena</h2>
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
            Igraj ponovo
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default ResultsScreen;
