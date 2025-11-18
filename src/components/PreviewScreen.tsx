import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Form, Modal, Badge, InputGroup, Card, Row, Col, Alert } from 'react-bootstrap';
import { supabase } from '../supabaseClient';
import { BirdWithImages } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  onBack: () => void;
}

const PreviewScreen: React.FC<Props> = ({ onBack }) => {
  const { isAdmin } = useAuth();
  const [birds, setBirds] = useState<BirdWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBird, setEditingBird] = useState<BirdWithImages | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBird, setNewBird] = useState<Partial<BirdWithImages>>({
    naziv_srpskom: '',
    naziv_latinskom: '',
    grupa: 1,
    slike_vezbanje: [],
    slike_test: []
  });
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Gallery Modal State
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [galleryBird, setGalleryBird] = useState<BirdWithImages | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchBirds();
  }, []);

  const fetchBirds = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ptice_slike')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
      setBirds(data || []);
    } catch (error) {
      console.error('Error fetching birds:', error);
      setMessage({ type: 'error', text: 'Greška pri učitavanju podataka.' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (bird: BirdWithImages) => {
    setEditingBird({ ...bird });
    setShowEditModal(true);
  };

  const handleImageClick = (imageName: string) => {
    const url = `https://lfacvlciikiyfuirhqmx.supabase.co/storage/v1/object/public/slike/${imageName}.jpg`;
    setSelectedImageUrl(url);
    setShowImageModal(true);
  };

  const handleOpenGallery = (bird: BirdWithImages) => {
    setGalleryBird(bird);
    setShowGalleryModal(true);
  };

  const handleSave = async () => {
    if (!editingBird) return;

    try {
      const { error } = await supabase
        .from('ptice_slike')
        .update({
          naziv_srpskom: editingBird.naziv_srpskom,
          naziv_latinskom: editingBird.naziv_latinskom,
          grupa: editingBird.grupa,
          slike_vezbanje: editingBird.slike_vezbanje,
          slike_test: editingBird.slike_test
        })
        .eq('id', editingBird.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Podaci uspešno ažurirani.' });
      setShowEditModal(false);
      fetchBirds();
    } catch (error) {
      console.error('Error updating bird:', error);
      setMessage({ type: 'error', text: 'Greška pri ažuriranju podataka.' });
    }
  };

  const handleAdd = async () => {
    if (!newBird.naziv_srpskom || !newBird.naziv_latinskom) {
      setMessage({ type: 'error', text: 'Naziv na srpskom i latinskom su obavezni.' });
      return;
    }

    try {
      const { error } = await supabase
        .from('ptice_slike')
        .insert([{
          naziv_srpskom: newBird.naziv_srpskom,
          naziv_latinskom: newBird.naziv_latinskom,
          grupa: newBird.grupa || 1,
          slike_vezbanje: newBird.slike_vezbanje || [],
          slike_test: newBird.slike_test || []
        }]);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Nova vrsta uspešno dodata.' });
      setShowAddModal(false);
      setNewBird({
        naziv_srpskom: '',
        naziv_latinskom: '',
        grupa: 1,
        slike_vezbanje: [],
        slike_test: []
      });
      fetchBirds();
    } catch (error) {
      console.error('Error adding bird:', error);
      setMessage({ type: 'error', text: 'Greška pri dodavanju nove vrste.' });
    }
  };

  const handleNewBirdArrayChange = (field: 'slike_vezbanje' | 'slike_test', value: string) => {
    const array = value.split(',').map(s => s.trim()).filter(s => s !== '');
    setNewBird({ ...newBird, [field]: array });
  };

  const filteredBirds = birds.filter(bird =>
    bird.naziv_srpskom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bird.naziv_latinskom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredBirds.length / itemsPerPage);
  const paginatedBirds = filteredBirds.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset pagination when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleArrayChange = (field: 'slike_vezbanje' | 'slike_test', value: string) => {
    if (!editingBird) return;
    // Split by comma, trim whitespace, filter empty strings
    const array = value.split(',').map(s => s.trim()).filter(s => s !== '');
    setEditingBird({ ...editingBird, [field]: array });
  };

  if (loading) {
    return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;
  }

  return (
    <Container fluid>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-3">
          <Button variant="outline-secondary" onClick={onBack}>
            &larr; Nazad
          </Button>
          <h2 className="mb-0 h4">Pregled Vrsta</h2>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <div style={{ width: '300px' }}>
            <Form.Control
              type="text"
              placeholder="Pretraži..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {isAdmin && (
            <Button variant="success" onClick={() => setShowAddModal(true)}>
              + Dodaj novu vrstu
            </Button>
          )}
        </div>
      </div>

      {message && (
        <Alert variant={message.type === 'success' ? 'success' : 'danger'} dismissible onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0 align-middle">
              <thead className="bg-light text-muted small text-uppercase">
                <tr>
                  <th className="ps-4 py-3 border-0">ID</th>
                  <th className="py-3 border-0">Thumb</th>
                  <th className="py-3 border-0">Naziv (Srpski)</th>
                  <th className="py-3 border-0">Naziv (Latinski)</th>
                  <th className="py-3 border-0">Grupa</th>
                  <th className="py-3 border-0">Slike</th>
                  {isAdmin && <th className="pe-4 py-3 border-0 text-end">Akcije</th>}
                </tr>
              </thead>
              <tbody className="border-top-0">
                {paginatedBirds.map(bird => {
                    // Show first image from vezbanje, or first from test, or placeholder
                    const thumbImage = bird.slike_vezbanje?.[0] || bird.slike_test?.[0];
                    const thumbUrl = thumbImage 
                        ? `https://lfacvlciikiyfuirhqmx.supabase.co/storage/v1/object/public/slike/${thumbImage}.jpg`
                        : null;

                    return (
                        <tr key={bird.id}>
                        <td className="ps-4 fw-bold text-muted">#{bird.id}</td>
                        <td>
                            {thumbUrl ? (
                            <img 
                                src={thumbUrl} 
                                alt={bird.naziv_srpskom} 
                                className="rounded object-fit-cover"
                                style={{ width: '40px', height: '40px', cursor: 'pointer' }}
                                onClick={() => handleOpenGallery(bird)}
                            />
                            ) : (
                            <div className="bg-light rounded d-flex align-items-center justify-content-center text-muted small" style={{ width: '40px', height: '40px' }}>
                                -
                            </div>
                            )}
                        </td>
                        <td className="fw-medium">{bird.naziv_srpskom}</td>
                        <td className="text-muted fst-italic">{bird.naziv_latinskom}</td>
                        <td><Badge bg="secondary">{bird.grupa}</Badge></td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button 
                              variant="outline-info" 
                              size="sm" 
                              className="d-flex align-items-center gap-1"
                              onClick={() => handleOpenGallery(bird)}
                              title="Pregled svih slika"
                            >
                              <span className="small">Pregled</span>
                              <Badge bg="info" text="dark" pill style={{ fontSize: '0.6rem' }}>
                                {(bird.slike_vezbanje?.length || 0) + (bird.slike_test?.length || 0)}
                              </Badge>
                            </Button>
                          </div>
                        </td>
                        {isAdmin && (
                            <td className="pe-4 text-end">
                            <Button variant="outline-primary" size="sm" onClick={() => handleEditClick(bird)}>
                                Izmeni
                            </Button>
                            </td>
                        )}
                        </tr>
                    );
                })}
              </tbody>
            </Table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-center p-3 border-top">
              <div className="btn-group">
                <Button 
                    variant="outline-secondary" 
                    size="sm" 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                >
                    Prethodna
                </Button>
                <Button variant="outline-secondary" size="sm" disabled className="fw-bold text-dark">
                    {currentPage} / {totalPages}
                </Button>
                <Button 
                    variant="outline-secondary" 
                    size="sm" 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                >
                    Sledeća
                </Button>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Add Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Dodaj novu vrstu</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Naziv na srpskom <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    value={newBird.naziv_srpskom || ''}
                    onChange={(e) => setNewBird({ ...newBird, naziv_srpskom: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Naziv na latinskom <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    value={newBird.naziv_latinskom || ''}
                    onChange={(e) => setNewBird({ ...newBird, naziv_latinskom: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row className="mb-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Grupa</Form.Label>
                  <Form.Control
                    type="number"
                    value={newBird.grupa || 1}
                    onChange={(e) => setNewBird({ ...newBird, grupa: parseInt(e.target.value) || 1 })}
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3">
              <Form.Label>Slike za vežbanje (odvojene zarezom)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={(newBird.slike_vezbanje || []).join(', ')}
                onChange={(e) => handleNewBirdArrayChange('slike_vezbanje', e.target.value)}
              />
              <Form.Text className="text-muted">
                Unesite imena fajlova bez ekstenzije, odvojena zarezom (npr. Parus_major_1, Parus_major_2)
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Slike za test (odvojene zarezom)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={(newBird.slike_test || []).join(', ')}
                onChange={(e) => handleNewBirdArrayChange('slike_test', e.target.value)}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>
            Otkaži
          </Button>
          <Button variant="success" onClick={handleAdd}>
            Dodaj
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Izmeni podatke</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editingBird && (
            <Form>
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Naziv na srpskom</Form.Label>
                    <Form.Control
                      type="text"
                      value={editingBird.naziv_srpskom}
                      onChange={(e) => setEditingBird({ ...editingBird, naziv_srpskom: e.target.value })}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Naziv na latinskom</Form.Label>
                    <Form.Control
                      type="text"
                      value={editingBird.naziv_latinskom}
                      onChange={(e) => setEditingBird({ ...editingBird, naziv_latinskom: e.target.value })}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row className="mb-3">
                  <Col md={4}>
                    <Form.Group>
                        <Form.Label>Grupa</Form.Label>
                        <Form.Control
                        type="number"
                        value={editingBird.grupa}
                        onChange={(e) => setEditingBird({ ...editingBird, grupa: parseInt(e.target.value) })}
                        />
                    </Form.Group>
                  </Col>
              </Row>
              
              <Form.Group className="mb-3">
                <Form.Label>Slike za vežbanje (odvojene zarezom)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={editingBird.slike_vezbanje.join(', ')}
                  onChange={(e) => handleArrayChange('slike_vezbanje', e.target.value)}
                />
                <Form.Text className="text-muted">
                  Unesite imena fajlova bez ekstenzije, odvojena zarezom (npr. Parus_major_1, Parus_major_2)
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Slike za test (odvojene zarezom)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={editingBird.slike_test.join(', ')}
                  onChange={(e) => handleArrayChange('slike_test', e.target.value)}
                />
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Otkaži
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Sačuvaj
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Gallery Modal */}
      <Modal show={showGalleryModal} onHide={() => setShowGalleryModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>
            Galerija: {galleryBird?.naziv_srpskom} <span className="text-muted fs-6">({galleryBird?.naziv_latinskom})</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-4">
            <h5 className="border-bottom pb-2 mb-3 text-success">Slike za vežbanje ({galleryBird?.slike_vezbanje?.length || 0})</h5>
            <Row xs={2} sm={3} md={4} lg={5} className="g-3">
              {galleryBird?.slike_vezbanje && galleryBird.slike_vezbanje.length > 0 ? (
                galleryBird.slike_vezbanje.map((img, idx) => (
                  <Col key={idx}>
                    <div className="position-relative">
                      <img
                        src={`https://lfacvlciikiyfuirhqmx.supabase.co/storage/v1/object/public/slike/${img}.jpg`}
                        alt={`Vežbanje ${idx + 1}`}
                        className="img-thumbnail w-100 object-fit-cover"
                        style={{ height: '150px', cursor: 'pointer' }}
                        onClick={() => handleImageClick(img)}
                      />
                      <div className="mt-1 text-center small text-truncate text-muted" title={img}>
                        {img}
                      </div>
                    </div>
                  </Col>
                ))
              ) : (
                <Col xs={12}>
                  <p className="text-muted fst-italic">Nema slika za vežbanje.</p>
                </Col>
              )}
            </Row>
          </div>

          <div>
            <h5 className="border-bottom pb-2 mb-3 text-info">Slike za test ({galleryBird?.slike_test?.length || 0})</h5>
            <Row xs={2} sm={3} md={4} lg={5} className="g-3">
              {galleryBird?.slike_test && galleryBird.slike_test.length > 0 ? (
                galleryBird.slike_test.map((img, idx) => (
                  <Col key={idx}>
                    <div className="position-relative">
                      <img
                        src={`https://lfacvlciikiyfuirhqmx.supabase.co/storage/v1/object/public/slike/${img}.jpg`}
                        alt={`Test ${idx + 1}`}
                        className="img-thumbnail w-100 object-fit-cover"
                        style={{ height: '150px', cursor: 'pointer' }}
                        onClick={() => handleImageClick(img)}
                      />
                      <div className="mt-1 text-center small text-truncate text-muted" title={img}>
                        {img}
                      </div>
                    </div>
                  </Col>
                ))
              ) : (
                <Col xs={12}>
                  <p className="text-muted fst-italic">Nema slika za test.</p>
                </Col>
              )}
            </Row>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowGalleryModal(false)}>
            Zatvori
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Image Preview Modal */}
      <Modal show={showImageModal} onHide={() => setShowImageModal(false)} size="lg" centered>
        <Modal.Body className="p-0 bg-transparent text-center">
            {selectedImageUrl && (
                <img 
                    src={selectedImageUrl} 
                    alt="Preview" 
                    className="img-fluid rounded" 
                    style={{ maxHeight: '80vh' }}
                />
            )}
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default PreviewScreen;

