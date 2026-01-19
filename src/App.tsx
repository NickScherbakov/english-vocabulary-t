import { useState, useEffect, useCallback, useRef } from 'react'
import { useKV } from '@github/spark/hooks'
import { motion, AnimatePresence } from 'framer-motion'
import { CaretLeft, CaretRight, ArrowCounterClockwise, SpeakerHigh, Check, X, ChartBar, Pause, Play } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
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
  const [alternationInterval, setAlternationInterval] = useState(1500)
  const [showRussianDefinition, setShowRussianDefinition] = useState(false)
  const [definitionWordStates, setDefinitionWordStates] = useState<boolean[]>([])
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
      setAlternationInterval(1500)
      
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

    let currentInterval = alternationInterval

    const startAlternation = () => {
      alternationTimerRef.current = setTimeout(() => {
        setShowTranslation(prev => !prev)
        startAlternation()
      }, currentInterval)
    }

    startAlternation()

    intervalDecreaseRef.current = setInterval(() => {
      currentInterval = Math.max(100, currentInterval * 0.85)
      setAlternationInterval(currentInterval)
    }, 2000)

    return () => {
      if (alternationTimerRef.current) {
        clearTimeout(alternationTimerRef.current)
      }
      if (intervalDecreaseRef.current) {
        clearInterval(intervalDecreaseRef.current)
      }
    }
  }, [currentTranslation, isAlternating, isPaused, alternationInterval])

  useEffect(() => {
    if (!currentRussianDefinition || !currentDefinition || !isAlternating || isPaused) return

    const englishWords = currentDefinition.split(' ')
    const russianWords = currentRussianDefinition.split(' ')
    const maxWords = Math.max(englishWords.length, russianWords.length)
    
    setDefinitionWordStates(new Array(maxWords).fill(false))

    let currentInterval = 2000
    let currentWordIndex = 0

    const startDefinitionAlternation = () => {
      if (currentWordIndex >= maxWords) {
        currentWordIndex = 0
        setDefinitionWordStates(new Array(maxWords).fill(false))
      }

      definitionAlternationTimerRef.current = setTimeout(() => {
        setDefinitionWordStates(prev => {
          const newStates = [...prev]
          newStates[currentWordIndex] = !newStates[currentWordIndex]
          return newStates
        })
        currentWordIndex++
        startDefinitionAlternation()
      }, currentInterval)
    }

    const initialDelay = setTimeout(() => {
      startDefinitionAlternation()

      definitionIntervalDecreaseRef.current = setInterval(() => {
        currentInterval = Math.max(150, currentInterval * 0.85)
      }, 2500)
    }, 2000)

    return () => {
      clearTimeout(initialDelay)
      if (definitionAlternationTimerRef.current) {
        clearTimeout(definitionAlternationTimerRef.current)
      }
      if (definitionIntervalDecreaseRef.current) {
        clearInterval(definitionIntervalDecreaseRef.current)
      }
    }
  }, [currentRussianDefinition, currentDefinition, isAlternating, isPaused])

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
                      className="font-heading text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-accent absolute"
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

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                    className="max-w-2xl mx-auto px-4 min-h-[80px] flex items-center justify-center"
                  >
                    {isLoadingDefinition || isLoadingRussianDefinition ? (
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm">Loading definition...</span>
                      </div>
                    ) : currentDefinition && currentRussianDefinition ? (
                      <p className="text-lg md:text-xl leading-relaxed italic text-center">
                        {currentDefinition.split(' ').map((engWord, index) => {
                          const russianWords = currentRussianDefinition.split(' ')
                          const rusWord = russianWords[index] || ''
                          const showRussian = definitionWordStates[index] || false
                          
                          return (
                            <motion.span
                              key={index}
                              className="inline-block relative mx-1"
                              style={{ minWidth: '1ch' }}
                            >
                              <motion.span
                                className="absolute inset-0 whitespace-nowrap"
                                animate={{
                                  opacity: showRussian ? 0 : 1,
                                  y: showRussian ? -5 : 0,
                                  filter: showRussian ? 'blur(4px)' : 'blur(0px)'
                                }}
                                transition={{
                                  duration: 0.4,
                                  ease: [0.4, 0, 0.2, 1]
                                }}
                              >
                                <span className="text-muted-foreground">{engWord}</span>
                              </motion.span>
                              <motion.span
                                className="whitespace-nowrap"
                                animate={{
                                  opacity: showRussian ? 1 : 0,
                                  y: showRussian ? 0 : 5,
                                  filter: showRussian ? 'blur(0px)' : 'blur(4px)'
                                }}
                                transition={{
                                  duration: 0.4,
                                  ease: [0.4, 0, 0.2, 1]
                                }}
                              >
                                <span className="text-accent">{rusWord}</span>
                              </motion.span>
                            </motion.span>
                          )
                        })}
                      </p>
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
            <kbd className="px-2 py-1 bg-muted/50 rounded text-xs">P</kbd> = pause
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