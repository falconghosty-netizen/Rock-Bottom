# Rock Bottom

An incremental digging game for iPhone. Start in a backyard, tap to dig, and
go 6,371 km down to the centre of the Earth through 8 layers. Along the way you
upgrade tools, hire machines, unlock skills, smash boulders and find 40 treasures.

It is a web app that installs to your Home Screen and then runs offline, full
screen, like a normal app. Everything is built in code: 3D models, textures and
sounds are all generated, so the files never touch the internet once installed.

## Put it on your iPhone

The game has to be loaded once from an **https://** address. That first visit
is when it saves itself for offline use. After that it needs no internet.

1. Host this `ios-game` folder anywhere that serves https. Two free options:
   - **Netlify Drop:** go to netlify.com/drop and drag the `ios-game` folder in.
   - **GitHub Pages:** enable Pages for the repo and open `/ios-game/`.
2. Open the link in **Safari** on your iPhone.
3. Tap **Share → Add to Home Screen**.
4. Open it from the Home Screen icon. Play once while online, then it works offline.

If you hear no sound, check the silent switch on the side of the phone.

Your save lives on the phone. Deleting the Home Screen icon deletes the save.

## Run it on a computer

```
cd ios-game
python3 -m http.server 8000
```
Then open http://localhost:8000.

## Files

| Path | What it is |
| --- | --- |
| `js/data.js` | Layers, tools, bags, machines, skill tree, treasures, achievements |
| `js/state.js` | Game rules and economy (no rendering) |
| `js/scene.js` | 3D scene: shaft, lighting, particles, machines, finale |
| `js/shaders.js` | Sculpted-clay rock shaders, lawn, sky |
| `js/yard.js` | The backyard: lawn, grass, fence, house, trees |
| `js/models.js` | Procedural models: tools, machines, treasures, Mole King |
| `js/audio.js` | Synthesized sound effects and ambience |
| `js/ui.js` | HUD, shop, skill tree, finds, menus |
| `sw.js` | Offline cache |
| `tools/sim.mjs` | Headless balance simulation: `node tools/sim.mjs [crowns]` |
