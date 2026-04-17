const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3737;

const OUTPUT_DIR = path.resolve(__dirname, '..', 'output');
const SCREENSHOTS_DIR = path.resolve(__dirname, '..', 'reports', 'screenshots');
const DIST_DIR = path.resolve(__dirname, 'dist');

const AUDIO_DIR = path.resolve(__dirname, '..', 'audio');

app.use(cors());
app.use(express.json());

// Serve the built frontend
app.use(express.static(DIST_DIR));

// Serve audio files
app.use('/audio', express.static(AUDIO_DIR));


// API: slides
app.get('/api/slides', (req, res) => {
  try {
    const slides = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'designed-slides.json'), 'utf-8'));
    res.json(slides);
  } catch (e) {
    res.status(404).json({ error: 'designed-slides.json not found. Run the framework first.' });
  }
});

// API: narration
app.get('/api/narration', (req, res) => {
  try {
    const narration = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'narration.json'), 'utf-8'));
    res.json(narration);
  } catch (e) {
    res.status(404).json({ error: 'narration.json not found.' });
  }
});

// API: analytics
app.get('/api/analytics', (req, res) => {
  const analyticsPath = path.join(__dirname, '..', 'analytics', 'analytics.json');
  try {
    const analytics = JSON.parse(fs.readFileSync(analyticsPath, 'utf-8'));
    res.json(analytics);
  } catch (e) {
    res.json(null);
  }
});

// API: audio manifest
app.get('/api/audio', (req, res) => {
  const audioManifestPath = path.join(AUDIO_DIR, 'audio-manifest.json');
  try {
    const manifest = JSON.parse(fs.readFileSync(audioManifestPath, 'utf-8'));
    res.json(manifest);
  } catch (e) {
    res.json(null);
  }
});

// Serve screenshots folder
app.use('/screenshots', express.static(SCREENSHOTS_DIR));

// Catch-all: serve React app
app.get('*', (req, res) => {
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(503).send('Frontend not built yet. Run: npm run build inside presentation-renderer/');
  }
});

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`\n🚀 Presentation Renderer running at http://localhost:${port}`);
    console.log(`   Slides API:    http://localhost:${port}/api/slides`);
    console.log(`   Narration API: http://localhost:${port}/api/narration\n`);
    // Auto-open browser on Windows
    try { require('child_process').exec(`start http://localhost:${port}`); } catch(_) {}
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️  Port ${port} is in use, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      throw err;
    }
  });
}

startServer(PORT);
