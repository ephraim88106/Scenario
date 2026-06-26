import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateStaticData } from './build-static.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

const NOVEL_DIR = __dirname;

// Multer storage configuration for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, NOVEL_DIR);
  },
  filename: (req, file, cb) => {
    // Preserve original name but ensure it's safe
    cb(null, Buffer.from(file.originalname, 'latin1').toString('utf8'));
  }
});
const upload = multer({ storage });

// Helper to check if a file is a novel chapter text file
function isChapterFile(filename) {
  // Matches "00 프롤로그  발칙한 관찰자.txt" or "01장  완벽한 진열장과 시선.txt" etc.
  return /^\d+(프롤로그|장)\s+.+\.txt$/.test(filename);
}

// Helper to parse filename into chapter details
function parseChapterFilename(filename) {
  const match = filename.match(/^(\d+)(프롤로그|장)\s+(.+)\.txt$/);
  if (!match) return null;
  
  const id = parseInt(match[1], 10);
  const type = match[2];
  const title = match[3].trim();
  
  return {
    id,
    filename,
    chapterNumber: id,
    type,
    title
  };
}

// Scan directory and return list of sorted chapters with stats
async function getChaptersList() {
  try {
    const files = await fs.readdir(NOVEL_DIR);
    const chapters = [];
    
    for (const file of files) {
      if (isChapterFile(file)) {
        const parsed = parseChapterFilename(file);
        if (parsed) {
          const filePath = path.join(NOVEL_DIR, file);
          const stat = await fs.stat(filePath);
          const content = await fs.readFile(filePath, 'utf-8');
          const charCount = content.replace(/\s/g, '').length;
          const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
          
          // Korean reading speed: ~500 chars/min
          const readingTime = Math.max(1, Math.ceil(charCount / 500));
          
          chapters.push({
            ...parsed,
            charCount,
            wordCount,
            readingTime,
            mtime: stat.mtime
          });
        }
      }
    }
    
    // Sort chapters by ID
    return chapters.sort((a, b) => a.id - b.id);
  } catch (error) {
    console.error('Error reading chapters list:', error);
    return [];
  }
}

// 1. GET /api/chapters - List all chapters
app.get('/api/chapters', async (req, res) => {
  const chapters = await getChaptersList();
  res.json(chapters);
});

// 2. GET /api/chapters/:id - Get chapter content
app.get('/api/chapters/:id', async (req, res) => {
  const chapterId = parseInt(req.params.id, 10);
  const chapters = await getChaptersList();
  
  const chapter = chapters.find(c => c.id === chapterId);
  if (!chapter) {
    return res.status(404).json({ error: 'Chapter not found' });
  }
  
  try {
    const filePath = path.join(NOVEL_DIR, chapter.filename);
    const content = await fs.readFile(filePath, 'utf-8');
    res.json({
      ...chapter,
      content
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to read chapter content' });
  }
});

// 3. POST /api/chapters - Save new chapter text
app.post('/api/chapters', async (req, res) => {
  const { chapterNumber, type, title, content } = req.body;
  
  if (chapterNumber === undefined || !type || !title || !content) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const numStr = String(chapterNumber).padStart(2, '0');
  const safeTitle = title.replace(/[\\/:*?"<>|]/g, ''); // Remove unsafe filename characters
  const filename = `${numStr}${type}  ${safeTitle}.txt`;
  const filePath = path.join(NOVEL_DIR, filename);
  
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    await generateStaticData(); // Regenerate JSON files dynamically for frontend
    res.status(201).json({ message: 'Chapter saved successfully', filename });
  } catch (error) {
    res.status(500).json({ error: 'Failed to write chapter file' });
  }
});

// 4. POST /api/upload - Upload a .txt file
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  
  if (!isChapterFile(originalName)) {
    // If filename format is invalid, we will delete the uploaded file and complain
    try {
      await fs.unlink(req.file.path);
    } catch (err) {}
    return res.status(400).json({ 
      error: '파일명 형식이 맞지 않습니다. 예시: "23장  새로운 시작.txt" 또는 "00프롤로그  관찰자.txt"' 
    });
  }
  
  try {
    await generateStaticData(); // Regenerate JSON files dynamically for frontend
  } catch (err) {}
  
  res.json({ message: 'File uploaded successfully', filename: originalName });
});

// 5. GET /api/stats - Analytical stats of the novel files
app.get('/api/stats', async (req, res) => {
  const chapters = await getChaptersList();
  
  let totalCharacters = 0;
  let totalWords = 0;
  const wordFrequency = {};
  const characterMentions = [];
  const tensionIndex = [];
  
  // Keyword patterns to search for character analysis
  const keywords = ['도형', '장로', '교회', 'CCTV', '카메라', 'AI', '경고', '비밀', '가족'];
  
  // High-tension words for tension algorithm
  const tensionWords = ['얼어붙음', '긴장', '폭력', '위험', '경고', '판도라', '식은땀', '피', '비정상', '침묵', '소음', '공포', '비명', '감시'];
  
  for (const chapter of chapters) {
    try {
      const filePath = path.join(NOVEL_DIR, chapter.filename);
      const content = await fs.readFile(filePath, 'utf-8');
      
      totalCharacters += chapter.charCount;
      totalWords += chapter.wordCount;
      
      // Keyword Frequency per chapter
      const chapterMentions = { chapterId: chapter.id, title: chapter.title };
      keywords.forEach(kw => {
        const regex = new RegExp(kw, 'g');
        const count = (content.match(regex) || []).length;
        chapterMentions[kw] = count;
      });
      characterMentions.push(chapterMentions);
      
      // Calculate Tension Score: count high-tension words, normalize by length
      let tensionWordCount = 0;
      tensionWords.forEach(tw => {
        const regex = new RegExp(tw, 'g');
        tensionWordCount += (content.match(regex) || []).length;
      });
      // Normalized score: count per 1000 characters
      const score = Math.min(100, Math.round((tensionWordCount / chapter.charCount) * 4000));
      tensionIndex.push({
        chapterId: chapter.id,
        title: chapter.title,
        tensionScore: score
      });
      
    } catch (err) {
      console.error(`Error analyzing chapter ${chapter.id}:`, err);
    }
  }
  
  res.json({
    chapterCount: chapters.length,
    totalCharacters,
    totalWords,
    averageLength: chapters.length ? Math.round(totalCharacters / chapters.length) : 0,
    characterMentions,
    tensionIndex
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  try {
    await generateStaticData();
  } catch (err) {
    console.error('Initial static data generation failed:', err);
  }
});
