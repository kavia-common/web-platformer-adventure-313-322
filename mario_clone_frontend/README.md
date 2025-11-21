# Mario Clone Game (React)

This is a single-page fullscreen Mario-style platformer game built in React.

## How to Play

- Open the app (default: [http://localhost:3000](http://localhost:3000) or the configured port)
- The entire game is a fullscreen page with a centered canvas.

### Controls

- Move: `←`/`→` or `A`/`D`
- Jump: Spacebar or `↑`
- Pause/Resume: `P`
- Restart: `R` or click HUD "Restart"
- When game over/win: Press Enter or click "Restart" to play again

### Objective

- Collect all the coins you can!
- Stomp enemies (jump on them) for points.
- Reach the flag at the far right to win.

- Lives: You start with 3. Getting hit from an enemy's side costs a life; you respawn. No lives = Game Over.

### Features

- Classic platformer running/jumping, coyote time for jumps, gravity & friction.
- Collisions with ground, platforms, coins, enemies, and flag.
- Enemy AI: Patrols left/right, can be stomped.
- Score & HUD overlay: Displays score, coins collected, lives left, current level.
- Responsive: Game scales to your window while maintaining aspect ratio.
- Stylish light theme with accent colors, clean minimal UI.

## Customization

The game code is in `src/components/Game.js`, with supporting logic in `src/game/engine.js` and hooks in `src/hooks/useGameLoop.js`.
You can tweak the level, add new tiles/entities, or extend sprites easily.

## Running the Game

```sh
npm install
npm start
```

or use your preferred REACT_APP_PORT. This project does **not** require any external services.

## Accessibility

- Keyboard controls are always available.
- HUD/Controls accessible and readable.

## License

MIT

