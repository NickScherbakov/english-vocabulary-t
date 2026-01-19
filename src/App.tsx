import { useState, useEffect, useCallback, useRef } from 'react'
import { useKV } from '@github/spark/hooks'
import { motion, AnimatePresence } from 'framer-motion'
import { CaretLeft, CaretRight, ArrowCounterClockwise, SpeakerHigh } from '@phosphor-icons/react'
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

function App() {
  const [words, setWords] = useKV<string[]>('english-words', [])
  const [currentIndex, setCurrentIndex] = useKV<number>('current-index', 0)
  const [translationCache, setTranslationCache] = useKV<TranslationCache>('translation-cache', {})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCompletion, setShowCompletion] = useState(false)
  const [direction, setDirection] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)
  const [currentTranslation, setCurrentTranslation] = useState<string>('')
  const [isTranslating, setIsTranslating] = useState(false)
  const speechSynthRef = useRef<SpeechSynthesis | null>(null)

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

  useEffect(() => {
    const wordList = words || []
    const index = currentIndex || 0
    const word = wordList[index]
    
    if (word && !isLoading && !error) {
      setShowTranslation(false)
      setCurrentTranslation('')
      
      const timer = setTimeout(() => {
        speakWord(word)
      }, 400)
      
      const translationTimer = setTimeout(async () => {
        setIsTranslating(true)
        const translation = await getTranslation(word)
        setCurrentTranslation(translation)
        setIsTranslating(false)
        
        setTimeout(() => {
          setShowTranslation(true)
        }, 1500)
      }, 800)
      
      return () => {
        clearTimeout(timer)
        clearTimeout(translationTimer)
      }
    }
  }, [currentIndex, words, isLoading, error, speakWord, getTranslation])

  const goToNext = useCallback(() => {
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
  }, [words, setCurrentIndex])

  const goToPrevious = useCallback(() => {
    setShowTranslation(false)
    setCurrentIndex((current = 0) => {
      const prev = Math.max(0, current - 1)
      setDirection(-1)
      return prev
    })
  }, [setCurrentIndex])

  const restart = useCallback(() => {
    setShowTranslation(false)
    setCurrentIndex(0)
    setShowCompletion(false)
    setDirection(-1)
  }, [setCurrentIndex])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        goToNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goToPrevious()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [goToNext, goToPrevious])

  const wordList = words || []
  const index = currentIndex || 0
  const currentWord = wordList[index] || ''
  const progress = wordList.length > 0 ? ((index + 1) / wordList.length) * 100 : 0

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
          <Badge variant="secondary" className="text-sm tracking-wider bg-card/80 backdrop-blur-sm border-border/50">
            Word {index + 1} of {wordList.length}
          </Badge>
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
                  className="text-center space-y-6"
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
          <p className="tracking-wide">Press <kbd className="px-2 py-1 bg-muted/50 rounded text-xs">←</kbd> or <kbd className="px-2 py-1 bg-muted/50 rounded text-xs">→</kbd> to navigate</p>
        </div>
      </div>

      <Dialog open={showCompletion} onOpenChange={setShowCompletion}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-border/50">
          <DialogHeader>
            <DialogTitle className="text-3xl font-heading">🎉 Congratulations!</DialogTitle>
            <DialogDescription className="text-lg pt-4">
              You've reviewed all {wordList.length} words. Amazing work!
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