import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, XCircle, ChevronRight, Loader2, 
  AlertCircle, Trophy, Brain, Timer 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface CustomQuizData {
  question: string;
  options: string[];
  correct_answer: number;
}

interface GeneratedQuiz {
  title: string;
  description: string;
  passPercentage: number;
  timePerQuestion: number;
  questions: QuizQuestion[];
}

interface QuizVerificationProps {
  taskId: string;
  taskTitle?: string;
  taskCategory?: string;
  userLevel?: number;
  passPercentage?: number;
  customQuizData?: CustomQuizData[];
  onComplete: (passed: boolean, score: number) => void;
  onCancel: () => void;
}

// Comprehensive quiz library with unique content per category
const QUIZ_LIBRARY: Record<string, QuizQuestion[]> = {
  // GEOGRAPHY & WORLD KNOWLEDGE
  geography: [
    { id: "geo1", question: "What is the largest country by land area?", options: ["USA", "China", "Russia", "Canada"], correctAnswer: 2, explanation: "Russia is the largest country at 17.1 million km²." },
    { id: "geo2", question: "Which continent has the most countries?", options: ["Asia", "Africa", "Europe", "South America"], correctAnswer: 1, explanation: "Africa has 54 countries, the most of any continent." },
    { id: "geo3", question: "What is the longest river in Africa?", options: ["Congo", "Niger", "Nile", "Zambezi"], correctAnswer: 2, explanation: "The Nile is approximately 6,650 km long." },
    { id: "geo4", question: "Which ocean is the deepest?", options: ["Atlantic", "Pacific", "Indian", "Arctic"], correctAnswer: 1, explanation: "The Pacific Ocean contains the Mariana Trench, the deepest point on Earth." },
    { id: "geo5", question: "What is the capital of Australia?", options: ["Sydney", "Melbourne", "Canberra", "Brisbane"], correctAnswer: 2, explanation: "Canberra is the capital, though Sydney is the largest city." },
    { id: "geo6", question: "Which mountain range separates Europe from Asia?", options: ["Alps", "Himalayas", "Ural Mountains", "Andes"], correctAnswer: 2, explanation: "The Ural Mountains form the natural boundary between Europe and Asia." },
    { id: "geo7", question: "What is the smallest country in the world?", options: ["Monaco", "Vatican City", "San Marino", "Liechtenstein"], correctAnswer: 1, explanation: "Vatican City is 0.44 km², the smallest country." },
    { id: "geo8", question: "Which desert is the largest hot desert?", options: ["Gobi", "Kalahari", "Sahara", "Arabian"], correctAnswer: 2, explanation: "The Sahara Desert spans 9 million km²." },
  ],
  
  // AFRICAN HISTORY
  african_history: [
    { id: "ah1", question: "When did Zambia gain independence?", options: ["1960", "1964", "1970", "1980"], correctAnswer: 1, explanation: "Zambia gained independence from Britain on October 24, 1964." },
    { id: "ah2", question: "Who was Zambia's first president?", options: ["Chiluba", "Kaunda", "Mwanawasa", "Banda"], correctAnswer: 1, explanation: "Kenneth Kaunda was Zambia's founding president." },
    { id: "ah3", question: "What was Zambia called before independence?", options: ["Rhodesia", "Northern Rhodesia", "Nyasaland", "Bechuanaland"], correctAnswer: 1, explanation: "Zambia was known as Northern Rhodesia under British rule." },
    { id: "ah4", question: "The ancient kingdom of Mali was known for its wealth in which metal?", options: ["Silver", "Copper", "Gold", "Iron"], correctAnswer: 2, explanation: "Mali's gold mines made it one of the richest empires in history." },
    { id: "ah5", question: "Where did the Ancient Egyptian civilization develop?", options: ["Nile River", "Congo River", "Zambezi River", "Niger River"], correctAnswer: 0, explanation: "Ancient Egypt developed along the Nile River Valley." },
    { id: "ah6", question: "Nelson Mandela was imprisoned on which island?", options: ["Madagascar", "Robben Island", "Zanzibar", "Cape Verde"], correctAnswer: 1, explanation: "Mandela spent 18 years on Robben Island." },
  ],
  
  // SCIENCE & NATURE
  science: [
    { id: "sci1", question: "What planet is known as the Red Planet?", options: ["Venus", "Mars", "Jupiter", "Saturn"], correctAnswer: 1, explanation: "Mars appears red due to iron oxide on its surface." },
    { id: "sci2", question: "What is the chemical symbol for water?", options: ["WA", "H2O", "O2", "CO2"], correctAnswer: 1, explanation: "Water is H2O - two hydrogen atoms and one oxygen atom." },
    { id: "sci3", question: "How many bones are in the adult human body?", options: ["106", "156", "206", "256"], correctAnswer: 2, explanation: "Adults have 206 bones, babies are born with about 270." },
    { id: "sci4", question: "What gas do plants absorb from the atmosphere?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], correctAnswer: 2, explanation: "Plants absorb CO2 for photosynthesis." },
    { id: "sci5", question: "What is the closest star to Earth?", options: ["Proxima Centauri", "Alpha Centauri", "The Sun", "Sirius"], correctAnswer: 2, explanation: "The Sun is a star and the closest to Earth at 150 million km." },
    { id: "sci6", question: "What part of the cell contains DNA?", options: ["Cytoplasm", "Nucleus", "Cell Wall", "Mitochondria"], correctAnswer: 1, explanation: "The nucleus contains the cell's genetic material." },
    { id: "sci7", question: "What force keeps planets in orbit around the Sun?", options: ["Magnetism", "Friction", "Gravity", "Radiation"], correctAnswer: 2, explanation: "Gravity is the force that keeps planets in orbit." },
  ],
  
  // SPORTS
  sports: [
    { id: "sp1", question: "How many players are on a football (soccer) team on the field?", options: ["9", "10", "11", "12"], correctAnswer: 2, explanation: "Each team has 11 players on the field." },
    { id: "sp2", question: "Which country won the 2022 FIFA World Cup?", options: ["France", "Brazil", "Argentina", "Germany"], correctAnswer: 2, explanation: "Argentina won, defeating France in the final." },
    { id: "sp3", question: "In basketball, how many points is a shot from beyond the arc worth?", options: ["1", "2", "3", "4"], correctAnswer: 2, explanation: "Three-point shots are worth 3 points." },
    { id: "sp4", question: "The Olympics are held every how many years?", options: ["2", "3", "4", "5"], correctAnswer: 2, explanation: "The Summer and Winter Olympics each occur every 4 years." },
    { id: "sp5", question: "Which sport uses a shuttlecock?", options: ["Tennis", "Badminton", "Squash", "Table Tennis"], correctAnswer: 1, explanation: "Badminton uses a feathered shuttlecock." },
    { id: "sp6", question: "What is the national sport of Zambia?", options: ["Rugby", "Cricket", "Football", "Basketball"], correctAnswer: 2, explanation: "Football (soccer) is Zambia's national sport." },
  ],
  
  // TECHNOLOGY
  technology: [
    { id: "tech1", question: "What does 'www' stand for in a website address?", options: ["World Wide Web", "World Web Width", "Wide World Web", "Web World Wide"], correctAnswer: 0, explanation: "WWW stands for World Wide Web." },
    { id: "tech2", question: "Who is the founder of Facebook?", options: ["Bill Gates", "Mark Zuckerberg", "Steve Jobs", "Elon Musk"], correctAnswer: 1, explanation: "Mark Zuckerberg founded Facebook in 2004." },
    { id: "tech3", question: "What does 'CPU' stand for?", options: ["Central Process Unit", "Central Processing Unit", "Computer Power Unit", "Core Processing Unit"], correctAnswer: 1, explanation: "CPU is the Central Processing Unit, the brain of a computer." },
    { id: "tech4", question: "What year was the first iPhone released?", options: ["2005", "2006", "2007", "2008"], correctAnswer: 2, explanation: "Apple released the first iPhone in 2007." },
    { id: "tech5", question: "What is cryptocurrency stored in?", options: ["Banks", "Digital Wallets", "Post Office", "Government"], correctAnswer: 1, explanation: "Cryptocurrency is stored in digital wallets." },
    { id: "tech6", question: "What does 'AI' stand for?", options: ["Auto Intelligence", "Artificial Intelligence", "Advanced Internet", "Automatic Input"], correctAnswer: 1, explanation: "AI stands for Artificial Intelligence." },
  ],
  
  // FINANCIAL LITERACY
  financial: [
    { id: "fin1", question: "What is interest on a savings account?", options: ["A fee you pay", "Money the bank gives you for saving", "A type of tax", "Insurance cost"], correctAnswer: 1, explanation: "Interest is money earned on your savings." },
    { id: "fin2", question: "What is a budget?", options: ["A shopping list", "A plan for spending money", "A bank account", "A loan type"], correctAnswer: 1, explanation: "A budget is a plan for how to spend and save money." },
    { id: "fin3", question: "What does 'saving for a rainy day' mean?", options: ["Buying umbrellas", "Saving for emergencies", "Investing in weather apps", "Spending on holidays"], correctAnswer: 1, explanation: "It means saving money for unexpected expenses." },
    { id: "fin4", question: "What is inflation?", options: ["When money grows", "When prices increase over time", "A type of tax", "A bank service"], correctAnswer: 1, explanation: "Inflation is when prices rise and money buys less." },
    { id: "fin5", question: "What is a credit score?", options: ["Your age", "How much you earn", "A measure of creditworthiness", "Your bank balance"], correctAnswer: 2, explanation: "Credit score shows how reliable you are at repaying debt." },
    { id: "fin6", question: "Why is an emergency fund important?", options: ["For vacations", "For unexpected expenses", "For daily shopping", "For entertainment"], correctAnswer: 1, explanation: "Emergency funds cover unexpected costs like medical bills." },
  ],
  
  // ZAMBIAN CULTURE
  zambian: [
    { id: "zm1", question: "What is the national animal of Zambia?", options: ["Lion", "Elephant", "African Fish Eagle", "Zebra"], correctAnswer: 2, explanation: "The African Fish Eagle is Zambia's national animal." },
    { id: "zm2", question: "Victoria Falls is known locally as?", options: ["Mosi-oa-Tunya", "Great Falls", "Water Thunder", "Rainbow Falls"], correctAnswer: 0, explanation: "Mosi-oa-Tunya means 'The Smoke That Thunders'." },
    { id: "zm3", question: "How many provinces does Zambia have?", options: ["8", "9", "10", "12"], correctAnswer: 2, explanation: "Zambia has 10 provinces." },
    { id: "zm4", question: "What is Zambia's largest ethnic group?", options: ["Lozi", "Bemba", "Tonga", "Lunda"], correctAnswer: 1, explanation: "The Bemba people are the largest ethnic group." },
    { id: "zm5", question: "Which lake is the largest in Zambia?", options: ["Lake Malawi", "Lake Tanganyika", "Lake Bangweulu", "Lake Kariba"], correctAnswer: 3, explanation: "Lake Kariba is the largest man-made lake in the world by volume." },
    { id: "zm6", question: "What does the color green on Zambia's flag represent?", options: ["Forests", "Agriculture", "Natural resources", "Hope"], correctAnswer: 2, explanation: "Green represents Zambia's natural resources and vegetation." },
  ],
  
  // ANIMALS
  animals: [
    { id: "an1", question: "What is the fastest land animal?", options: ["Lion", "Cheetah", "Gazelle", "Horse"], correctAnswer: 1, explanation: "Cheetahs can reach speeds of 70 mph (112 km/h)." },
    { id: "an2", question: "What is a group of lions called?", options: ["Pack", "Herd", "Pride", "Flock"], correctAnswer: 2, explanation: "A group of lions is called a pride." },
    { id: "an3", question: "Which bird can fly backwards?", options: ["Eagle", "Hummingbird", "Parrot", "Owl"], correctAnswer: 1, explanation: "Hummingbirds are the only birds that can fly backwards." },
    { id: "an4", question: "What is the largest mammal?", options: ["Elephant", "Blue Whale", "Giraffe", "Hippo"], correctAnswer: 1, explanation: "Blue whales can grow up to 100 feet long." },
    { id: "an5", question: "How many legs does a spider have?", options: ["6", "8", "10", "12"], correctAnswer: 1, explanation: "Spiders are arachnids with 8 legs." },
    { id: "an6", question: "Which animal has the longest lifespan?", options: ["Elephant", "Whale", "Tortoise", "Parrot"], correctAnswer: 2, explanation: "Some tortoises live over 150 years." },
  ],
  
  // APP LEARNING
  learning: [
    { id: "lr1", question: "What is the best way to maximize your daily earnings?", options: ["Complete one task", "Build a streak", "Ignore bonuses", "Skip surveys"], correctAnswer: 1, explanation: "Maintaining a streak gives you bonus multipliers!" },
    { id: "lr2", question: "How many consecutive days makes a '7-day streak' milestone?", options: ["5 days", "7 days", "10 days", "14 days"], correctAnswer: 1, explanation: "7 days of consecutive activity earns you milestone bonus!" },
    { id: "lr3", question: "Which VIP tier offers the highest point multiplier?", options: ["Bronze", "Silver", "Gold", "Diamond"], correctAnswer: 3, explanation: "Diamond tier members get the best multipliers and perks!" },
    { id: "lr4", question: "What happens when you refer a friend successfully?", options: ["Nothing", "You both earn bonus points", "Only they earn", "Points are deducted"], correctAnswer: 1, explanation: "Both referrer and referred friend earn bonus points!" },
    { id: "lr5", question: "What's the minimum points needed to withdraw?", options: ["100 points", "500 points", "1000 points", "5000 points"], correctAnswer: 1, explanation: "You need at least 500 points to make a withdrawal." },
    { id: "lr6", question: "How can you earn more daily tasks?", options: ["Pay money", "Upgrade VIP tier", "Wait longer", "Ask support"], correctAnswer: 1, explanation: "Higher VIP tiers unlock more daily tasks." },
  ],
  
  // GENERAL KNOWLEDGE
  general: [
    { id: "gen1", question: "What is the capital city of Zambia?", options: ["Johannesburg", "Lusaka", "Nairobi", "Harare"], correctAnswer: 1, explanation: "Lusaka is the capital and largest city of Zambia." },
    { id: "gen2", question: "Which mobile money service is popular in Zambia?", options: ["PayPal", "Airtel Money", "Venmo", "Zelle"], correctAnswer: 1, explanation: "Airtel Money is widely used for mobile payments in Zambia." },
    { id: "gen3", question: "What currency is used in Zambia?", options: ["Dollar", "Rand", "Kwacha", "Shilling"], correctAnswer: 2, explanation: "The Zambian Kwacha (ZMW) is the official currency." },
    { id: "gen4", question: "How many days are in a leap year?", options: ["364", "365", "366", "367"], correctAnswer: 2, explanation: "Leap years have 366 days, with February having 29 days." },
    { id: "gen5", question: "What is the boiling point of water in Celsius?", options: ["50°C", "80°C", "100°C", "120°C"], correctAnswer: 2, explanation: "Water boils at 100°C at sea level." },
    { id: "gen6", question: "How many continents are there?", options: ["5", "6", "7", "8"], correctAnswer: 2, explanation: "There are 7 continents on Earth." },
  ],
  
  // ENTERTAINMENT & MUSIC
  entertainment: [
    { id: "ent1", question: "What streaming platform has the most subscribers globally?", options: ["Disney+", "Netflix", "Amazon Prime", "HBO Max"], correctAnswer: 1, explanation: "Netflix has the most streaming subscribers worldwide." },
    { id: "ent2", question: "Which artist has the most Spotify streams?", options: ["Drake", "Ed Sheeran", "The Weeknd", "Bad Bunny"], correctAnswer: 3, explanation: "Bad Bunny holds the record for most yearly streams." },
    { id: "ent3", question: "What year did TikTok launch internationally?", options: ["2015", "2016", "2017", "2018"], correctAnswer: 2, explanation: "TikTok launched internationally in 2017." },
    { id: "ent4", question: "Which social media platform has the most users?", options: ["TikTok", "Instagram", "Facebook", "Twitter"], correctAnswer: 2, explanation: "Facebook has over 2.9 billion monthly active users." },
    { id: "ent5", question: "What does 'going viral' mean online?", options: ["Getting sick", "Content spreading rapidly", "Posting daily", "Having followers"], correctAnswer: 1, explanation: "Viral content spreads rapidly across the internet." },
  ],
  
  // MATH & LOGIC
  math: [
    { id: "math1", question: "What is 15% of 200?", options: ["15", "25", "30", "35"], correctAnswer: 2, explanation: "15% of 200 = 0.15 × 200 = 30" },
    { id: "math2", question: "If you save K50 weekly, how much do you save in a year?", options: ["K2,400", "K2,600", "K2,800", "K3,000"], correctAnswer: 1, explanation: "K50 × 52 weeks = K2,600" },
    { id: "math3", question: "What is the next number: 2, 4, 8, 16, ?", options: ["24", "28", "32", "36"], correctAnswer: 2, explanation: "Each number doubles: 16 × 2 = 32" },
    { id: "math4", question: "A product costs K500. If it's 20% off, what's the sale price?", options: ["K350", "K400", "K450", "K480"], correctAnswer: 1, explanation: "20% of K500 = K100 discount. K500 - K100 = K400" },
    { id: "math5", question: "What is the area of a rectangle with length 5 and width 3?", options: ["8", "15", "16", "20"], correctAnswer: 1, explanation: "Area = length × width = 5 × 3 = 15" },
  ],
  
  // HEALTH & WELLNESS
  health: [
    { id: "hlt1", question: "How many glasses of water should you drink daily?", options: ["4-5", "6-8", "10-12", "14-16"], correctAnswer: 1, explanation: "6-8 glasses (about 2 liters) is recommended." },
    { id: "hlt2", question: "How many hours of sleep do adults need?", options: ["4-5", "6-7", "7-9", "10-12"], correctAnswer: 2, explanation: "Adults need 7-9 hours of quality sleep." },
    { id: "hlt3", question: "Which vitamin do we get from sunlight?", options: ["Vitamin A", "Vitamin B", "Vitamin C", "Vitamin D"], correctAnswer: 3, explanation: "Our skin produces Vitamin D when exposed to sunlight." },
    { id: "hlt4", question: "What is the main benefit of regular exercise?", options: ["Better sleep only", "Overall health improvement", "Just weight loss", "Muscle only"], correctAnswer: 1, explanation: "Exercise improves cardiovascular health, mental health, and more." },
    { id: "hlt5", question: "What food group provides the most protein?", options: ["Fruits", "Vegetables", "Meat & Beans", "Grains"], correctAnswer: 2, explanation: "Meat, fish, beans, and eggs are high in protein." },
  ],
};

// Map categories to quiz topics
const CATEGORY_TO_QUIZ: Record<string, string[]> = {
  trivia: ['geography', 'science', 'animals', 'entertainment', 'general'],
  quiz: ['geography', 'african_history', 'sports', 'technology', 'math'],
  learning: ['learning', 'financial', 'health', 'general'],
  challenge: ['math', 'science', 'technology', 'general'],
  survey: ['general', 'zambian', 'entertainment'],
  social: ['entertainment', 'general', 'zambian'],
  gaming: ['sports', 'entertainment', 'general'],
  lifestyle: ['health', 'financial', 'general'],
  video_ad: ['general', 'entertainment'],
  app_install: ['technology', 'general'],
  quick: ['general', 'learning'],
  general: ['general', 'zambian', 'geography', 'science'],
};

export function QuizVerification({
  taskId,
  taskTitle = "Knowledge Quiz",
  taskCategory = "general",
  userLevel = 1,
  passPercentage = 60,
  customQuizData,
  onComplete,
  onCancel,
}: QuizVerificationProps) {
  const [quiz, setQuiz] = useState<GeneratedQuiz | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isLoading, setIsLoading] = useState(true);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [score, setScore] = useState(0);

  // Convert custom quiz data to the internal format
  const convertCustomQuizData = (data: CustomQuizData[]): GeneratedQuiz => {
    const questions: QuizQuestion[] = data.map((q, index) => ({
      id: `custom_${index}`,
      question: q.question,
      options: q.options,
      correctAnswer: q.correct_answer,
    }));

    return {
      title: taskTitle,
      description: `Score ${passPercentage}% or higher to pass.`,
      passPercentage,
      timePerQuestion: 30,
      questions,
    };
  };

  // Generate quiz on mount
  useEffect(() => {
    const loadQuiz = async () => {
      // If custom quiz data is provided, use it directly
      if (customQuizData && customQuizData.length > 0) {
        setQuiz(convertCustomQuizData(customQuizData));
        setTimeLeft(30);
        setIsLoading(false);
        return;
      }

      try {
        // Try AI service first
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-service`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              action: 'generate_quiz',
              data: {
                topic: taskTitle,
                category: taskCategory,
                difficulty: userLevel <= 3 ? 'easy' : userLevel <= 7 ? 'medium' : 'hard',
                questionCount: 5,
                passPercentage,
              }
            })
          }
        );

        const result = await response.json();
        
        if (result.success && result.data?.questions?.length > 0) {
          setQuiz(result.data);
          setTimeLeft(result.data.timePerQuestion || 30);
        } else {
          setQuiz(generateLocalQuiz(taskTitle, taskCategory, passPercentage));
        }
      } catch (err) {
        console.error('Quiz generation error:', err);
        setQuiz(generateLocalQuiz(taskTitle, taskCategory, passPercentage));
      } finally {
        setIsLoading(false);
      }
    };

    loadQuiz();
  }, [taskTitle, taskCategory, userLevel, passPercentage, customQuizData]);

  // Timer countdown
  useEffect(() => {
    if (!quiz || quizCompleted || showResult) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleNext();
          return quiz.timePerQuestion || 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quiz, currentQuestion, quizCompleted, showResult]);

  const generateLocalQuiz = (title: string, category: string, passPercent: number): GeneratedQuiz => {
    // Get appropriate quiz topics for this category
    const topics = CATEGORY_TO_QUIZ[category] || CATEGORY_TO_QUIZ.general;
    const selectedTopic = topics[Math.floor(Math.random() * topics.length)];
    const questions = QUIZ_LIBRARY[selectedTopic] || QUIZ_LIBRARY.general;
    
    // Shuffle and pick 5 questions
    const shuffled = [...questions].sort(() => Math.random() - 0.5).slice(0, 5);
    
    return {
      title: title || "Quick Knowledge Quiz",
      description: `Test your knowledge! Score ${passPercent}% or higher to pass.`,
      passPercentage: passPercent,
      timePerQuestion: 30,
      questions: shuffled,
    };
  };

  const handleAnswerSelect = (index: number) => {
    setSelectedAnswer(index);
  };

  const handleNext = () => {
    if (!quiz) return;

    if (selectedAnswer !== null) {
      setAnswers(prev => ({ ...prev, [currentQuestion]: selectedAnswer }));
    }

    setShowResult(true);
    
    setTimeout(() => {
      setShowResult(false);
      setSelectedAnswer(null);
      
      if (currentQuestion < quiz.questions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        setTimeLeft(quiz.timePerQuestion || 30);
      } else {
        calculateAndFinish();
      }
    }, 1500);
  };

  const calculateAndFinish = () => {
    if (!quiz) return;

    let correct = 0;
    quiz.questions.forEach((q, index) => {
      const userAnswer = index === currentQuestion ? selectedAnswer : answers[index];
      if (userAnswer === q.correctAnswer) {
        correct++;
      }
    });

    const percentage = Math.round((correct / quiz.questions.length) * 100);
    setScore(percentage);
    setQuizCompleted(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 py-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Brain className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <h3 className="text-lg font-semibold">Generating Your Quiz...</h3>
          <p className="text-sm text-muted-foreground">
            AI is creating questions just for you
          </p>
          <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <p className="text-muted-foreground">Failed to load quiz</p>
        <Button variant="outline" onClick={onCancel} className="mt-4">Go Back</Button>
      </div>
    );
  }

  // Show final results
  if (quizCompleted) {
    const passed = score >= quiz.passPercentage;
    
    return (
      <div className="space-y-6 py-4">
        <div className="text-center space-y-4">
          <div className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center mx-auto",
            passed ? "bg-primary/10" : "bg-destructive/10"
          )}>
            {passed ? (
              <Trophy className="w-10 h-10 text-primary" />
            ) : (
              <XCircle className="w-10 h-10 text-destructive" />
            )}
          </div>
          
          <div>
            <h3 className={cn(
              "text-2xl font-bold",
              passed ? "text-primary" : "text-destructive"
            )}>
              {passed ? "Congratulations!" : "Keep Trying!"}
            </h3>
            <p className="text-muted-foreground mt-1">
              You scored {score}%
            </p>
          </div>

          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Your Score</span>
              <span className="font-bold">{score}%</span>
            </div>
            <Progress value={score} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>Pass: {quiz.passPercentage}%</span>
              <span className={passed ? "text-primary" : "text-destructive"}>
                {passed ? "PASSED" : "FAILED"}
              </span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {passed 
              ? "Great job! You've demonstrated your knowledge and earned points!" 
              : `You need ${quiz.passPercentage}% to pass. Try again later!`}
          </p>
        </div>

        <Button 
          className="w-full" 
          onClick={() => onComplete(passed, score)}
        >
          {passed ? "Claim Points" : "Close"}
        </Button>
      </div>
    );
  }

  const question = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto">
          <Brain className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">{quiz.title}</h3>
        <p className="text-sm text-muted-foreground">
          Pass with {quiz.passPercentage}% or higher
        </p>
      </div>

      {/* Timer & Progress */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            Question {currentQuestion + 1} of {quiz.questions.length}
          </span>
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium",
            timeLeft <= 10 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
          )}>
            <Timer className="w-4 h-4" />
            {timeLeft}s
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question */}
      <Card className="p-4 bg-muted/30">
        <p className="font-medium text-center mb-4">{question.question}</p>

        <RadioGroup
          value={selectedAnswer?.toString() || ""}
          className="space-y-2"
        >
          {question.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrectOption = index === question.correctAnswer;
            
            return (
              <div
                key={index}
                className={cn(
                  "flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer",
                  showResult && isCorrectOption && "border-primary bg-primary/10",
                  showResult && isSelected && !isCorrectOption && "border-destructive bg-destructive/10",
                  !showResult && isSelected && "border-primary bg-primary/5",
                  !showResult && !isSelected && "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
                onClick={() => !showResult && handleAnswerSelect(index)}
              >
                <RadioGroupItem 
                  value={index.toString()} 
                  id={`opt-${index}`}
                  checked={isSelected}
                  disabled={showResult}
                />
                <Label 
                  htmlFor={`opt-${index}`} 
                  className="flex-1 cursor-pointer flex items-center justify-between"
                >
                  <span>{option}</span>
                  {showResult && isCorrectOption && (
                    <CheckCircle className="w-5 h-5 text-primary" />
                  )}
                  {showResult && isSelected && !isCorrectOption && (
                    <XCircle className="w-5 h-5 text-destructive" />
                  )}
                </Label>
              </div>
            );
          })}
        </RadioGroup>

        {showResult && question.explanation && (
          <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Explanation: </span>
              {question.explanation}
            </p>
          </div>
        )}
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={showResult}
        >
          Cancel
        </Button>
        <Button
          onClick={handleNext}
          disabled={selectedAnswer === null || showResult}
          className="flex-1"
        >
          {currentQuestion === quiz.questions.length - 1 ? "Finish" : "Next"}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
