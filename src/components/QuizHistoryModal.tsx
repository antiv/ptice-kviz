import React, { useState, useEffect } from 'react';
import { Modal, Table, Badge, Spinner, Alert } from 'react-bootstrap';
import { supabase } from '../supabaseClient';

interface QuizResult {
  id: number;
  broj_pitanja: number;
  poeni: number;
  zvanican_test: boolean;
  created_at: string;
  rezultat: {
    attempts: Array<{
      question: string;
      userAnswer: string;
      correctAnswer: string;
      points: number;
    }>;
  };
}

interface Props {
  show: boolean;
  onHide: () => void;
  userEmail: string;
}

const QuizHistoryModal: React.FC<Props> = ({ show, onHide, userEmail }) => {
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    if (show && userEmail) {
      fetchQuizHistory();
    }
  }, [show, userEmail]);

  const fetchQuizHistory = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('rezultati_kviza')
        .select('*')
        .eq('user_email', userEmail)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setResults(data || []);
    } catch (err) {
      console.error('Error fetching quiz history:', err);
      setError('Greška pri učitavanju istorije kvizova');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('sr-RS', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateSuccessRate = (result: QuizResult) => {
    // Ako su poeni negativni, uspešnost je 0%
    if (result.poeni < 0) {
      return 0;
    }
    // Uspešnost je % od broja pitanja (maksimalno mogući broj poena)
    return Math.round((result.poeni / result.broj_pitanja) * 100);
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered className={selectedResult ? 'quiz-history-modal-dimmed' : ''}>
      <Modal.Header closeButton>
        <Modal.Title>Istorija kvizova</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Učitavanje...</span>
            </Spinner>
          </div>
        ) : error ? (
          <Alert variant="danger">{error}</Alert>
        ) : results.length === 0 ? (
          <Alert variant="info">Nema sačuvanih rezultata kvizova.</Alert>
        ) : (
          <div className="table-responsive">
            <Table striped hover>
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Broj pitanja</th>
                  <th>Poeni</th>
                  <th>Uspešnost</th>
                  <th>Tip testa</th>
                  <th>Akcije</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.id}>
                    <td>{formatDate(result.created_at)}</td>
                    <td>{result.broj_pitanja}</td>
                    <td>
                      <Badge bg={result.poeni >= result.broj_pitanja * 0.7 ? 'success' : result.poeni >= result.broj_pitanja * 0.5 ? 'warning' : 'danger'}>
                        {result.poeni}
                      </Badge>
                    </td>
                    <td>{calculateSuccessRate(result)}%</td>
                    <td>
                      <Badge bg={result.zvanican_test ? 'primary' : 'secondary'}>
                        {result.zvanican_test ? 'Zvanični' : 'Obični'}
                      </Badge>
                    </td>
                    <td>
                      <button 
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => setSelectedResult(result)}
                      >
                        Detalji
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}

        {selectedResult && (
          <Modal show={!!selectedResult} onHide={() => setSelectedResult(null)} size="lg" centered backdrop="static">
            <Modal.Header closeButton>
              <Modal.Title>
                Detalji kviza - {formatDate(selectedResult.created_at)}
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <div className="mb-3">
                <strong>Ukupno pitanja:</strong> {selectedResult.broj_pitanja}<br/>
                <strong>Ukupno poena:</strong> {selectedResult.poeni}<br/>
                <strong>Uspešnost:</strong> {calculateSuccessRate(selectedResult)}%<br/>
                <strong>Tip testa:</strong> {selectedResult.zvanican_test ? 'Zvanični test' : 'Obični kviz'}
              </div>
              
              <div className="table-responsive">
                <Table size="sm">
                  <thead>
                    <tr>
                      <th>Pitanje</th>
                      <th>Vaš odgovor</th>
                      <th>Tačan odgovor</th>
                      <th>Poeni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedResult.rezultat.attempts.map((attempt, index) => (
                      <tr key={index}>
                        <td>{attempt.question}</td>
                        <td className={attempt.points > 0 ? 'text-success' : attempt.points < 0 ? 'text-danger' : 'text-warning'}>
                          {attempt.userAnswer || 'Nije odgovoreno'}
                        </td>
                        <td className="text-success">{attempt.correctAnswer}</td>
                        <td>
                          <Badge bg={attempt.points > 0 ? 'success' : attempt.points < 0 ? 'danger' : 'secondary'}>
                            {attempt.points}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Modal.Body>
          </Modal>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default QuizHistoryModal;
