# Planning Guide

A modern flashcard application that displays the 3000 most common English words one at a time, designed for language learners to build vocabulary through focused, distraction-free review.

**Experience Qualities**:
1. **Immersive** - Full-screen card interface that focuses attention entirely on the current word
2. **Fluid** - Seamless transitions and tactile interactions that feel natural and responsive
3. **Progressive** - Clear visual feedback showing learning progress and momentum

**Complexity Level**: Light Application (multiple features with basic state)
This is a single-purpose vocabulary tool with state management for word progression, user progress tracking, and basic navigation controls.

## Essential Features

**Word Display**
- Functionality: Shows current English word in large, readable typography with audio pronunciation
- Purpose: Primary learning interface for vocabulary acquisition with proper pronunciation
- Trigger: App loads or user navigates to next/previous word
- Progression: App loads → Fetch word list → Display first word → Show word with clean typography → Auto-play pronunciation after 400ms delay
- Success criteria: Word is clearly legible, centered, visually prominent, and automatically pronounced

**Word Navigation**
- Functionality: Navigate between words using next/previous controls or keyboard
- Purpose: Allow users to control their learning pace
- Trigger: Click navigation buttons, swipe gesture, or press arrow keys
- Progression: User action → Smooth transition animation → New word appears → Progress updates
- Success criteria: Navigation is instant (<100ms), supports keyboard/swipe/click

**Progress Tracking**
- Functionality: Display current position in the 3000-word collection
- Purpose: Show learning momentum and remaining vocabulary
- Trigger: Automatic update on word change
- Progression: Word changes → Calculate position → Update progress indicator → Animate change
- Success criteria: Shows "X of 3000" and visual progress bar

**Word Collection Management**
- Functionality: Fetch and cache the 3000 most common English words
- Purpose: Provide reliable word source without repeated network calls
- Trigger: App initialization
- Progression: App loads → Check cache → Fetch if needed → Parse word list → Store locally → Begin display
- Success criteria: Words load within 2 seconds, persist between sessions

**Audio Pronunciation**
- Functionality: Automatically pronounce each word using Web Speech API and provide manual replay button
- Purpose: Help users learn correct pronunciation of vocabulary words
- Trigger: Automatic on word change (400ms delay) or manual button click
- Progression: Word displayed → Brief delay → Speak word → Visual feedback during speech → Allow manual replay
- Success criteria: Clear audio pronunciation, visual indication during playback, manual replay option available

## Edge Case Handling

- **Network Failure**: Display cached words if available, show helpful error message if no cache exists
- **End of List**: Show completion celebration, allow restart from beginning
- **Rapid Navigation**: Debounce/throttle animations to prevent UI jank
- **Invalid Word Data**: Filter out empty/malformed entries, fallback to curated list
- **Browser Audio Support**: Gracefully handle browsers without Web Speech API support, show toast notification
- **Audio Playback Errors**: Cancel previous speech before starting new, handle errors with user feedback

## Design Direction

The design should evoke a sense of calm focus and forward momentum - like turning pages in a beautifully typeset book. It should feel sophisticated and modern with subtle depth,using dimensionality through layered backgrounds and gentle shadows rather than flat design.

## Color Selection

A sophisticated gradient-based palette with rich depth and contemporary vibrancy.

- **Primary Color**: Deep cosmic purple (oklch(0.35 0.15 285)) - Represents learning and concentration, used for key interactive elements
- **Secondary Colors**: 
  - Vibrant cyan accent (oklch(0.75 0.15 195)) - For highlights and active states
  - Deep space background (oklch(0.15 0.05 270)) - Creates immersive environment
- **Accent Color**: Electric pink (oklch(0.70 0.20 350)) - For progress indicators and achievements
- **Foreground/Background Pairings**:
  - Background (Deep space oklch(0.15 0.05 270)): White text (oklch(0.98 0 0)) - Ratio 11.2:1 ✓
  - Primary (Deep purple oklch(0.35 0.15 285)): White text (oklch(0.98 0 0)) - Ratio 8.5:1 ✓
  - Accent (Electric pink oklch(0.70 0.20 350)): Dark text (oklch(0.15 0.05 270)) - Ratio 7.8:1 ✓
  - Card surface (oklch(0.22 0.08 280)): White text (oklch(0.98 0 0)) - Ratio 9.5:1 ✓

## Font Selection

Typography should feel both contemporary and literary - combining geometric precision with humanist warmth using Space Grotesk for headings and Crimson Pro for the word display itself.

- **Typographic Hierarchy**:
  - H1 (Word Display): Crimson Pro Bold/72px/tight letter-spacing (-0.02em) - Elegant and highly readable
  - H2 (Progress Counter): Space Grotesk Medium/18px/normal - Clean and modern
  - Body (Instructions): Space Grotesk Regular/16px/relaxed - Easy scanning
  - Caption (Metadata): Space Grotesk Light/14px/wide letter-spacing (0.05em) - Subtle information

## Animations

Animations create a sense of tangible physicality - cards should feel like they have weight and momentum. Use smooth page-turn effects with subtle elastic easing for word transitions (300ms), micro-interactions on button hover (150ms), and celebratory motion when reaching milestones. Progress bar fills should be satisfying with spring physics.

## Component Selection

- **Components**: 
  - Card for word display with elevated shadow and gradient background
  - Button for navigation controls with distinct hover/active states
  - Progress bar component with gradient fill
  - Badge for word counter display
  - Dialog for completion celebration and error states
- **Customizations**: 
  - Large-format card with mesh gradient background using multiple radial gradients
  - Custom progress bar with dual-color gradient fill and glow effect
  - Navigation buttons with icon-only design, glassmorphism effect
- **States**: 
  - Buttons: Subtle glow on hover, scale down on press, disabled state at list boundaries
  - Card: Smooth slide/fade transitions between words
  - Progress: Animated width change with spring easing
- **Icon Selection**: 
  - CaretLeft/CaretRight for navigation
  - ArrowCounterClockwise for restart
  - SpeakerHigh for audio pronunciation
  - Check for completion
- **Spacing**: 
  - Generous padding (p-12) on main card
  - Large gaps (gap-8) between major sections
  - Tight grouping (gap-2) for related controls
- **Mobile**: 
  - Stack navigation buttons below card on mobile
  - Reduce font sizes: word to 48px, progress to 16px
  - Add swipe gesture support for touch devices
  - Full-width card with reduced padding (p-6)
