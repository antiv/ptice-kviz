import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Row, Col, Alert, Table, Badge, Container, Pagination, ButtonGroup } from 'react-bootstrap';
import { supabase } from '../supabaseClient';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';

interface OfficialTestSettings {
  active: boolean;
  start_date: string | null;
  end_date: string | null;
}

interface AllowedUser {
  id: number;
  email: string;
  roles: string;
  created_at: string;
}

interface StatsData {
  date: string;
  fullDate: Date; // For sorting
  slike: number;
  oglasavanje: number;
  successRate: number;
  totalTests: number;
}

type TimeRange = 'today' | '3days' | '7days' | 'month';

const ITEMS_PER_PAGE = 10;

interface Props {
  onNavigate?: (page: 'preview') => void;
}

const AdminPanel: React.FC<Props> = ({ onNavigate }) => {
  const [settings, setSettings] = useState<OfficialTestSettings>({
    active: false,
    start_date: null,
    end_date: null
  });
  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>([]);
  const [statsData, setStatsData] = useState<StatsData[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('7days');
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadSettings();
    loadAllowedUsers();
  }, []);

  useEffect(() => {
    loadStats(timeRange);
  }, [timeRange]);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const loadStats = async (range: TimeRange) => {
    try {
      let startDate = new Date();
      let groupBy = 'day'; // 'hour' or 'day'

      if (range === 'today') {
        startDate.setHours(0, 0, 0, 0);
        groupBy = 'hour';
      } else if (range === '3days') {
        startDate.setDate(startDate.getDate() - 2); // Today included = 3 days
        startDate.setHours(0, 0, 0, 0);
      } else if (range === '7days') {
        startDate.setDate(startDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
      } else if (range === 'month') {
        startDate.setMonth(startDate.getMonth(), 1); // First day of current month
        startDate.setHours(0, 0, 0, 0);
      }

      const { data, error } = await supabase
        .from('rezultati_kviza')
        .select('created_at, poeni, broj_pitanja, tip_testa')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading stats:', error);
        return;
      }

      if (data) {
        const statsMap = new Map<string, { slike: number; oglasavanje: number; totalScore: number; totalQuestions: number }>();
        
        // Initialize periods
        if (range === 'today') {
          // 24 hours
          for (let i = 0; i < 24; i++) {
            const label = `${i.toString().padStart(2, '0')}:00`;
            statsMap.set(label, { slike: 0, oglasavanje: 0, totalScore: 0, totalQuestions: 0 });
          }
        } else {
          // Days
          const end = new Date();
          for (let d = new Date(startDate); d <= end; d.setDate(d.getDate() + 1)) {
            const label = d.toLocaleDateString('sr-RS', { day: 'numeric', month: 'short' });
            statsMap.set(label, { slike: 0, oglasavanje: 0, totalScore: 0, totalQuestions: 0 });
          }
        }

        data.forEach(item => {
          const date = new Date(item.created_at);
          let key = '';

          if (range === 'today') {
            key = `${date.getHours().toString().padStart(2, '0')}:00`;
          } else {
            key = date.toLocaleDateString('sr-RS', { day: 'numeric', month: 'short' });
          }

          // If exact key not found (e.g. slight timezone diffs or initialization diffs), try to find closest or just skip logic if map initialized correctly
          // Since we initialized map based on local time, we should be careful with timezones. 
          // For simplicity, we assume keys match string representation.
          
          if (statsMap.has(key)) {
            const stat = statsMap.get(key)!;
            const type = item.tip_testa || 'oglasavanje'; // Fallback default
            
            if (type === 'slike') stat.slike++;
            else stat.oglasavanje++;

            stat.totalScore += (item.poeni || 0);
            stat.totalQuestions += (item.broj_pitanja || 0);
          }
        });

        const statsArray: StatsData[] = Array.from(statsMap.entries()).map(([date, val]) => {
          const totalTests = val.slike + val.oglasavanje;
          // Calculate success rate: total points / total questions (max possible points per question is 1)
          // Assuming max points per question is 1.
          const successRate = val.totalQuestions > 0 
            ? Math.round((val.totalScore / val.totalQuestions) * 100) 
            : 0;

          return {
            date,
            fullDate: new Date(), // Not strictly used for sorting anymore since map is ordered
            slike: val.slike,
            oglasavanje: val.oglasavanje,
            successRate: Math.max(0, successRate), // No negative percentage
            totalTests
          };
        });

        setStatsData(statsArray);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'official_test_active')
        .single();

      if (error) {
        console.error('Error loading settings:', error);
        setMessage({ type: 'error', text: 'Greška pri učitavanju podešavanja' });
      } else if (data) {
        setSettings(data.setting_value);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setMessage({ type: 'error', text: 'Greška pri učitavanju podešavanja' });
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
        setMessage({ type: 'error', text: 'Greška pri čuvanju podešavanja' });
      } else {
        setMessage({ type: 'success', text: 'Podešavanja su uspešno sačuvana' });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Greška pri čuvanju podešavanja' });
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
        .insert([{ email: newEmail.trim(), roles: 'user' }]);

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

  const updateUserRole = async (id: number, newRole: string) => {
    try {
      const { error } = await supabase
        .from('allowed_users')
        .update({ roles: newRole })
        .eq('id', id);

      if (error) {
        console.error('Error updating user role:', error);
        setMessage({ type: 'error', text: 'Greška pri ažuriranju uloge korisnika' });
      } else {
        setMessage({ type: 'success', text: 'Uloga korisnika je ažurirana' });
        loadAllowedUsers();
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      setMessage({ type: 'error', text: 'Greška pri ažuriranju uloge korisnika' });
    }
  };

  const handleInputChange = (field: keyof OfficialTestSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Filter users based on search term
  const filteredUsers = allowedUsers.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const currentUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <Container fluid className="px-0">
      <div className="mb-4 d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-3">
          <h2 className="h3 mb-0 text-gray-800">Admin Dashboard</h2>
          <Badge bg={settings.active ? "success" : "secondary"} className="px-3 py-2 fs-6">
            Test: {settings.active ? "AKTIVAN" : "NEAKTIVAN"}
          </Badge>
        </div>
      </div>

      {message && (
        <Alert variant={message.type === 'success' ? 'success' : 'danger'} dismissible onClose={() => setMessage(null)} className="mb-4 shadow-sm">
          {message.text}
        </Alert>
      )}

      {/* Stats Section */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
          <h6 className="m-0 font-weight-bold text-primary">Analitika</h6>
          <ButtonGroup size="sm">
            <Button variant={timeRange === 'today' ? 'primary' : 'outline-primary'} onClick={() => setTimeRange('today')}>Danas</Button>
            <Button variant={timeRange === '3days' ? 'primary' : 'outline-primary'} onClick={() => setTimeRange('3days')}>3 Dana</Button>
            <Button variant={timeRange === '7days' ? 'primary' : 'outline-primary'} onClick={() => setTimeRange('7days')}>7 Dana</Button>
            <Button variant={timeRange === 'month' ? 'primary' : 'outline-primary'} onClick={() => setTimeRange('month')}>Mesec</Button>
          </ButtonGroup>
        </Card.Header>
        <Card.Body>
          <Row>
            {/* Tests Graph */}
            <Col lg={8} className="mb-4 mb-lg-0">
              <h6 className="text-muted mb-3 small text-uppercase fw-bold">Broj Urađenih Testova</h6>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={statsData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9ecef" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#6c757d" 
                      tick={{ fontSize: 12 }} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      allowDecimals={false} 
                      stroke="#6c757d" 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                    <Line 
                      type="monotone" 
                      dataKey="oglasavanje" 
                      name="Oglašavanje" 
                      stroke="#198754" 
                      strokeWidth={2} 
                      activeDot={{ r: 6 }} 
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="slike" 
                      name="Izgled" 
                      stroke="#0dcaf0" 
                      strokeWidth={2} 
                      activeDot={{ r: 6 }} 
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Col>

            {/* Success Rate Graph */}
            <Col lg={4}>
              <h6 className="text-muted mb-3 small text-uppercase fw-bold">Prosečna Uspešnost (%)</h6>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={statsData}
                    margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9ecef" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#6c757d" 
                      tick={{ fontSize: 12 }} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      stroke="#6c757d" 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                      formatter={(value: number) => [`${value}%`, 'Uspešnost']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="successRate" 
                      name="Uspešnost" 
                      stroke="#ffc107" 
                      fill="#ffc107" 
                      fillOpacity={0.1} 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center mt-2">
                <small className="text-muted">Prosečna uspešnost na testovima</small>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Row className="g-4">
        {/* Test Settings Column */}
        <Col lg={5}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-white py-3">
              <h6 className="m-0 font-weight-bold text-primary">Kontrola Zvaničnog Testa</h6>
            </Card.Header>
            <Card.Body>
              <Form>
                <div className="mb-4 p-3 bg-light rounded">
                  <Form.Check
                    type="switch"
                    id="active-switch"
                    label={<span className="fw-bold">{settings.active ? "Test je trenutno aktivan" : "Test je trenutno neaktivan"}</span>}
                    checked={settings.active}
                    onChange={(e) => handleInputChange('active', e.target.checked)}
                    className="mb-0 fs-5"
                  />
                </div>

                <Row className="mb-3">
                  <Col md={12} className="mb-3">
                    <Form.Group>
                      <Form.Label className="small text-uppercase text-muted fw-bold">Datum početka</Form.Label>
                      <Form.Control
                        type="datetime-local"
                        value={settings.start_date ? settings.start_date.slice(0, 16) : ''}
                        onChange={(e) => handleInputChange('start_date', e.target.value ? e.target.value + ':00' : null)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label className="small text-uppercase text-muted fw-bold">Datum završetka</Form.Label>
                      <Form.Control
                        type="datetime-local"
                        value={settings.end_date ? settings.end_date.slice(0, 16) : ''}
                        onChange={(e) => handleInputChange('end_date', e.target.value ? e.target.value + ':00' : null)}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <div className="d-grid gap-2">
                  <Button 
                    variant="primary" 
                    onClick={saveSettings}
                    disabled={saving}
                  >
                    {saving ? 'Čuvanje...' : 'Sačuvaj Promene'}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white py-3">
              <h6 className="m-0 font-weight-bold text-success">Dodaj Novog Korisnika</h6>
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Email adresa</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="Unesite email..."
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addAllowedUser()}
                />
              </Form.Group>
              <div className="d-grid">
                <Button variant="success" onClick={addAllowedUser}>
                  Dodaj Korisnika
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Users Table Column */}
        <Col lg={7}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-3">
                <h6 className="m-0 font-weight-bold text-primary">Lista Korisnika</h6>
                <Badge bg="light" text="dark" className="border">
                  {filteredUsers.length} total
                </Badge>
              </div>
              <div style={{ width: '200px' }}>
                <Form.Control
                  type="text"
                  placeholder="Pretraži..."
                  size="sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table hover className="mb-0 align-middle">
                  <thead className="bg-light text-muted small text-uppercase">
                    <tr>
                      <th className="ps-4 py-3 border-0">Email</th>
                      <th className="py-3 border-0">Uloga</th>
                      <th className="py-3 border-0">Dodat</th>
                      <th className="pe-4 py-3 border-0 text-end">Akcije</th>
                    </tr>
                  </thead>
                  <tbody className="border-top-0">
                    {currentUsers.map(user => (
                      <tr key={user.id}>
                        <td className="ps-4 fw-medium">{user.email}</td>
                        <td>
                          <Form.Select
                            size="sm"
                            value={user.roles || 'user'}
                            onChange={(e) => updateUserRole(user.id, e.target.value)}
                            style={{ width: '100px' }}
                            className={`border-0 bg-${user.roles === 'admin' ? 'warning' : 'light'} bg-opacity-25 text-${user.roles === 'admin' ? 'dark' : 'secondary'}`}
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </Form.Select>
                        </td>
                        <td className="text-muted small">
                          {new Date(user.created_at).toLocaleDateString('sr-RS')}
                        </td>
                        <td className="pe-4 text-end">
                          <Button 
                            variant="link" 
                            className="text-danger p-0 text-decoration-none"
                            onClick={() => removeAllowedUser(user.id)}
                            title="Ukloni korisnika"
                          >
                            ✕
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {currentUsers.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-5">
                          {searchTerm ? 'Nema korisnika koji odgovaraju pretrazi' : 'Nema dodatih korisnika'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="d-flex justify-content-center p-3 border-top">
                  <Pagination className="mb-0">
                    <Pagination.First 
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    />
                    <Pagination.Prev 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    />
                    
                    {[...Array(totalPages)].map((_, idx) => {
                      const page = idx + 1;
                      if (
                        page === 1 || 
                        page === totalPages || 
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <Pagination.Item
                            key={page}
                            active={page === currentPage}
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Pagination.Item>
                        );
                      }
                      if (
                        (page === currentPage - 2 && page > 2) || 
                        (page === currentPage + 2 && page < totalPages - 1)
                      ) {
                        return <Pagination.Ellipsis key={page} />;
                      }
                      return null;
                    })}

                    <Pagination.Next 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    />
                    <Pagination.Last 
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    />
                  </Pagination>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AdminPanel;