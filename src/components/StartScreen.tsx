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
  const [officialTestActive, setOfficialTestActive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkOfficialTestStatus = async () => {
      try {
        // Proverava da li je korisnik već radio zvanični test
        const { data: userData, error: userError } = await supabase
          .from('rezultati_kviza')
          .select('zvanican_test')
          .eq('user_email', userEmail)
          .eq('zvanican_test', true)
          .limit(1);

        if (userError) {
          console.error('Error checking official test status:', userError);
        } else if (userData && userData.length > 0) {
          setOfficialTestAttempted(true);
        }

        // Proverava da li je zvanični test aktivan
        const { data: settingsData, error: settingsError } = await supabase
          .from('app_settings')
          .select('setting_value')
          .eq('setting_key', 'official_test_active')
          .single();

        if (settingsError) {
          console.error('Error checking official test settings:', settingsError);
        } else if (settingsData) {
          const settings = settingsData.setting_value;
          const now = new Date();
          const startDate = settings.start_date ? new Date(settings.start_date) : null;
          const endDate = settings.end_date ? new Date(settings.end_date) : null;
          
          // Test je aktivan ako je eksplicitno aktiviran ili ako su datumi postavljeni i trenutno je u datumu
          const isActive = settings.active || 
            ((startDate || endDate) && 
             (!startDate || now >= startDate) && 
             (!endDate || now <= endDate));
          
          setOfficialTestActive(isActive);
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
          <Card.Title className="mb-3 text-primary">Pravila kviza</Card.Title>
          
          <div className="text-start mb-4">
            <ul className="list-unstyled">
              <li className="mb-2">• Vremenski limit po pitanju: 30 sekundi</li>
              <li className="mb-2">• Tačan odgovor: +1 poen</li>
              <li className="mb-2">• Netačan odgovor: -1 poen</li>
              <li className="mb-2">• "Ne znam": 0 poena</li>
            </ul>
          </div>
          
          <h5 className="mb-3">Srećno!</h5>
          
          <div className="row g-3">
            <div className="col-6 col-lg-3">
              <Button 
                variant="success" 
                size="lg" 
                onClick={() => onStart(10)}
                className="rounded-3 w-100 py-2"
              >
                10 Pitanja
              </Button>
            </div>
            <div className="col-6 col-lg-3">
              <Button 
                variant="success" 
                size="lg" 
                onClick={() => onStart(30)}
                className="rounded-3 w-100 py-2"
              >
                30 Pitanja
              </Button>
            </div>
            <div className="col-6 col-lg-3">
              <Button 
                variant="success" 
                size="lg" 
                onClick={() => onStart(60)}
                className="rounded-3 w-100 py-2"
              >
                60 Pitanja
              </Button>
            </div>
            <div className="col-6 col-lg-3">
              <Button 
                variant={!officialTestActive ? "secondary" : officialTestAttempted ? "secondary" : "danger"}
                size="lg" 
                onClick={handleOfficialTest}
                disabled={!officialTestActive || officialTestAttempted}
                className="rounded-3 w-100 py-2"
              >
                {officialTestAttempted ? "Zvanični test završen" : "Zvanični test"}
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default StartScreen;
