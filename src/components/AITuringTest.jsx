import React, { useState } from 'react';
import { Brain, Play } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ReactMarkdown from 'react-markdown';

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

const QUESTION_PROMPT = `Generate an interesting, open-ended question that could reveal thought patterns. The question should encourage detailed, thoughtful responses. Only respond with the question itself, nothing else. The question should be answerable with a single line`;

const AI_ANSWER_PROMPT = `You are participating in a conversation. Answer the following question thoughtfully and naturally, as if you were having a real conversation: `;

const JUDGE_PROMPT = `You are an AI judge analyzing two responses to the same question. One response is from a human and one is from an AI. 

Your task is to determine which is which and provide your analysis in markdown format using this structure:

# AI Judge's Analysis

## Response Analysis

### Response 1

*Analysis:* [Your detailed analysis of why this seems human or AI]

### Response 2

*Analysis:* [Your detailed analysis of why this seems human or AI]

## Verdict
[Your final determination of which response is human vs AI and a brief summary of key factors]`;

const formatOutput = (question, userAnswer, aiAnswer, verdict) => {
  return `# AI Turing Test Results\n\n
## The Question
${question}\n\n
## Human Response
${userAnswer}\n\n
## AI Response
${aiAnswer}\n\n
---
${verdict}`;
};

const AIJudge = () => {
  const [currentState, setCurrentState] = useState('initial');
  const [question, setQuestion] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [verdict, setVerdict] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const generateQuestion = async () => {
    setIsProcessing(true);
    setError('');
    try {
      const result = await model.generateContent(QUESTION_PROMPT);
      const response = await result.response;
      const questionText = response.text();
      if (!questionText.trim()) {
        throw new Error('Generated question was empty');
      }
      setQuestion(questionText);
      setCurrentState('answering');
    } catch (error) {
      console.error('Error generating question:', error);
      setError('Failed to generate question. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getAIAnswer = async () => {
    const result = await model.generateContent(`${AI_ANSWER_PROMPT}${question}`);
    const response = await result.response;
    const answerText = response.text();
    if (!answerText.trim()) {
      throw new Error('AI generated an empty response');
    }
    return answerText;
  };

  const getJudgement = async () => {
    const prompt = JUDGE_PROMPT
      .replace('{question}', question)
      .replace('{humanResponse}', userAnswer)
      .replace('{aiResponse}', aiAnswer);
      
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const judgementText = response.text();
    if (!judgementText.trim()) {
      throw new Error('Judge generated an empty response');
    }
    return judgementText;
  };

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim()) {
      setError('Please enter your answer before submitting.');
      return;
    }
    
    setIsProcessing(true);
    setError('');
    try {
      const aiResponseText = await getAIAnswer();
      setAiAnswer(aiResponseText);
      
      const judgement = await getJudgement();
      setVerdict(judgement);
      setCurrentState('complete');
    } catch (error) {
      console.error('Error in process:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const startNewTest = () => {
    setCurrentState('initial');
    setQuestion('');
    setUserAnswer('');
    setAiAnswer('');
    setVerdict('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-black text-emerald-400 p-4 font-mono">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl font-cursive mb-2 animate-glow">AI Judge Turing Test</h1>
          <p className="text-emerald-600 text-sm">
            Can AI distinguish between human and AI responses?
          </p>
        </header>

        <Card className="bg-black/40 border border-emerald-900/50 backdrop-blur-sm mb-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/10 to-black/30" />
          <CardContent className="relative z-10">
            {error && (
              <div className="bg-red-900/20 border border-red-900 text-red-400 p-4 rounded mb-4 text-sm">
                {error}
              </div>
            )}

            {currentState === 'initial' && (
              <div className="text-center p-6 animate-fade-in">
                <Button 
                  onClick={generateQuestion}
                  disabled={isProcessing}
                  className="bg-emerald-900/80 hover:bg-emerald-800/80 text-emerald-400 border border-emerald-700/50 transition-all duration-300 text-sm"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Generate Question
                </Button>
              </div>
            )}

            {currentState === 'answering' && (
              <div className="space-y-4 p-6 animate-slide-up">
                <div className="bg-black/60 rounded-lg p-4 mb-4 border border-emerald-900/30">
                  <h3 className="text-lg font-bold mb-2 text-emerald-300">Question:</h3>
                  <p className="text-sm">{question}</p>
                </div>
                <textarea
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  className="w-full bg-black/60 rounded p-2 min-h-[100px] border border-emerald-900/30 text-emerald-400 text-sm focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                  placeholder="Enter your answer..."
                  disabled={isProcessing}
                />
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={isProcessing}
                  className="bg-emerald-900/80 hover:bg-emerald-800/80 text-emerald-400 border border-emerald-700/50 transition-all duration-300 text-sm"
                >
                  {isProcessing ? 'Processing...' : 'Submit Answer'}
                </Button>
              </div>
            )}

            {currentState === 'complete' && (
              <div className="space-y-4 p-6 animate-fade-in">
                <div className="prose prose-invert max-w-none">
                  <style jsx global>{`
                    .prose h1 {
                      font-size: 2.5rem !important;
                      color: rgba(16, 185, 129, 0.9) !important;
                      margin-bottom: 2rem !important;
                      text-align: center;
                    }
                    .prose h2 {
                      font-size: 1.75rem !important;
                      color: rgba(16, 185, 129, 0.8) !important;
                      border-bottom: 1px solid rgba(16, 185, 129, 0.2);
                      padding-bottom: 0.5rem;
                      margin-top: 2rem !important;
                    }
                    .prose h3 {
                      font-size: 1.25rem !important;
                      color: rgba(16, 185, 129, 0.7) !important;
                      margin-top: 1.5rem !important;
                    }
                    .prose p {
                      font-size: 0.875rem !important;
                      line-height: 1.6 !important;
                      color: rgba(236, 253, 245, 0.8) !important;
                      margin-top: 0.75rem !important;
                      margin-bottom: 0.75rem !important;
                    }
                    .prose em {
                      color: rgba(16, 185, 129, 0.9) !important;
                      font-style: normal;
                      font-weight: 500;
                    }
                    .prose hr {
                      border-color: rgba(16, 185, 129, 0.2);
                      margin: 2rem 0;
                    }
                  `}</style>
                  <ReactMarkdown>
                    {formatOutput(question, userAnswer, aiAnswer, verdict)}
                  </ReactMarkdown>
                </div>
                <Button 
                  onClick={startNewTest}
                  className="bg-emerald-900/80 hover:bg-emerald-800/80 text-emerald-400 border border-emerald-700/50 transition-all duration-300 text-sm"
                >
                  Start New Test
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <style jsx global>{`
        @keyframes glow {
          0%, 100% { text-shadow: 0 0 5px rgba(16, 185, 129, 0.5); }
          50% { text-shadow: 0 0 20px rgba(16, 185, 129, 0.8); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }
        
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out;
        }
        
        .animate-slide-up {
          animation: slideUp 0.5s ease-out;
        }
        
        .font-cursive {
          font-family: 'Courier New', monospace;
        }
      `}</style>
    </div>
  );
};

export default AIJudge;