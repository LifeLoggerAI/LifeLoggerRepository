# URAI Visual Assets

This directory contains placeholder visual assets for the URAI platform following the Visual & Animation Layer specifications.

## Structure

### `/lottie/` - Lottie JSON Animations
- `aura-glow.json` - Mood-responsive aura animation
- `memory-bloom.json` - Recovery milestone celebration
- `gentle-pulse.json` - Calming meditation animation (placeholder)
- `energy-flow.json` - Activation and goal-focus animation (placeholder)

### `/overlays/svg/` - SVG Overlays  
- `mood-aura.svg` - Dynamic mood visualization overlay
- `particle-field.svg` - Ambient particle effects (placeholder)

### `/weather/` - Weather & Atmospheric Effects
- `sky-background.svg` - Dynamic sky with weather states

### `/seasonal/` - Seasonal Themes
- `spring-background.svg` (placeholder)
- `summer-background.svg` (placeholder) 
- `autumn-background.svg` (placeholder)
- `winter-background.svg` (placeholder)

## Usage

These assets are dynamically served and configured based on:
- User's current mood state (from cognitiveMirror)
- Stress and energy levels
- Seasonal context
- Personal preferences
- Recovery milestones

The visual engine automatically selects appropriate animations and overlays through the Cloud Functions in `visual-animation-engine.ts`.

## Customization

Assets support dynamic properties:
- Colors (HSL color space for mood mapping)
- Animation duration (energy-responsive)
- Opacity (stress-responsive)
- Particle density (mood-responsive)
- Seasonal tinting

## Future Enhancements

This placeholder structure is ready for:
- Custom user-created animations
- AI-generated visual content
- Real-time mood-to-visual mapping
- Collaborative seasonal stories
- Community-shared overlays