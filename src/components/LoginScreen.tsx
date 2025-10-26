import React from 'react';
import { Card, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import './LoginScreen.css';

const LoginScreen: React.FC = () => {
  const { signInWithGoogle, loading } = useAuth();

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Greška pri prijavljivanju:', error);
    }
  };

  return (
    <Card className="shadow-sm">
      <Card.Body className="text-center">
        <Card.Title className="mb-4">Dobrodošli u Kviz o Pticama</Card.Title>
        <Card.Text className="mb-4">
          Da biste mogli da igrate kviz, potrebno je da se prijavite sa Google nalogom.
        </Card.Text>
        
        <div className="d-grid">
          <Button 
            variant="primary" 
            size="lg" 
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="rounded-3 py-3 d-flex align-items-center justify-content-center gap-2"
          >
            {loading ? (
              <>
                <div className="spinner-border spinner-border-sm" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                Prijavljivanje...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Prijavite se sa Google
              </>
            )}
          </Button>
        </div>
        
        <Alert variant="info" className="mt-4">
          <small>
            Vaši rezultati će biti sačuvani sa vašom email adresom kako biste mogli da pratite svoj napredak.
          </small>
        </Alert>
      </Card.Body>
    </Card>
  );
};

export default LoginScreen;
