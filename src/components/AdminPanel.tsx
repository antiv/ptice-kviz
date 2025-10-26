import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Row, Col, Alert, Table } from 'react-bootstrap';
import { supabase } from '../supabaseClient';

interface OfficialTestSettings {
  active: boolean;
  start_date: string | null;
  end_date: string | null;
}

interface AllowedUser {
  id: number;
  email: string;
  created_at: string;
}

const AdminPanel: React.FC = () => {
  const [settings, setSettings] = useState<OfficialTestSettings>({
    active: false,
    start_date: null,
    end_date: null
  });
  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    loadSettings();
    loadAllowedUsers();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'official_test_active')
        .single();

      if (error) {
        console.error('Error loading settings:', error);
        setMessage({ type: 'error', text: 'Greška pri učitavanju podesavanja' });
      } else if (data) {
        setSettings(data.setting_value);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setMessage({ type: 'error', text: 'Greška pri učitavanju podesavanja' });
    } finally {
      setLoading(false);
    }
  };

  const loadAllowedUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('allowed_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading allowed users:', error);
        setMessage({ type: 'error', text: 'Greška pri učitavanju korisnika' });
      } else {
        setAllowedUsers(data || []);
      }
    } catch (error) {
      console.error('Error loading allowed users:', error);
      setMessage({ type: 'error', text: 'Greška pri učitavanju korisnika' });
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ 
          setting_value: settings,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'official_test_active');

      if (error) {
        console.error('Error saving settings:', error);
        setMessage({ type: 'error', text: 'Greška pri čuvanju podesavanja' });
      } else {
        setMessage({ type: 'success', text: 'Podesavanja su uspešno sačuvana' });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Greška pri čuvanju podesavanja' });
    } finally {
      setSaving(false);
    }
  };

  const addAllowedUser = async () => {
    if (!newEmail.trim()) {
      setMessage({ type: 'error', text: 'Unesite email adresu' });
      return;
    }

    if (!newEmail.includes('@')) {
      setMessage({ type: 'error', text: 'Unesite validnu email adresu' });
      return;
    }

    try {
      const { error } = await supabase
        .from('allowed_users')
        .insert([{ email: newEmail.trim() }]);

      if (error) {
        console.error('Error adding user:', error);
        setMessage({ type: 'error', text: 'Greška pri dodavanju korisnika' });
      } else {
        setMessage({ type: 'success', text: 'Korisnik je dodat' });
        setNewEmail('');
        loadAllowedUsers();
      }
    } catch (error) {
      console.error('Error adding user:', error);
      setMessage({ type: 'error', text: 'Greška pri dodavanju korisnika' });
    }
  };

  const removeAllowedUser = async (id: number) => {
    if (!window.confirm('Da li ste sigurni da želite da uklonite ovog korisnika?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('allowed_users')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error removing user:', error);
        setMessage({ type: 'error', text: 'Greška pri uklanjanju korisnika' });
      } else {
        setMessage({ type: 'success', text: 'Korisnik je uklonjen' });
        loadAllowedUsers();
      }
    } catch (error) {
      console.error('Error removing user:', error);
      setMessage({ type: 'error', text: 'Greška pri uklanjanju korisnika' });
    }
  };

  const handleInputChange = (field: keyof OfficialTestSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
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
    <>
      <Card className="shadow-sm mb-4">
        <Card.Header>
          <h4 className="mb-0">Admin Panel - Podesavanja Zvaničnog Testa</h4>
        </Card.Header>
        <Card.Body>
          {message && (
            <Alert variant={message.type === 'success' ? 'success' : 'danger'} dismissible onClose={() => setMessage(null)}>
              {message.text}
            </Alert>
          )}

          <Form>
            <Row className="mb-3">
              <Col>
                <Form.Check
                  type="switch"
                  id="active-switch"
                  label="Zvanični test aktivan"
                  checked={settings.active}
                  onChange={(e) => handleInputChange('active', e.target.checked)}
                />
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Datum početka (opciono)</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    value={settings.start_date ? settings.start_date.slice(0, 16) : ''}
                    onChange={(e) => handleInputChange('start_date', e.target.value ? e.target.value + ':00' : null)}
                  />
                  <Form.Text className="text-muted">
                    Ako nije postavljeno, test je aktivan odmah
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Datum završetka (opciono)</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    value={settings.end_date ? settings.end_date.slice(0, 16) : ''}
                    onChange={(e) => handleInputChange('end_date', e.target.value ? e.target.value + ':00' : null)}
                  />
                  <Form.Text className="text-muted">
                    Ako nije postavljeno, test je aktivan beskonačno
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col>
                <Button 
                  variant="primary" 
                  onClick={saveSettings}
                  disabled={saving}
                  className="me-2"
                >
                  {saving ? 'Čuvanje...' : 'Sačuvaj podesavanja'}
                </Button>
                <Button 
                  variant="outline-secondary" 
                  onClick={loadSettings}
                  disabled={saving}
                >
                  Otkaži
                </Button>
              </Col>
            </Row>
          </Form>

          <hr className="my-4" />

          <div className="bg-light p-3 rounded">
            <h6>Trenutno stanje:</h6>
            <p className="mb-1">
              <strong>Aktivan:</strong> {settings.active ? 'Da' : 'Ne'}
            </p>
            <p className="mb-1">
              <strong>Početak:</strong> {settings.start_date ? new Date(settings.start_date).toLocaleString('sr-RS') : 'Nije postavljeno'}
            </p>
            <p className="mb-0">
              <strong>Završetak:</strong> {settings.end_date ? new Date(settings.end_date).toLocaleString('sr-RS') : 'Nije postavljeno'}
            </p>
          </div>
        </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Card.Header>
          <h4 className="mb-0">Upravljanje Korisnicima</h4>
        </Card.Header>
        <Card.Body>
          <div className="mb-3">
            <Form.Group>
              <Form.Label>Dodaj novog korisnika</Form.Label>
              <div className="d-flex gap-2">
                <Form.Control
                  type="email"
                  placeholder="email@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addAllowedUser()}
                />
                <Button variant="primary" onClick={addAllowedUser}>
                  Dodaj
                </Button>
              </div>
            </Form.Group>
          </div>

          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Email</th>
                <th>Datum dodavanja</th>
                <th>Akcije</th>
              </tr>
            </thead>
            <tbody>
              {allowedUsers.map(user => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>{new Date(user.created_at).toLocaleDateString('sr-RS')}</td>
                  <td>
                    <Button 
                      variant="danger" 
                      size="sm" 
                      onClick={() => removeAllowedUser(user.id)}
                    >
                      Ukloni
                    </Button>
                  </td>
                </tr>
              ))}
              {allowedUsers.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center text-muted">
                    Nema dozvoljenih korisnika
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </>
  );
};

export default AdminPanel;
