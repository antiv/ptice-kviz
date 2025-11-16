import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Bird, BirdWithImages, Question, QuizAttempt } from '../types';
import { Spinner, Alert, Card, Button, ListGroup, Modal } from 'react-bootstrap';
import CircularTimer from './CircularTimer';
import { useAuth } from '../contexts/AuthContext';
import './QuizScreen.css';

interface Props {
  quizSize: number;
  onFinish: (attempts: QuizAttempt[]) => void;
}

function shuffleArray<T>(array: T[]): T[] {
  return [...array].sort(() => Math.random() - 0.5);
}

const AUTHOR_MAP: Record<string, string> = {
  'JNA': 'Jelena Nikolić Antonijević',
  'BO': 'Boris Okanović',
  'MM': 'Miroslav Mareš',
  'EK': 'Ekaterina Krasnova',
  'ZN': 'Zorana Nikodijević',
  'DS': 'Dragan Stanojević',
  'MR': 'Mirjana Rankov',
};

const getAuthorName = (imageFileName: string): string | null => {
  if (!imageFileName) return null;
  const match = imageFileName.match(/^([A-Z]{2,3})_/);
  if (match && match[1]) {
    return AUTHOR_MAP[match[1]] || null;
  }
  return null;
};

const ImageQuizScreen: React.FC<Props> = ({ quizSize, onFinish }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [timer, setTimer] = useState(30);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const nextQuestionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasFinishedRef = useRef(false);

  const saveQuizResult = async (attempts: QuizAttempt[]) => {
    if (!user?.email) {
      console.error('Korisnik nije prijavljen');
      return;
    }

    const isOfficialTest = localStorage.getItem('isOfficialTest') === 'true';
    const quizType = localStorage.getItem('quizType') || 'slike';
    const totalScore = attempts.reduce((acc, attempt) => acc + attempt.points, 0);

    const resultToSave = {
      broj_pitanja: attempts.length,
      poeni: totalScore,
      user_email: user.email,
      zvanican_test: isOfficialTest,
      tip_testa: quizType,
      rezultat: {
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
    }
  };

  const generateQuestions = useCallback((allBirds: BirdWithImages[], size: number, isOfficialTest: boolean): Question[] => {
    const birdsByGroup = allBirds.reduce((acc, bird) => {
      (acc[bird.grupa] = acc[bird.grupa] || []).push(bird);
      return acc;
    }, {} as Record<number, BirdWithImages[]>);

    let questionBirds: BirdWithImages[] = [];
    const usedBirdIds = new Set<number>();
    const availableGroups = shuffleArray(Object.keys(birdsByGroup));
    
    // Prvo uzmi po jednu pticu iz svake grupe
    for (const groupId of availableGroups) {
      if (questionBirds.length >= size) break;
      const groupBirds = birdsByGroup[parseInt(groupId)];
      const availableBirdsInGroup = groupBirds.filter(b => !usedBirdIds.has(b.id));
      if (availableBirdsInGroup.length > 0) {
        const selectedBird = shuffleArray(availableBirdsInGroup)[0];
        questionBirds.push(selectedBird);
        usedBirdIds.add(selectedBird.id);
      }
    }

    // Popuni preostale ako treba
    let remainingBirds = allBirds.filter(b => !usedBirdIds.has(b.id));
    while (questionBirds.length < size && remainingBirds.length > 0) {
        const randomBird = shuffleArray(remainingBirds)[0];
        questionBirds.push(randomBird);
        usedBirdIds.add(randomBird.id);
        remainingBirds = remainingBirds.filter(b => !usedBirdIds.has(b.id));
    }
    
    questionBirds = shuffleArray(questionBirds);

    return questionBirds.map((correctBird) => {
      const sameGroupBirds = (birdsByGroup[correctBird.grupa] || []).filter(b => b.id !== correctBird.id);
      const wrongOptionsSameGroup = shuffleArray(sameGroupBirds).slice(0, 2);

      // Dodaj 2 random opcije iz drugih grupa
      const otherGroups = Object.keys(birdsByGroup).filter(g => parseInt(g) !== correctBird.grupa);
      const wrongOptionsOtherGroups: Bird[] = [];
      
      if (otherGroups.length > 0) {
        const randomOtherGroupKey1 = shuffleArray(otherGroups)[0];
        const randomOtherGroup1 = birdsByGroup[parseInt(randomOtherGroupKey1)];
        if (randomOtherGroup1 && randomOtherGroup1.length > 0) {
          wrongOptionsOtherGroups.push(shuffleArray(randomOtherGroup1)[0]);
        }
        
        const randomOtherGroupKey2 = shuffleArray(otherGroups)[0];
        const randomOtherGroup2 = birdsByGroup[parseInt(randomOtherGroupKey2)];
        if (randomOtherGroup2 && randomOtherGroup2.length > 0) {
          const secondOption = shuffleArray(randomOtherGroup2).find(b => 
            !wrongOptionsOtherGroups.some(o => o.id === b.id || o.naziv_srpskom === b.naziv_srpskom)
          );
          if (secondOption) {
            wrongOptionsOtherGroups.push(secondOption);
          }
        }
      }

      const options: Bird[] = [correctBird, ...wrongOptionsSameGroup, ...wrongOptionsOtherGroups];

      // Ako nema dovoljno opcija, dodaj iz bilo koje grupe
      while (options.length < 5) {
        const randomBird = shuffleArray(allBirds).find(b => 
          !options.some(o => o.id === b.id || o.naziv_srpskom === b.naziv_srpskom)
        );
        
        if (randomBird) {
          options.push(randomBird);
        } else {
          break;
        }
      }

      // Ukloni duplikate pre finalnog shuffle-a
      const uniqueOptions = options.filter((option, index, self) => 
        index === self.findIndex(o => o.id === option.id && o.naziv_srpskom === option.naziv_srpskom)
      );
      
      const finalOptions = shuffleArray(uniqueOptions.slice(0, 5));
      
      // Izaberi sliku - za zvanični test koristi slike_test, inače slike_vezbanje
      const availableImages = isOfficialTest ? correctBird.slike_test : correctBird.slike_vezbanje;
      const selectedImage = availableImages.length > 0 
        ? shuffleArray(availableImages)[0] 
        : '';
      
      const imageUrl = selectedImage 
        ? `https://lfacvlciikiyfuirhqmx.supabase.co/storage/v1/object/public/slike/${selectedImage}.jpg`
        : '';

      const authorName = selectedImage ? getAuthorName(selectedImage) : null;

      return {
        correctBird,
        options: finalOptions,
        imageUrl,
        imageFileName: selectedImage,
        authorName,
      };
    });
  }, []);

  useEffect(() => {
    const fetchBirdsAndGenerateQuiz = async () => {
      setLoading(true);
      const isOfficialTest = localStorage.getItem('isOfficialTest') === 'true';
      
      const { data: birdsData, error: dbError } = await supabase
        .from('ptice_slike')
        .select('*');
        
      if (dbError) {
        setError('Greška pri dohvatanju ptica iz baze.');
        setLoading(false);
        return;
      }
      
      if (!birdsData || birdsData.length < 4) {
        setError('Nema dovoljno ptica u bazi za generisanje kviza (potrebno je bar 4).');
        setLoading(false);
        return;
      }
      
      const birds: BirdWithImages[] = birdsData.map(bird => ({
        id: bird.id,
        naziv_srpskom: bird.naziv_srpskom,
        naziv_latinskom: bird.naziv_latinskom,
        grupa: bird.grupa,
        slike_vezbanje: bird.slike_vezbanje || [],
        slike_test: bird.slike_test || [],
      }));
      
      const generatedQuestions = generateQuestions(birds, quizSize, isOfficialTest);
      setQuestions(generatedQuestions);
      setLoading(false);
    };
    fetchBirdsAndGenerateQuiz();
  }, [quizSize, generateQuestions]);

  useEffect(() => {
    // Reset image loaded state when question changes
    setImageLoaded(false);
  }, [currentQuestionIndex]);

  useEffect(() => {
    if (!isAnswered) {
      timerRef.current = setInterval(() => setTimer(prev => prev - 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (nextQuestionTimeoutRef.current) clearTimeout(nextQuestionTimeoutRef.current);
    };
  }, [isAnswered]);

  useEffect(() => {
    if (timer === 0 && !isAnswered) {
      const finalAnswer = selectedAnswer || 'Ne znam';
      setIsAnswered(true);
      
      const currentQuestion = questions[currentQuestionIndex];
      const isCorrect = finalAnswer === currentQuestion.correctBird.naziv_srpskom;
      let points = finalAnswer === 'Ne znam' ? 0 : (isCorrect ? 1 : -1);

      setAttempts(prev => [...prev, {
        question: currentQuestion,
        userAnswer: finalAnswer === 'Ne znam' ? null : finalAnswer,
        isCorrect,
        points,
      }]);
    }
  }, [timer, isAnswered, selectedAnswer, questions, currentQuestionIndex]);

  useEffect(() => {
    if (isAnswered) {
      nextQuestionTimeoutRef.current = setTimeout(() => {
        if (currentQuestionIndex < quizSize - 1) {
          handleNextQuestion();
        } else {
          hasFinishedRef.current = true;
          saveQuizResult(attempts);
          onFinish(attempts);
        }
      }, 2500);
    }
  }, [isAnswered, currentQuestionIndex, quizSize, attempts, onFinish]);

  const handleAnswerSelect = (answer: string, isTimeout: boolean = false) => {
    if (isTimeout) {
      setIsAnswered(true);
      setSelectedAnswer(answer);
      
      const currentQuestion = questions[currentQuestionIndex];
      const isCorrect = answer === currentQuestion.correctBird.naziv_srpskom;
      let points = 0;

      setAttempts(prev => [...prev, {
        question: currentQuestion,
        userAnswer: null,
        isCorrect,
        points,
      }]);
    } else {
      setSelectedAnswer(answer);
    }
  };

  const handleSkipQuestion = () => {
    const finalAnswer = selectedAnswer || 'Ne znam';
    setIsAnswered(true);
    
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = finalAnswer === currentQuestion.correctBird.naziv_srpskom;
    let points = finalAnswer === 'Ne znam' ? 0 : (isCorrect ? 1 : -1);

    setAttempts(prev => [...prev, {
      question: currentQuestion,
      userAnswer: finalAnswer === 'Ne znam' ? null : finalAnswer,
      isCorrect,
      points,
    }]);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizSize - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setTimer(30);
      setImageLoaded(false);
    }
  };

  const getButtonVariant = (optionName: string) => {
    return 'outline-secondary';
  };

  const getButtonClassName = (optionName: string) => {
    const baseClass = "mb-2 rounded-3 text-start";
    
    if (!isAnswered) {
      if (optionName === selectedAnswer) {
        return `${baseClass} bg-primary-subtle border-primary border-3`;
      }
      return baseClass;
    }
    
    const correctName = questions[currentQuestionIndex].correctBird.naziv_srpskom;
    const isSelected = optionName === selectedAnswer;
    const isCorrect = optionName === correctName;
    
    if (isAnswered && isCorrect) {
      return `${baseClass} bg-success border-success border-3 text-white`;
    }
    
    if (isAnswered && isSelected && !isCorrect) {
      return `${baseClass} bg-danger border-danger border-3 text-white`;
    }
    
    return baseClass;
  };

  const getButtonContent = (optionName: string) => {
    const correctName = questions[currentQuestionIndex].correctBird.naziv_srpskom;
    const isSelected = optionName === selectedAnswer;
    const isCorrect = optionName === correctName;
    
    if (isAnswered && (isSelected || isCorrect)) {
      const checkmark = isCorrect ? '✓' : (isSelected ? '✗' : '');
      return (
        <div className="d-flex justify-content-between align-items-center w-100">
          <div>
            <div><strong>{optionName}</strong></div>
            {optionName !== 'Ne znam' && <em className="text-muted">{questions[currentQuestionIndex].options.find(o => o.naziv_srpskom === optionName)?.naziv_latinskom}</em>}
          </div>
          <span className="fs-4 fw-bold text-white">{checkmark}</span>
        </div>
      );
    }
    
    if (isSelected && !isAnswered) {
      return (
        <div className="d-flex justify-content-between align-items-center w-100">
          <div>
            <div><strong>{optionName}</strong></div>
            {optionName !== 'Ne znam' && <em className="text-muted">{questions[currentQuestionIndex].options.find(o => o.naziv_srpskom === optionName)?.naziv_latinskom}</em>}
          </div>
          <span className="fs-4 fw-bold text-primary">✓</span>
        </div>
      );
    }
    
    return (
      <div>
        <div><strong>{optionName}</strong></div>
        {optionName !== 'Ne znam' && <em className="text-muted">{questions[currentQuestionIndex].options.find(o => o.naziv_srpskom === optionName)?.naziv_latinskom}</em>}
      </div>
    );
  };

  const currentScore = attempts.reduce((sum, attempt) => sum + attempt.points, 0);

  if (loading) return <Spinner animation="border" />;
  if (error) return <Alert variant="danger">{error}</Alert>;
  if (questions.length === 0) return <Alert variant="info">Generišem pitanja...</Alert>;

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <>
    <Card className="shadow-sm">
      <Card.Body className="text-center">
        <div className="d-flex justify-content-between align-items-center mb-4 px-2">
          <h5 className="mb-0">Pitanje #{currentQuestionIndex + 1} / {quizSize}</h5>
          <CircularTimer time={timer} duration={30} />
          <span className="text-muted">Poeni: <span className="text-success fw-bold">{currentScore}</span></span>
        </div>
        
        <div className="mb-4 position-relative" style={{ display: 'inline-block' }}>
          {currentQuestion.imageUrl && (
            <>
              <img 
                src={currentQuestion.imageUrl} 
                alt="Ptica" 
                className="img-fluid rounded"
                style={{ maxHeight: '400px', objectFit: 'contain', cursor: 'pointer' }}
                onClick={() => setShowImagePreview(true)}
                onLoad={() => setImageLoaded(true)}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = '<div class="alert alert-warning">Slika nije dostupna</div>';
                  }
                }}
              />
              {imageLoaded && (currentQuestion as any).authorName && (
                <div 
                  className="position-absolute"
                  style={{
                    bottom: '8px',
                    right: '8px',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    pointerEvents: 'none'
                  }}
                >
                  © {(currentQuestion as any).authorName}
                </div>
              )}
            </>
          )}
        </div>

        <ListGroup className="mb-3">
          {currentQuestion.options.map(option => (
            <ListGroup.Item 
              key={option.id}
              as={Button}
              onClick={() => handleAnswerSelect(option.naziv_srpskom)}
              variant={getButtonVariant(option.naziv_srpskom)}
              disabled={isAnswered}
              className={getButtonClassName(option.naziv_srpskom)}
            >
              {getButtonContent(option.naziv_srpskom)}
            </ListGroup.Item>
          ))}
           <ListGroup.Item 
              as={Button}
              onClick={() => handleAnswerSelect('Ne znam')}
              variant={getButtonVariant('Ne znam')}
              disabled={isAnswered}
              className={getButtonClassName('Ne znam')}
            >
              {getButtonContent('Ne znam')}
            </ListGroup.Item>
        </ListGroup>
        
        <div className="mt-3">
          <Button 
            variant="outline-secondary" 
            size="lg"
            onClick={handleSkipQuestion}
            disabled={isAnswered}
            className="px-4"
          >
            {currentQuestionIndex === quizSize - 1 ? 'Rezultati' : 'Sledeće pitanje'}
          </Button>
        </div>
      </Card.Body>
    </Card>
    {currentQuestion.imageUrl && (
      <Modal 
        show={showImagePreview} 
        onHide={() => {
          setShowImagePreview(false);
          setImageLoaded(false);
        }}
        onEntered={() => setImageLoaded(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Pregled slike</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center p-0 position-relative">
          <img 
            src={currentQuestion.imageUrl} 
            alt="Ptica" 
            className="img-fluid"
            style={{ maxHeight: '80vh', width: '100%', objectFit: 'contain' }}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = '<div class="alert alert-warning m-3">Slika nije dostupna</div>';
              }
            }}
          />
          {imageLoaded && (currentQuestion as any).authorName && (
            <div 
              className="position-absolute"
              style={{
                bottom: '16px',
                right: '16px',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '0.875rem',
                pointerEvents: 'none'
              }}
            >
              © {(currentQuestion as any).authorName}
            </div>
          )}
        </Modal.Body>
      </Modal>
    )}
    </>
  );
};

export default ImageQuizScreen;

