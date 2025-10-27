import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Bird, Question, QuizAttempt } from '../types';
import { Spinner, Alert, Card, Button, ListGroup } from 'react-bootstrap';
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

const QuizScreen: React.FC<Props> = ({ quizSize, onFinish }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [timer, setTimer] = useState(30);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const nextQuestionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasFinishedRef = useRef(false);

  const saveQuizResult = async (attempts: QuizAttempt[]) => {
    if (!user?.email) {
      console.error('Korisnik nije prijavljen');
      return;
    }

    const isOfficialTest = localStorage.getItem('isOfficialTest') === 'true';
    const totalScore = attempts.reduce((acc, attempt) => acc + attempt.points, 0);

    const resultToSave = {
      broj_pitanja: attempts.length,
      poeni: totalScore,
      user_email: user.email,
      zvanican_test: isOfficialTest,
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

  // (The generateQuestions function remains the same as the last version)
  const generateQuestions = useCallback((allBirds: Bird[], size: number): Question[] => {
    const birdsByGroup = allBirds.reduce((acc, bird) => {
      (acc[bird.grupa] = acc[bird.grupa] || []).push(bird);
      return acc;
    }, {} as Record<number, Bird[]>);

    let questionBirds: Bird[] = [];
    const availableGroups = shuffleArray(Object.keys(birdsByGroup));
    
    for (const groupId of availableGroups) {
      if (questionBirds.length >= size) break;
      const groupBirds = birdsByGroup[parseInt(groupId)];
      if (groupBirds.length > 0) {
        questionBirds.push(shuffleArray(groupBirds)[0]);
      }
    }

    let remainingBirds = allBirds.filter(b => !questionBirds.some(qb => qb.id === b.id));
    while (questionBirds.length < size && remainingBirds.length > 0) {
        const randomBird = shuffleArray(remainingBirds)[0];
        questionBirds.push(randomBird);
        remainingBirds = remainingBirds.filter(b => b.id !== randomBird.id);
    }
    
    questionBirds = shuffleArray(questionBirds);

    return questionBirds.map((correctBird) => {
      const sameGroupBirds = (birdsByGroup[correctBird.grupa] || []).filter(b => b.id !== correctBird.id);
      const wrongOptionsSameGroup = shuffleArray(sameGroupBirds).slice(0, 2);

      // Dodaj 2 random opcije iz drugih grupa
      const otherGroups = Object.keys(birdsByGroup).filter(g => parseInt(g) !== correctBird.grupa);
      const wrongOptionsOtherGroups: Bird[] = [];
      
      if (otherGroups.length > 0) {
        // Prva opcija iz druge grupe
        const randomOtherGroupKey1 = shuffleArray(otherGroups)[0];
        const randomOtherGroup1 = birdsByGroup[parseInt(randomOtherGroupKey1)];
        if (randomOtherGroup1 && randomOtherGroup1.length > 0) {
          wrongOptionsOtherGroups.push(shuffleArray(randomOtherGroup1)[0]);
        }
        
        // Druga opcija iz druge grupe (može biti ista grupa kao prva)
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

      // Ako nema dovoljno opcija, dodaj iz bilo koje grupe (5 ptica + "Ne znam" = 6 ukupno)
      while (options.length < 5) {
        const randomBird = shuffleArray(allBirds).find(b => 
          !options.some(o => o.id === b.id || o.naziv_srpskom === b.naziv_srpskom)
        );
        
        if (randomBird) {
          options.push(randomBird);
        } else {
          // Ako nema više jedinstvenih opcija, prekini petlju
          break;
        }
      }

      // Ukloni duplikate pre finalnog shuffle-a
      const uniqueOptions = options.filter((option, index, self) => 
        index === self.findIndex(o => o.id === option.id && o.naziv_srpskom === option.naziv_srpskom)
      );
      
      const finalOptions = shuffleArray(uniqueOptions.slice(0, 5));
      const { data } = supabase.storage.from('zvuk').getPublicUrl(`${correctBird.naziv_latinskom}.mp3`);

      return {
        correctBird,
        options: finalOptions,
        audioUrl: data.publicUrl,
      };
    });
  }, []);


  useEffect(() => {
    // Main data fetching and quiz generation
    const fetchBirdsAndGenerateQuiz = async () => {
      setLoading(true);
      const { data: birds, error: dbError } = await supabase.from('ptice').select('*');
      if (dbError) {
        setError('Greška pri dohvatanju ptica iz baze.');
        setLoading(false);
        return;
      }
      if (birds.length < 4) {
        setError('Nema dovoljno ptica u bazi za generisanje kviza (potrebno je bar 4).');
        setLoading(false);
        return;
      }
      const generatedQuestions = generateQuestions(birds, quizSize);
      setQuestions(generatedQuestions);
      setLoading(false);
    };
    fetchBirdsAndGenerateQuiz();
  }, [quizSize, generateQuestions]);

  useEffect(() => {
    // Timer logic
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
    // Timeout handler
    if (timer === 0 && !isAnswered) {
      // Finalize the current answer or default to "Ne znam"
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
    // Auto-advance to next question after a delay
    if (isAnswered) {
      nextQuestionTimeoutRef.current = setTimeout(() => {
        handleNextQuestion();
      }, 2500); // Increased delay to show feedback
    }
  }, [isAnswered, currentQuestionIndex]);

  useEffect(() => {
    // Finish quiz when all questions are answered
    if (attempts.length === quizSize && quizSize > 0 && !hasFinishedRef.current) {
      hasFinishedRef.current = true;
      saveQuizResult(attempts); // Save result before calling onFinish
      onFinish(attempts);
    }
  }, [attempts, quizSize, onFinish]);

  const handleAnswerSelect = (answer: string, isTimeout: boolean = false) => {
    if (isTimeout) {
      // Time is up - lock the answer and proceed
      setIsAnswered(true);
      setSelectedAnswer(answer);
      
      const currentQuestion = questions[currentQuestionIndex];
      const isCorrect = answer === currentQuestion.correctBird.naziv_srpskom;
      let points = 0; // No points for timeout

      setAttempts(prev => [...prev, {
        question: currentQuestion,
        userAnswer: null,
        isCorrect,
        points,
      }]);
    } else {
      // User selected an answer - allow changing until timeout
      setSelectedAnswer(answer);
    }
  };

  const handleSkipQuestion = () => {
    // Same logic as timeout - finalize current answer or default to "Ne znam"
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
    }
  };

  const getButtonVariant = (optionName: string) => {
    return 'outline-secondary';
  };

  const getButtonClassName = (optionName: string) => {
    const baseClass = "mb-2 rounded-3 text-start";
    
    if (!isAnswered) {
      // Add blue background and border for selected answer
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
    
    // Show checkmark for selected answer even before timeout
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
    <Card className="shadow-sm">
      <Card.Body className="text-center">
        <div className="d-flex justify-content-between align-items-center mb-4 px-2">
          <h5 className="mb-0">Pitanje #{currentQuestionIndex + 1} / {quizSize}</h5>
          <CircularTimer time={timer} duration={30} />
          <span className="text-muted">Poeni: <span className="text-success fw-bold">{currentScore}</span></span>
        </div>
        
        <div className="mb-4">
          <audio 
            key={currentQuestion.audioUrl} 
            controls 
            autoPlay 
            src={currentQuestion.audioUrl}
            controlsList="nodownload nofullscreen noremoteplayback"
            style={{ width: '100%' }}
          >
            Vaš pretraživač ne podržava audio element.
          </audio>
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
        
        {!isAnswered && (
          <div className="mt-3">
            <Button 
              variant="outline-secondary" 
              size="lg"
              onClick={handleSkipQuestion}
              className="px-4"
            >
              Sledeće pitanje
            </Button>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default QuizScreen;
