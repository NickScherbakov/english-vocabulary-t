import { useState, useEffect, useCallback, useRef } from 'react'
import { useKV } from '@github/spark/hooks'
import { motion, AnimatePresence } from 'framer-motion'
import { CaretLeft, CaretRight, ArrowCounterClockwise, SpeakerHigh, Check, X, ChartBar, Pause, Play, Gauge, Palette } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toast } from 'sonner'

const WORD_LIST_URL = 'https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-usa-no-swears.txt'

interface TranslationCache {
  [key: string]: string
}

interface DefinitionCache {
  [key: string]: string
}

interface RussianDefinitionCache {
  [key: string]: string
}

interface LearnedWords {
  [key: string]: boolean
}

function App() {
  const [words, setWords] = useKV<string[]>('english-words', [])
  const [currentIndex, setCurrentIndex] = useKV<number>('current-index', 0)
  const [translationCache, setTranslationCache] = useKV<TranslationCache>('translation-cache', {})
  const [definitionCache, setDefinitionCache] = useKV<DefinitionCache>('definition-cache', {})
  const [russianDefinitionCache, setRussianDefinitionCache] = useKV<RussianDefinitionCache>('russian-definition-cache', {})
  const [learnedWords, setLearnedWords] = useKV<LearnedWords>('learned-words', {})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCompletion, setShowCompletion] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [direction, setDirection] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)
  const [currentTranslation, setCurrentTranslation] = useState<string>('')
  const [currentDefinition, setCurrentDefinition] = useState<string>('')
  const [currentRussianDefinition, setCurrentRussianDefinition] = useState<string>('')
  const [isTranslating, setIsTranslating] = useState(false)
  const [isLoadingDefinition, setIsLoadingDefinition] = useState(false)
  const [isLoadingRussianDefinition, setIsLoadingRussianDefinition] = useState(false)
  const [isAlternating, setIsAlternating] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [showRussianDefinition, setShowRussianDefinition] = useState(false)
  const [definitionWordStates, setDefinitionWordStates] = useState<boolean[]>([])
  const [transformationsPerMinute, setTransformationsPerMinute] = useKV<number>('transformations-per-minute', 20)
  const [definitionTransformationsPerMinute, setDefinitionTransformationsPerMinute] = useKV<number>('definition-transformations-per-minute', 30)
  const [showSpeedControl, setShowSpeedControl] = useState(false)
  const [showDefinitionSpeedControl, setShowDefinitionSpeedControl] = useState(false)
  const [showColorControl, setShowColorControl] = useState(false)
  const [englishWordColor, setEnglishWordColor] = useKV<string>('english-word-color', 'oklch(0.98 0 0)')
  const [russianWordColor, setRussianWordColor] = useKV<string>('russian-word-color', 'oklch(0.70 0.20 350)')
  const [englishDefinitionColor, setEnglishDefinitionColor] = useKV<string>('english-definition-color', 'oklch(0.65 0.05 280)')
  const [russianDefinitionColor, setRussianDefinitionColor] = useKV<string>('russian-definition-color', 'oklch(0.70 0.20 350)')
  const speechSynthRef = useRef<SpeechSynthesis | null>(null)
  const alternationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const intervalDecreaseRef = useRef<NodeJS.Timeout | null>(null)
  const definitionAlternationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const definitionIntervalDecreaseRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthRef.current = window.speechSynthesis
    }
  }, [])

  const speakWord = useCallback((word: string) => {
    if (!speechSynthRef.current) {
      toast.error('Speech synthesis not supported in this browser')
      return
    }

    speechSynthRef.current.cancel()

    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = 'en-US'
    utterance.rate = 0.85
    utterance.pitch = 1.0
    utterance.volume = 1.0

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => {
      setIsSpeaking(false)
      toast.error('Unable to pronounce word')
    }

    speechSynthRef.current.speak(utterance)
  }, [])

  useEffect(() => {
    const fetchWords = async () => {
      const wordList = words || []
      if (wordList.length > 0) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(WORD_LIST_URL)
        if (!response.ok) throw new Error('Failed to fetch words')
        
        const text = await response.text()
        const fetchedWords = text
          .split('\n')
          .map(w => w.trim())
          .filter(w => w.length > 0)
          .slice(0, 3000)

        if (fetchedWords.length === 0) throw new Error('No words found')

        setWords(fetchedWords)
        toast.success(`Loaded ${fetchedWords.length} words!`)
      } catch (err) {
        setError('Unable to load words. Please check your connection.')
        toast.error('Failed to load word list')
      } finally {
        setIsLoading(false)
      }
    }

    fetchWords()
  }, [words, setWords])

  const getTranslation = useCallback(async (word: string): Promise<string> => {
    const cache = translationCache || {}
    if (cache[word]) {
      return cache[word]
    }

    try {
      const promptText = `Translate the English word "${word}" to Russian. Return ONLY the Russian translation word(s), nothing else. No explanations, no additional text.`
      const translation = await window.spark.llm(promptText, 'gpt-4o-mini')
      const cleanTranslation = translation.trim()
      
      setTranslationCache((current = {}) => ({
        ...current,
        [word]: cleanTranslation
      }))
      
      return cleanTranslation
    } catch (err) {
      console.error('Translation error:', err)
      return 'ошибка перевода'
    }
  }, [translationCache, setTranslationCache])

  const getDefinition = useCallback(async (word: string): Promise<string> => {
    const cache = definitionCache || {}
    if (cache[word]) {
      return cache[word]
    }

    try {
      const promptText = `Provide a concise English definition for the word "${word}". Return ONLY the definition in 1-2 sentences, suitable for English learners. No additional text.`
      const definition = await window.spark.llm(promptText, 'gpt-4o-mini')
      const cleanDefinition = definition.trim()
      
      setDefinitionCache((current = {}) => ({
        ...current,
        [word]: cleanDefinition
      }))
      
      return cleanDefinition
    } catch (err) {
      console.error('Definition error:', err)
      return 'Definition unavailable'
    }
  }, [definitionCache, setDefinitionCache])

  const getRussianDefinition = useCallback(async (word: string): Promise<string> => {
    const cache = russianDefinitionCache || {}
    if (cache[word]) {
      return cache[word]
    }

    try {
      const promptText = `Provide a concise Russian definition for the English word "${word}". Return ONLY the Russian definition in 1-2 sentences. No additional text, no English.`
      const russianDefinition = await window.spark.llm(promptText, 'gpt-4o-mini')
      const cleanRussianDefinition = russianDefinition.trim()
      
      setRussianDefinitionCache((current = {}) => ({
        ...current,
        [word]: cleanRussianDefinition
      }))
      
      return cleanRussianDefinition
    } catch (err) {
      console.error('Russian definition error:', err)
      return 'Определение недоступно'
    }
  }, [russianDefinitionCache, setRussianDefinitionCache])

  useEffect(() => {
    const wordList = words || []
    const index = currentIndex || 0
    const word = wordList[index]
    
    if (word && !isLoading && !error) {
      setShowTranslation(false)
      setShowRussianDefinition(false)
      setDefinitionWordStates([])
      setCurrentTranslation('')
      setCurrentDefinition('')
      setCurrentRussianDefinition('')
      setIsAlternating(true)
      setIsPaused(false)
      
      if (alternationTimerRef.current) {
        clearTimeout(alternationTimerRef.current)
      }
      if (intervalDecreaseRef.current) {
        clearInterval(intervalDecreaseRef.current)
      }
      if (definitionAlternationTimerRef.current) {
        clearTimeout(definitionAlternationTimerRef.current)
      }
      if (definitionIntervalDecreaseRef.current) {
        clearInterval(definitionIntervalDecreaseRef.current)
      }
      
      const timer = setTimeout(() => {
        speakWord(word)
      }, 400)
      
      const translationTimer = setTimeout(async () => {
        setIsTranslating(true)
        const translation = await getTranslation(word)
        setCurrentTranslation(translation)
        setIsTranslating(false)
      }, 800)

      const definitionTimer = setTimeout(async () => {
        setIsLoadingDefinition(true)
        const definition = await getDefinition(word)
        setCurrentDefinition(definition)
        setIsLoadingDefinition(false)
      }, 1200)

      const russianDefinitionTimer = setTimeout(async () => {
        setIsLoadingRussianDefinition(true)
        const russianDefinition = await getRussianDefinition(word)
        setCurrentRussianDefinition(russianDefinition)
        setIsLoadingRussianDefinition(false)
      }, 1600)
      
      return () => {
        clearTimeout(timer)
        clearTimeout(translationTimer)
        clearTimeout(definitionTimer)
        clearTimeout(russianDefinitionTimer)
        if (alternationTimerRef.current) {
          clearTimeout(alternationTimerRef.current)
        }
        if (intervalDecreaseRef.current) {
          clearInterval(intervalDecreaseRef.current)
        }
        if (definitionAlternationTimerRef.current) {
          clearTimeout(definitionAlternationTimerRef.current)
        }
        if (definitionIntervalDecreaseRef.current) {
          clearInterval(definitionIntervalDecreaseRef.current)
        }
      }
    }
  }, [currentIndex, words, isLoading, error, speakWord, getTranslation, getDefinition, getRussianDefinition])

  useEffect(() => {
    if (!currentTranslation || !isAlternating || isPaused) return

    const transformsPerMin = transformationsPerMinute || 20
    const intervalMs = (60 * 1000) / transformsPerMin

    const startAlternation = () => {
      alternationTimerRef.current = setTimeout(() => {
        setShowTranslation(prev => !prev)
        startAlternation()
      }, intervalMs)
    }

    startAlternation()

    return () => {
      if (alternationTimerRef.current) {
        clearTimeout(alternationTimerRef.current)
      }
    }
  }, [currentTranslation, isAlternating, isPaused, transformationsPerMinute])

  useEffect(() => {
    if (!currentRussianDefinition || !currentDefinition || !isAlternating || isPaused) return

    const englishWords = currentDefinition.split(' ')
    const russianWords = currentRussianDefinition.split(' ')
    const maxWords = Math.max(englishWords.length, russianWords.length)
    
    setDefinitionWordStates(new Array(maxWords).fill(false))

    const defTransformsPerMin = definitionTransformationsPerMinute || 30
    const wordIntervalMs = (60 * 1000) / defTransformsPerMin

    let currentWordIndex = 0

    const startDefinitionAlternation = () => {
      if (currentWordIndex >= maxWords) {
        currentWordIndex = 0
        setDefinitionWordStates(new Array(maxWords).fill(false))
      }

      definitionAlternationTimerRef.current = setTimeout(() => {
        setDefinitionWordStates(prev => {
          const newStates = [...prev]
          newStates[currentWordIndex] = true
          return newStates
        })
        currentWordIndex++
        startDefinitionAlternation()
      }, wordIntervalMs)
    }

    const mainTransformsPerMin = transformationsPerMinute || 20
    const initialDelayMs = (60 * 1000) / mainTransformsPerMin

    const initialDelay = setTimeout(() => {
      startDefinitionAlternation()
    }, initialDelayMs)

    return () => {
      clearTimeout(initialDelay)
      if (definitionAlternationTimerRef.current) {
        clearTimeout(definitionAlternationTimerRef.current)
      }
    }
  }, [currentRussianDefinition, currentDefinition, isAlternating, isPaused, transformationsPerMinute, definitionTransformationsPerMinute])

  const stopAlternation = useCallback(() => {
    setIsAlternating(false)
    setIsPaused(true)
    if (alternationTimerRef.current) {
      clearTimeout(alternationTimerRef.current)
    }
    if (intervalDecreaseRef.current) {
      clearInterval(intervalDecreaseRef.current)
    }
    if (definitionAlternationTimerRef.current) {
      clearTimeout(definitionAlternationTimerRef.current)
    }
    if (definitionIntervalDecreaseRef.current) {
      clearInterval(definitionIntervalDecreaseRef.current)
    }
  }, [])

  const togglePause = useCallback(() => {
    setIsPaused(prev => {
      const newPaused = !prev
      if (newPaused) {
        if (alternationTimerRef.current) {
          clearTimeout(alternationTimerRef.current)
        }
        if (intervalDecreaseRef.current) {
          clearInterval(intervalDecreaseRef.current)
        }
        if (definitionAlternationTimerRef.current) {
          clearTimeout(definitionAlternationTimerRef.current)
        }
        if (definitionIntervalDecreaseRef.current) {
          clearInterval(definitionIntervalDecreaseRef.current)
        }
        toast('Paused')
      } else {
        toast('Resumed')
      }
      return newPaused
    })
  }, [])

  const goToNext = useCallback(() => {
    stopAlternation()
    const wordList = words || []
    setShowTranslation(false)
    setCurrentIndex((current = 0) => {
      const next = current + 1
      if (next >= wordList.length) {
        setShowCompletion(true)
        return current
      }
      setDirection(1)
      return next
    })
  }, [words, setCurrentIndex, stopAlternation])

  const goToPrevious = useCallback(() => {
    stopAlternation()
    setShowTranslation(false)
    setCurrentIndex((current = 0) => {
      const prev = Math.max(0, current - 1)
      setDirection(-1)
      return prev
    })
  }, [setCurrentIndex, stopAlternation])

  const markAsLearned = useCallback((word: string, learned: boolean) => {
    stopAlternation()
    setLearnedWords((current = {}) => ({
      ...current,
      [word]: learned
    }))
    
    if (learned) {
      toast.success('Word marked as learned! 🎉')
      setTimeout(() => goToNext(), 600)
    } else {
      toast('Marked for review')
    }
  }, [setLearnedWords, goToNext, stopAlternation])

  const restart = useCallback(() => {
    stopAlternation()
    setShowTranslation(false)
    setCurrentIndex(0)
    setShowCompletion(false)
    setDirection(-1)
  }, [setCurrentIndex, stopAlternation])

  const wordList = words || []
  const index = currentIndex || 0
  const currentWord = wordList[index] || ''
  const progress = wordList.length > 0 ? ((index + 1) / wordList.length) * 100 : 0
  
  const learned = learnedWords || {}
  const learnedCount = Object.values(learned).filter(Boolean).length
  const reviewCount = Object.values(learned).filter(v => v === false).length
  const isCurrentWordLearned = learned[currentWord] === true
  const isCurrentWordMarked = learned[currentWord] === false

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        goToNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goToPrevious()
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault()
        markAsLearned(currentWord, true)
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        markAsLearned(currentWord, false)
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault()
        togglePause()
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        setShowSpeedControl(prev => !prev)
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault()
        setShowDefinitionSpeedControl(prev => !prev)
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault()
        setShowColorControl(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [goToNext, goToPrevious, markAsLearned, currentWord, togglePause])

  if (isLoading) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">Loading words...</p>
        </motion.div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center p-4">
        <Card className="p-8 max-w-md bg-card/80 backdrop-blur-xl border-border/50">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2 text-destructive">Connection Error</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => window.location.reload()} className="bg-primary hover:bg-primary/90">
              Try Again
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen mesh-gradient flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-sm tracking-wider bg-card/80 backdrop-blur-sm border-border/50">
              Word {index + 1} of {wordList.length}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowStats(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChartBar className="mr-2" weight="bold" />
              Stats
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={restart}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowCounterClockwise className="mr-2" weight="bold" />
            Restart
          </Button>
        </div>

        <Progress 
          value={progress} 
          className="h-2 bg-muted/30"
        />

        <div className="relative">
          <Card className="relative overflow-hidden bg-card/60 backdrop-blur-2xl border-border/50 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
            
            <div className="relative p-12 md:p-20 min-h-[400px] flex items-center justify-center">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={index}
                  custom={direction}
                  initial={{ 
                    opacity: 0, 
                    x: direction > 0 ? 100 : -100,
                    rotateY: direction > 0 ? 20 : -20 
                  }}
                  animate={{ 
                    opacity: 1, 
                    x: 0,
                    rotateY: 0 
                  }}
                  exit={{ 
                    opacity: 0, 
                    x: direction > 0 ? -100 : 100,
                    rotateY: direction > 0 ? -20 : 20 
                  }}
                  transition={{ 
                    duration: 0.3,
                    ease: [0.4, 0, 0.2, 1]
                  }}
                  className="text-center space-y-8 w-full"
                >
                  <div className="relative min-h-[200px] flex items-center justify-center">
                    <motion.h1 
                      className="font-heading text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight absolute"
                      style={{ color: englishWordColor }}
                      animate={{
                        opacity: showTranslation ? 0 : 1,
                        y: showTranslation ? -20 : 0,
                        filter: showTranslation ? 'blur(10px)' : 'blur(0px)'
                      }}
                      transition={{
                        duration: 0.8,
                        ease: [0.4, 0, 0.2, 1]
                      }}
                    >
                      {currentWord}
                    </motion.h1>
                    
                    <motion.h1 
                      className="font-heading text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight absolute"
                      style={{ color: russianWordColor }}
                      animate={{
                        opacity: showTranslation ? 1 : 0,
                        y: showTranslation ? 0 : 20,
                        filter: showTranslation ? 'blur(0px)' : 'blur(10px)'
                      }}
                      transition={{
                        duration: 0.8,
                        ease: [0.4, 0, 0.2, 1]
                      }}
                    >
                      {currentTranslation}
                    </motion.h1>
                  </div>
                  
                  <Button
                    onClick={() => speakWord(currentWord)}
                    variant="ghost"
                    size="lg"
                    className="group text-secondary hover:text-secondary/80 transition-all hover:scale-110 active:scale-95"
                    disabled={isSpeaking}
                  >
                    <motion.div
                      animate={isSpeaking ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                      transition={{ duration: 0.5, repeat: isSpeaking ? Infinity : 0 }}
                    >
                      <SpeakerHigh weight="fill" className="text-3xl" />
                    </motion.div>
                  </Button>

                  <Button
                    onClick={togglePause}
                    variant="ghost"
                    size="lg"
                    className="group text-accent hover:text-accent/80 transition-all hover:scale-110 active:scale-95 ml-4"
                  >
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {isPaused ? (
                        <Play weight="fill" className="text-3xl" />
                      ) : (
                        <Pause weight="fill" className="text-3xl" />
                      )}
                    </motion.div>
                  </Button>

                  <Popover open={showSpeedControl} onOpenChange={setShowSpeedControl}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="lg"
                        className="group text-primary hover:text-primary/80 transition-all hover:scale-110 active:scale-95 ml-4 relative"
                      >
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Gauge weight="fill" className="text-3xl" />
                        </motion.div>
                        {transformationsPerMinute !== 20 && (
                          <Badge 
                            variant="secondary" 
                            className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs bg-secondary text-secondary-foreground"
                          >
                            {transformationsPerMinute}/м
                          </Badge>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 bg-card/95 backdrop-blur-xl border-border/50" align="center">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-heading font-semibold text-lg">Скорость слов</h4>
                            <Badge variant="outline" className="font-mono">
                              {transformationsPerMinute}/мин
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Частота трансформации основной секции
                          </p>
                        </div>
                        <div className="space-y-3">
                          <Slider
                            value={[transformationsPerMinute || 20]}
                            onValueChange={(value) => {
                              const newSpeed = value[0]
                              setTransformationsPerMinute(newSpeed)
                              toast.success(`Скорость слов: ${newSpeed} трансформаций/мин`)
                            }}
                            min={5}
                            max={120}
                            step={5}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>5/мин</span>
                            <span>30/мин</span>
                            <span>60/мин</span>
                            <span>90/мин</span>
                            <span>120/мин</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              setTransformationsPerMinute(20)
                              toast.success('Скорость сброшена: 20/мин')
                            }}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            Сбросить
                          </Button>
                          <Button
                            onClick={() => setShowSpeedControl(false)}
                            size="sm"
                            className="flex-1 bg-primary hover:bg-primary/90"
                          >
                            Готово
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Popover open={showDefinitionSpeedControl} onOpenChange={setShowDefinitionSpeedControl}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="lg"
                        className="group text-accent hover:text-accent/80 transition-all hover:scale-110 active:scale-95 ml-4 relative"
                      >
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Gauge weight="fill" className="text-3xl" />
                        </motion.div>
                        {definitionTransformationsPerMinute !== 30 && (
                          <Badge 
                            variant="secondary" 
                            className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs bg-accent/90 text-accent-foreground"
                          >
                            {definitionTransformationsPerMinute}/м
                          </Badge>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 bg-card/95 backdrop-blur-xl border-border/50" align="center">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-heading font-semibold text-lg">Скорость толкований</h4>
                            <Badge variant="outline" className="font-mono">
                              {definitionTransformationsPerMinute}/мин
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Частота трансформации слов в толковании
                          </p>
                        </div>
                        <div className="space-y-3">
                          <Slider
                            value={[definitionTransformationsPerMinute || 30]}
                            onValueChange={(value) => {
                              const newSpeed = value[0]
                              setDefinitionTransformationsPerMinute(newSpeed)
                              toast.success(`Скорость толкований: ${newSpeed} трансформаций/мин`)
                            }}
                            min={5}
                            max={120}
                            step={5}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>5/мин</span>
                            <span>30/мин</span>
                            <span>60/мин</span>
                            <span>90/мин</span>
                            <span>120/мин</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              setDefinitionTransformationsPerMinute(30)
                              toast.success('Скорость сброшена: 30/мин')
                            }}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            Сбросить
                          </Button>
                          <Button
                            onClick={() => setShowDefinitionSpeedControl(false)}
                            size="sm"
                            className="flex-1 bg-primary hover:bg-primary/90"
                          >
                            Готово
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Popover open={showColorControl} onOpenChange={setShowColorControl}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="lg"
                        className="group text-foreground hover:text-foreground/80 transition-all hover:scale-110 active:scale-95 ml-4 relative"
                      >
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Palette weight="fill" className="text-3xl" />
                        </motion.div>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-96 max-h-[80vh] overflow-y-auto bg-card/95 backdrop-blur-xl border-border/50" align="center">
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <h4 className="font-heading font-semibold text-lg">Настройка цветов</h4>
                          <p className="text-sm text-muted-foreground">
                            Выберите цвета для слов и толкований
                          </p>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-3">
                            <label className="text-sm font-medium">Цвет английского слова</label>
                            <div className="grid grid-cols-4 gap-2">
                              {[
                                { name: 'Белый', color: 'oklch(0.98 0 0)' },
                                { name: 'Голубой', color: 'oklch(0.75 0.15 195)' },
                                { name: 'Фиолетовый', color: 'oklch(0.60 0.20 285)' },
                                { name: 'Зелёный', color: 'oklch(0.70 0.18 145)' },
                                { name: 'Жёлтый', color: 'oklch(0.85 0.18 95)' },
                                { name: 'Оранжевый', color: 'oklch(0.75 0.18 50)' },
                                { name: 'Розовый', color: 'oklch(0.75 0.20 350)' },
                                { name: 'Серебро', color: 'oklch(0.80 0.02 270)' },
                              ].map((preset) => (
                                <button
                                  key={preset.name}
                                  onClick={() => {
                                    setEnglishWordColor(preset.color)
                                    toast.success(`Английский: ${preset.name}`)
                                  }}
                                  className="group relative h-12 rounded-lg border-2 transition-all hover:scale-110 active:scale-95"
                                  style={{ 
                                    backgroundColor: preset.color,
                                    borderColor: englishWordColor === preset.color ? 'oklch(0.75 0.15 195)' : 'oklch(0.30 0.08 280)'
                                  }}
                                  title={preset.name}
                                >
                                  {englishWordColor === preset.color && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <Check weight="bold" className="text-background" />
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <label className="text-sm font-medium">Цвет русского слова</label>
                            <div className="grid grid-cols-4 gap-2">
                              {[
                                { name: 'Розовый', color: 'oklch(0.70 0.20 350)' },
                                { name: 'Красный', color: 'oklch(0.65 0.25 25)' },
                                { name: 'Голубой', color: 'oklch(0.75 0.15 195)' },
                                { name: 'Бирюзовый', color: 'oklch(0.70 0.15 195)' },
                                { name: 'Зелёный', color: 'oklch(0.70 0.18 145)' },
                                { name: 'Лимонный', color: 'oklch(0.85 0.18 105)' },
                                { name: 'Янтарный', color: 'oklch(0.70 0.18 65)' },
                                { name: 'Пурпурный', color: 'oklch(0.65 0.22 320)' },
                              ].map((preset) => (
                                <button
                                  key={preset.name}
                                  onClick={() => {
                                    setRussianWordColor(preset.color)
                                    toast.success(`Русский: ${preset.name}`)
                                  }}
                                  className="group relative h-12 rounded-lg border-2 transition-all hover:scale-110 active:scale-95"
                                  style={{ 
                                    backgroundColor: preset.color,
                                    borderColor: russianWordColor === preset.color ? 'oklch(0.75 0.15 195)' : 'oklch(0.30 0.08 280)'
                                  }}
                                  title={preset.name}
                                >
                                  {russianWordColor === preset.color && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <Check weight="bold" className="text-background" />
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="border-t border-border/50 pt-4 space-y-4">
                            <div className="space-y-3">
                              <label className="text-sm font-medium">Цвет английского толкования</label>
                              <div className="grid grid-cols-4 gap-2">
                                {[
                                  { name: 'Серый', color: 'oklch(0.65 0.05 280)' },
                                  { name: 'Белый', color: 'oklch(0.98 0 0)' },
                                  { name: 'Голубой', color: 'oklch(0.75 0.15 195)' },
                                  { name: 'Фиолетовый', color: 'oklch(0.60 0.20 285)' },
                                  { name: 'Зелёный', color: 'oklch(0.70 0.18 145)' },
                                  { name: 'Жёлтый', color: 'oklch(0.85 0.18 95)' },
                                  { name: 'Оранжевый', color: 'oklch(0.75 0.18 50)' },
                                  { name: 'Серебро', color: 'oklch(0.80 0.02 270)' },
                                ].map((preset) => (
                                  <button
                                    key={preset.name}
                                    onClick={() => {
                                      setEnglishDefinitionColor(preset.color)
                                      toast.success(`Толкование EN: ${preset.name}`)
                                    }}
                                    className="group relative h-12 rounded-lg border-2 transition-all hover:scale-110 active:scale-95"
                                    style={{ 
                                      backgroundColor: preset.color,
                                      borderColor: englishDefinitionColor === preset.color ? 'oklch(0.75 0.15 195)' : 'oklch(0.30 0.08 280)'
                                    }}
                                    title={preset.name}
                                  >
                                    {englishDefinitionColor === preset.color && (
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <Check weight="bold" className="text-background" />
                                      </div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-3">
                              <label className="text-sm font-medium">Цвет русского толкования</label>
                              <div className="grid grid-cols-4 gap-2">
                                {[
                                  { name: 'Розовый', color: 'oklch(0.70 0.20 350)' },
                                  { name: 'Красный', color: 'oklch(0.65 0.25 25)' },
                                  { name: 'Голубой', color: 'oklch(0.75 0.15 195)' },
                                  { name: 'Бирюзовый', color: 'oklch(0.70 0.15 195)' },
                                  { name: 'Зелёный', color: 'oklch(0.70 0.18 145)' },
                                  { name: 'Лимонный', color: 'oklch(0.85 0.18 105)' },
                                  { name: 'Янтарный', color: 'oklch(0.70 0.18 65)' },
                                  { name: 'Пурпурный', color: 'oklch(0.65 0.22 320)' },
                                ].map((preset) => (
                                  <button
                                    key={preset.name}
                                    onClick={() => {
                                      setRussianDefinitionColor(preset.color)
                                      toast.success(`Толкование RU: ${preset.name}`)
                                    }}
                                    className="group relative h-12 rounded-lg border-2 transition-all hover:scale-110 active:scale-95"
                                    style={{ 
                                      backgroundColor: preset.color,
                                      borderColor: russianDefinitionColor === preset.color ? 'oklch(0.75 0.15 195)' : 'oklch(0.30 0.08 280)'
                                    }}
                                    title={preset.name}
                                  >
                                    {russianDefinitionColor === preset.color && (
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <Check weight="bold" className="text-background" />
                                      </div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              setEnglishWordColor('oklch(0.98 0 0)')
                              setRussianWordColor('oklch(0.70 0.20 350)')
                              setEnglishDefinitionColor('oklch(0.65 0.05 280)')
                              setRussianDefinitionColor('oklch(0.70 0.20 350)')
                              toast.success('Цвета сброшены')
                            }}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            Сбросить
                          </Button>
                          <Button
                            onClick={() => setShowColorControl(false)}
                            size="sm"
                            className="flex-1 bg-primary hover:bg-primary/90"
                          >
                            Готово
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                    className="max-w-3xl mx-auto px-4 min-h-[120px] flex items-center justify-center"
                  >
                    {isLoadingDefinition || isLoadingRussianDefinition ? (
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm">Loading definition...</span>
                      </div>
                    ) : currentDefinition && currentRussianDefinition ? (
                      <div className="space-y-3 w-full">
                        <div className="relative min-h-[60px] flex items-center justify-center">
                          <motion.p 
                            className="text-lg md:text-xl leading-relaxed text-center absolute inset-0 flex items-center justify-center px-4"
                            style={{ color: englishDefinitionColor }}
                            animate={{
                              opacity: definitionWordStates.some(Boolean) ? 0 : 1,
                              y: definitionWordStates.some(Boolean) ? -10 : 0,
                              filter: definitionWordStates.some(Boolean) ? 'blur(8px)' : 'blur(0px)'
                            }}
                            transition={{
                              duration: 0.6,
                              ease: [0.4, 0, 0.2, 1]
                            }}
                          >
                            <span className="italic">{currentDefinition}</span>
                          </motion.p>
                          
                          <motion.p 
                            className="text-lg md:text-xl leading-relaxed text-center absolute inset-0 flex items-center justify-center px-4"
                            style={{ color: russianDefinitionColor }}
                            animate={{
                              opacity: definitionWordStates.some(Boolean) ? 1 : 0,
                              y: definitionWordStates.some(Boolean) ? 0 : 10,
                              filter: definitionWordStates.some(Boolean) ? 'blur(0px)' : 'blur(8px)'
                            }}
                            transition={{
                              duration: 0.6,
                              ease: [0.4, 0, 0.2, 1]
                            }}
                          >
                            <span className="font-medium italic">{currentRussianDefinition}</span>
                          </motion.p>
                        </div>
                        
                        <div className="flex justify-center gap-1 flex-wrap">
                          {currentDefinition.split(' ').map((_, index) => (
                            <motion.div
                              key={index}
                              className="h-1 rounded-full"
                              style={{ width: '12px' }}
                              animate={{
                                backgroundColor: definitionWordStates[index] 
                                  ? 'oklch(0.70 0.20 350)' 
                                  : 'oklch(0.30 0.08 280)'
                              }}
                              transition={{
                                duration: 0.3,
                                ease: [0.4, 0, 0.2, 1]
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    ) : currentDefinition ? (
                      <p className="text-lg md:text-xl text-muted-foreground leading-relaxed italic">
                        "{currentDefinition}"
                      </p>
                    ) : null}
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </div>
          </Card>

          <div className="flex gap-4 mt-6 justify-center">
            <Button
              onClick={goToPrevious}
              disabled={index === 0}
              size="lg"
              className="group bg-card/80 hover:bg-card backdrop-blur-sm border border-border/50 disabled:opacity-30 transition-all hover:scale-105 active:scale-95"
            >
              <CaretLeft weight="bold" className="text-2xl group-hover:text-secondary transition-colors" />
            </Button>
            
            <Button
              onClick={() => markAsLearned(currentWord, false)}
              size="lg"
              variant={isCurrentWordMarked ? "default" : "outline"}
              className={`group backdrop-blur-sm transition-all hover:scale-105 active:scale-95 ${
                isCurrentWordMarked 
                  ? 'bg-destructive/80 hover:bg-destructive border-destructive text-destructive-foreground' 
                  : 'bg-card/80 hover:bg-card border-border/50 hover:border-destructive/50'
              }`}
            >
              <X weight="bold" className="text-2xl" />
            </Button>
            
            <Button
              onClick={() => markAsLearned(currentWord, true)}
              size="lg"
              variant={isCurrentWordLearned ? "default" : "outline"}
              className={`group backdrop-blur-sm transition-all hover:scale-105 active:scale-95 ${
                isCurrentWordLearned 
                  ? 'bg-secondary hover:bg-secondary/90 border-secondary text-secondary-foreground shadow-lg shadow-secondary/50' 
                  : 'bg-card/80 hover:bg-card border-border/50 hover:border-secondary/50'
              }`}
            >
              <Check weight="bold" className="text-2xl" />
            </Button>
            
            <Button
              onClick={goToNext}
              disabled={index >= wordList.length - 1}
              size="lg"
              className="group bg-primary hover:bg-primary/90 backdrop-blur-sm disabled:opacity-30 transition-all hover:scale-105 active:scale-95 hover:shadow-lg hover:shadow-primary/50"
            >
              <CaretRight weight="bold" className="text-2xl" />
            </Button>
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p className="tracking-wide">
            Press <kbd className="px-2 py-1 bg-muted/50 rounded text-xs">←</kbd> or <kbd className="px-2 py-1 bg-muted/50 rounded text-xs">→</kbd> to navigate • 
            <kbd className="px-2 py-1 bg-muted/50 rounded text-xs mx-1">Y</kbd> = learned • 
            <kbd className="px-2 py-1 bg-muted/50 rounded text-xs">N</kbd> = need review • 
            <kbd className="px-2 py-1 bg-muted/50 rounded text-xs">P</kbd> = pause • 
            <kbd className="px-2 py-1 bg-muted/50 rounded text-xs">S</kbd> = speed • 
            <kbd className="px-2 py-1 bg-muted/50 rounded text-xs">D</kbd> = definition speed • 
            <kbd className="px-2 py-1 bg-muted/50 rounded text-xs">C</kbd> = colors
          </p>
        </div>
      </div>

      <Dialog open={showStats} onOpenChange={setShowStats}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-border/50">
          <DialogHeader>
            <DialogTitle className="text-3xl font-heading">📊 Learning Progress</DialogTitle>
            <DialogDescription className="text-lg pt-4">
              Track your vocabulary journey
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-6 bg-secondary/20 border-secondary/30">
                <div className="text-center">
                  <div className="text-3xl font-bold text-secondary">{learnedCount}</div>
                  <div className="text-sm text-muted-foreground mt-1">Learned</div>
                </div>
              </Card>
              <Card className="p-6 bg-destructive/20 border-destructive/30">
                <div className="text-center">
                  <div className="text-3xl font-bold text-destructive">{reviewCount}</div>
                  <div className="text-sm text-muted-foreground mt-1">To Review</div>
                </div>
              </Card>
              <Card className="p-6 bg-primary/20 border-primary/30">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{wordList.length}</div>
                  <div className="text-sm text-muted-foreground mt-1">Total</div>
                </div>
              </Card>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-medium">{Math.round((learnedCount / wordList.length) * 100)}%</span>
              </div>
              <Progress value={(learnedCount / wordList.length) * 100} className="h-3" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowStats(false)} className="bg-primary hover:bg-primary/90">
              Continue Learning
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCompletion} onOpenChange={setShowCompletion}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-border/50">
          <DialogHeader>
            <DialogTitle className="text-3xl font-heading">🎉 Congratulations!</DialogTitle>
            <DialogDescription className="text-lg pt-4">
              You've reviewed all {wordList.length} words. You've learned {learnedCount} words so far!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={restart} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              Start Over
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default App