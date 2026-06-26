import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NOVEL_DIR = __dirname;
const DATA_DIR = path.join(NOVEL_DIR, 'public', 'data');

// Helper to check if a file is a novel chapter text file
function isChapterFile(filename) {
  return /^\d+\s*(프롤로그|장)\s+.+\.txt$/.test(filename);
}

// Helper to parse filename into chapter details
function parseChapterFilename(filename) {
  const match = filename.match(/^(\d+)\s*(프롤로그|장)\s+(.+)\.txt$/);
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

// Core static generation logic
export async function generateStaticData() {
  try {
    console.log('Generating static novel data files...');
    
    // Ensure target directory exists
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    // Load views.json if exists
    let views = {};
    try {
      const viewsContent = await fs.readFile(path.join(NOVEL_DIR, 'views.json'), 'utf-8');
      views = JSON.parse(viewsContent);
    } catch (err) {
      // Ignore error if views.json doesn't exist yet
    }
    
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
          const readingTime = Math.max(1, Math.ceil(charCount / 500));
          
          chapters.push({
            ...parsed,
            charCount,
            wordCount,
            readingTime,
            views: views[parsed.id] || 0, // Include view count
            mtime: stat.mtime
          });
        }
      }
    }
    
    // Sort chapters by ID
    chapters.sort((a, b) => a.id - b.id);
    
    // 1. Save chapters list: chapters.json
    await fs.writeFile(path.join(DATA_DIR, 'chapters.json'), JSON.stringify(chapters, null, 2), 'utf-8');
    console.log(`Saved chapters.json (${chapters.length} chapters found)`);
    
    // 2. Save individual chapters: chapter-<id>.json and analyze stats on the fly
    let totalCharacters = 0;
    let totalWords = 0;
    const characterMentions = [];
    const tensionIndex = [];
    
    // Keyword patterns to search for character analysis
    const keywords = ['도형', '장로', '교회', 'CCTV', '카메라', 'AI', '경고', '비밀', '가족'];
    // High-tension words for tension algorithm
    const tensionWords = ['얼어붙음', '긴장', '폭력', '위험', '경고', '판도라', '식은땀', '피', '비정상', '침묵', '소음', '공포', '비명', '감시'];
    
    for (const chapter of chapters) {
      const filePath = path.join(NOVEL_DIR, chapter.filename);
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Save chapter content json
      const chapterContentJson = {
        ...chapter,
        content
      };
      await fs.writeFile(
        path.join(DATA_DIR, `chapter-${chapter.id}.json`), 
        JSON.stringify(chapterContentJson, null, 2), 
        'utf-8'
      );
      
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
      
      // Tension Score calculation
      let tensionWordCount = 0;
      tensionWords.forEach(tw => {
        const regex = new RegExp(tw, 'g');
        tensionWordCount += (content.match(regex) || []).length;
      });
      const score = Math.min(100, Math.round((tensionWordCount / chapter.charCount) * 4000));
      tensionIndex.push({
        chapterId: chapter.id,
        title: chapter.title,
        tensionScore: score
      });
    }
    
    // 3. Save stats summary: stats.json
    const statsJson = {
      chapterCount: chapters.length,
      totalCharacters,
      totalWords,
      averageLength: chapters.length ? Math.round(totalCharacters / chapters.length) : 0,
      characterMentions,
      tensionIndex
    };
    await fs.writeFile(path.join(DATA_DIR, 'stats.json'), JSON.stringify(statsJson, null, 2), 'utf-8');
    console.log('Saved stats.json');
    
    console.log('Static data generation completed successfully.');
  } catch (error) {
    console.error('Error generating static data:', error);
    throw error;
  }
}

// Self-run if called directly from CLI (e.g. npm run build)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateStaticData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
