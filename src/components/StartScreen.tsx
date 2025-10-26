import React, { useState, useEffect } from 'react';
import { Button, Card } from 'react-bootstrap';
import { supabase } from '../supabaseClient';
import './QuizScreen.css';

interface Props {
  onStart: (size: number, isOfficialTest?: boolean) => void;
  userEmail: string;
}

const StartScreen: React.FC<Props> = ({ onStart, userEmail }) => {
  const [officialTestAttempted, setOfficialTestAttempted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkOfficialTestStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('rezultati_kviza')
          .select('zvanican_test')
          .eq('user_email', userEmail)
          .eq('zvanican_test', true)
          .limit(1);

        if (error) {
          console.error('Error checking official test status:', error);
        } else if (data && data.length > 0) {
          setOfficialTestAttempted(true);
        }
      } catch (error) {
        console.error('Error checking official test status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkOfficialTestStatus();
  }, [userEmail]);

  const handleOfficialTest = async () => {
    setOfficialTestAttempted(true);
    onStart(60, true); // 60 questions, official test
  };

  if (loading) {
    return (
      <div className="text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Card.Title className="mb-3 text-primary">Pravila Kviza</Card.Title>
          <p className="text-muted mb-3">Podaci su spremni. Učitano 163 ptica iz 22 grupa.</p>
          
          <div className="text-start mb-4">
            <ul className="list-unstyled">
              <li className="mb-2">• Vremenski limit po pitanju: 30 sekundi</li>
              <li className="mb-2">• Tačan odgovor: +1 poen</li>
              <li className="mb-2">• Netačan odgovor: -1 poen</li>
              <li className="mb-2">• "Ne znam": 0 poena</li>
            </ul>
          </div>
          
          <div className="d-flex gap-3 justify-content-center flex-wrap">
            <Button 
              variant="success" 
              size="lg" 
              onClick={() => onStart(10)}
              className="rounded-3 px-4 py-2"
            >
              10 Pitanja
            </Button>
            <Button 
              variant="success" 
              size="lg" 
              onClick={() => onStart(30)}
              className="rounded-3 px-4 py-2"
            >
              30 Pitanja
            </Button>
            <Button 
              variant="success" 
              size="lg" 
              onClick={() => onStart(60)}
              className="rounded-3 px-4 py-2"
            >
              60 Pitanja
            </Button>
            <Button 
              variant={officialTestAttempted ? "secondary" : "warning"}
              size="lg" 
              onClick={handleOfficialTest}
              disabled={officialTestAttempted}
              className="rounded-3 px-4 py-2"
            >
              {officialTestAttempted ? "Zvanični test završen" : "Zvanični test"}
            </Button>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default StartScreen;
