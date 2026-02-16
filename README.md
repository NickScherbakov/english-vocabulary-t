# 🌟 Word Flow - English Vocabulary Mastery App

<div align="center">

**An immersive, particle-animated flashcard application for mastering the 10,000 most common English words**

[Features](#-features) • [Demo](#-demo) • [Installation](#-installation) • [Usage](#-usage) • [Shortcuts](#-keyboard-shortcuts) • [Tech Stack](#-technology-stack)

</div>

---

## 📖 About

**Word Flow** is a modern, visually stunning vocabulary learning application designed for language learners who want to build English vocabulary through focused, distraction-free study. Using proven spaced repetition algorithms (SM-2, the same system as Anki), beautiful particle animations, and intelligent learning features, Word Flow makes vocabulary acquisition both effective and enjoyable.

### Why Word Flow?

- 🧠 **Smart Learning** - SM-2 spaced repetition algorithm optimizes review intervals from minutes to months
- ✨ **Beautiful Animations** - Words morph through particle effects (dust, smoke, water) for engaging visual experience
- 🌍 **Bilingual Support** - Automatic Russian translations and definitions for Russian-speaking learners
- 🎯 **Quiz Mode** - Test yourself before revealing translations for active recall
- 📊 **Progress Tracking** - Monitor learned words, daily streaks, and mastery statistics
- ⌨️ **Keyboard-First** - Complete keyboard control for efficient workflow
- 🎨 **Customizable** - Adjust colors, speeds, particle styles to your preference
- 🔊 **Audio Pronunciation** - Hear correct pronunciation using Web Speech API

## ✨ Features

### Core Learning Features

- **10,000 Common Words** - Curated list of the most frequently used English words
- **Spaced Repetition System** - SM-2 algorithm (Anki-compatible) for optimal learning retention
- **Quiz Mode** - Active recall testing with self-assessment (Again/Hard/Good/Easy)
- **Smart Study Queue** - Prioritizes due reviews and gradually introduces new words
- **Progress Statistics** - Track new, learning, due, and mastered words
- **Daily Streaks** - Build consistent study habits with streak tracking
- **Example Sentences** - Context-rich examples for better understanding

### Visual & UX Features

- **Particle Morph Animations** - Words transform through beautiful particle effects:
  - 🌫️ **Dust** - Sharp, crystalline particles
  - 💨 **Smoke** - Soft, flowing clouds
  - 💧 **Water** - Fluid droplets with highlights
- **Automatic Alternation** - Words cycle between English and translation
- **Smooth Transitions** - Fluid animations with elastic easing
- **Immersive Full-Screen** - Distraction-free learning environment
- **Responsive Design** - Works seamlessly on desktop and mobile with swipe gestures

### Customization Options

- **Speed Control** - Adjust word and definition transformation speeds
- **Color Themes** - Customize colors for English/Russian words and definitions
- **Particle Styles** - Choose between dust, smoke, water, or no effects
- **Repeat Settings** - Configure automatic word repetitions
- **Audio Controls** - Manual pronunciation replay

## 🎮 Demo

> **Note**: Screenshots and demo GIFs to be added. The application features:
> - Particle morph text animations
> - Smooth color transitions
> - Progress bars with gradient fills
> - Interactive quiz interface
> - Statistics dashboard
> - Settings panels

## 🚀 Installation

### Prerequisites

- Node.js 18+ 
- npm or yarn package manager

### Setup

```bash
# Clone the repository
git clone https://github.com/NickScherbakov/english-vocabulary-t.git

# Navigate to project directory
cd english-vocabulary-t

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will open at `http://localhost:5173` (or the next available port).

### Build for Production

```bash
# Build optimized production bundle
npm run build

# Preview production build
npm run preview
```

## 📚 Usage

### Getting Started

1. **First Launch** - The app loads the word list and shows a tutorial guide (available in English/Russian)
2. **Study Flow** - Words appear with automatic pronunciation and translation
3. **Navigation** - Use arrow keys, swipe gestures, or on-screen buttons
4. **Mark Progress** - Press `Y` for learned words, `N` for words needing review

### Study Modes

#### Normal Mode (Default)
- Words automatically alternate between English and Russian
- Definitions transform between languages
- Ideal for passive vocabulary building

#### Quiz Mode (Press `Q`)
- See the English word first
- Mentally recall the translation
- Press `Space` to reveal the answer
- Rate yourself: `1` (Again) / `2` (Hard) / `3` (Good) / `4` (Easy)
- SM-2 algorithm calculates optimal review intervals

### Learning Workflow

```
New Word → Auto-Pronunciation → Translation Display → Mark Status
          ↓
    Review Due? → Quiz Mode → Self-Assessment → Reschedule
```

## ⌨️ Keyboard Shortcuts

### Navigation
| Key | Action |
|-----|--------|
| `←` / `→` | Previous / Next word |
| `Space` | Reveal translation (quiz) / Next word |
| `Home` / `End` | First / Last word |

### Learning Controls
| Key | Action |
|-----|--------|
| `Q` | Toggle quiz mode |
| `Y` | Mark word as learned |
| `N` | Mark word for review |
| `1`-`4` | Rate recall (Again/Hard/Good/Easy) |
| `E` | Show example sentence |
| `P` | Pause/Resume automatic alternation |

### Settings
| Key | Action |
|-----|--------|
| `S` | Word transformation speed |
| `D` | Definition transformation speed |
| `C` | Color customization |
| `R` | Repeat settings |
| `A` | Particle style (dust/smoke/water/none) |
| `G` | Show guide |
| `I` | Show statistics |

## 🛠️ Technology Stack

### Frontend Framework
- **React 19** - Modern UI library with concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool and dev server

### UI & Styling
- **Tailwind CSS 4** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Framer Motion** - Production-ready animation library
- **Lucide/Phosphor Icons** - Beautiful icon sets

### State & Data
- **@github/spark** - GitHub's application framework with KV storage
- **Local Storage** - Persistent user data and progress
- **Web Speech API** - Audio pronunciation

### Key Libraries
- **Canvas API** - Custom particle animations
- **clsx/tailwind-merge** - Conditional styling
- **sonner** - Toast notifications

### Development Tools
- **ESLint** - Code linting
- **TypeScript ESLint** - TypeScript-specific linting
- **SWC** - Fast TypeScript/JavaScript compiler

## 📁 Project Structure

```
english-vocabulary-t/
├── src/
│   ├── App.tsx                    # Main application component
│   ├── main.tsx                   # Application entry point
│   ├── components/
│   │   ├── ParticleMorphText.tsx  # Particle animation system
│   │   └── ui/                    # Reusable UI components
│   ├── hooks/
│   │   ├── use-spaced-repetition.ts  # SM-2 algorithm implementation
│   │   ├── use-swipe.ts           # Touch gesture handling
│   │   └── use-mobile.ts          # Mobile detection
│   ├── lib/
│   │   └── utils.ts               # Utility functions
│   └── styles/
│       ├── theme.css              # Color theme definitions
│       ├── main.css               # Global styles
│       └── index.css              # Tailwind imports
├── public/                        # Static assets
├── PRD.md                         # Product requirements document
├── package.json                   # Dependencies and scripts
├── tailwind.config.js             # Tailwind configuration
├── tsconfig.json                  # TypeScript configuration
└── vite.config.ts                 # Vite configuration
```

## 🎨 Customization

### Color Themes

Word Flow uses OKLCH color space for perceptually uniform colors. Default theme:

- **Background**: Deep space purple `oklch(0.15 0.05 270)`
- **Primary**: Deep cosmic purple `oklch(0.35 0.15 285)`
- **Accent**: Electric pink `oklch(0.70 0.20 350)`
- **Highlight**: Vibrant cyan `oklch(0.75 0.15 195)`

Colors can be customized in-app via the color control panel (`C` key).

### Particle Styles

Each style offers a unique visual experience:

- **Dust** - 900 square particles, crisp edges, rotating animation
- **Smoke** - 550 soft circles, floating upward, opacity variations
- **Water** - 750 droplets, downward flow, highlight rings
- **None** - Standard fade transitions (better performance)

## 📊 Learning Statistics

The statistics dashboard tracks:

- **Total Words**: Overall word count
- **New**: Unreviewed words
- **Learning**: Words in active review (interval < 21 days)
- **Mastered**: Words with long intervals (≥21 days)
- **Due**: Words scheduled for review today
- **Total Reviews**: Lifetime review count
- **Streak**: Consecutive days studied

## 🌐 Translation & Definitions

- **Russian Translations** - Automatic translation via API with local caching
- **English Definitions** - Dictionary definitions for deeper understanding
- **Russian Definitions** - Translated definitions for non-native speakers
- **Example Sentences** - Real-world usage context

All translations and definitions are cached locally for offline use and performance.

## 🧠 SM-2 Algorithm

Word Flow implements the SM-2 (SuperMemo 2) spaced repetition algorithm:

- **Interval Calculation** - Based on recall quality
- **Ease Factor** - Adjusts difficulty (1.3 - 2.5+)
- **Repetition Counter** - Tracks successful reviews
- **Lapse Handling** - Resets interval on forgotten words
- **Review Scheduling** - Optimal timing from 10 minutes to months

### Quality Ratings

- **Again (1)** - Complete blackout, forgot → Review in 10 minutes
- **Hard (2)** - Recalled with serious difficulty → Short interval
- **Good (3)** - Recalled with some hesitation → Standard interval
- **Easy (4)** - Perfect, instant recall → Extended interval

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style and conventions
- Use TypeScript for type safety
- Write meaningful commit messages
- Test features across different browsers
- Ensure accessibility standards

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Word List** - [google-10000-english](https://github.com/first20hours/google-10000-english) by first20hours
- **SM-2 Algorithm** - Original SuperMemo algorithm by Piotr Woźniak
- **Icons** - Phosphor Icons and Lucide React
- **UI Components** - Radix UI primitives
- **Fonts** - Crimson Pro & Space Grotesk (Google Fonts)

## 📧 Support

For issues, feature requests, or questions:

- Open an issue on [GitHub Issues](https://github.com/NickScherbakov/english-vocabulary-t/issues)
- Check the [PRD.md](PRD.md) for detailed feature specifications

---

<div align="center">

**Made with ❤️ for language learners everywhere**

⭐ Star this repo if you find it helpful!

</div>
