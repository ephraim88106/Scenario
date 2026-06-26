// App State
let state = {
  chapters: [],
  currentChapterId: null,
  lastReadChapterId: localStorage.getItem('lastReadChapterId') ? parseInt(localStorage.getItem('lastReadChapterId'), 10) : null,
  fontSizePercent: parseInt(localStorage.getItem('readerFontSize'), 10) || 100,
  spacingClass: localStorage.getItem('readerSpacingClass') || 'spacing-normal-val',
  fontClass: localStorage.getItem('readerFontClass') || 'font-gothic',
  themeClass: localStorage.getItem('readerThemeClass') || 'theme-dark',
  ttsUtterance: null,
  isTtsSpeaking: false,
  isTtsPaused: false
};

// DOM Elements
const navButtons = document.querySelectorAll('.nav-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
const chaptersGrid = document.getElementById('chapters-grid');
const totalCharCountEl = document.getElementById('total-char-count');
const totalChaptersEl = document.getElementById('total-chapters');
const avgReadTimeEl = document.getElementById('avg-read-time');
const startReadingBtn = document.getElementById('start-reading-btn');

// Reader Elements
const navReaderBtn = document.getElementById('nav-reader-btn');
const readerCurrentTitle = document.getElementById('reader-current-title');
const readerContentArea = document.getElementById('reader-content-area');
const readerCloseBtn = document.getElementById('reader-close-btn');
const readerBody = document.getElementById('reader-body');
const readerProgressBar = document.getElementById('reader-progress-bar');
const prevChapterBtn = document.getElementById('prev-chapter-btn');
const nextChapterBtn = document.getElementById('next-chapter-btn');
const tocBtn = document.getElementById('toc-btn');

// Reader Settings Elements
const settingsToggleBtn = document.getElementById('settings-toggle-btn');
const settingsDropdown = document.getElementById('settings-dropdown');
const sizeDecBtn = document.getElementById('size-dec');
const sizeIncBtn = document.getElementById('size-inc');
const sizePercentEl = document.getElementById('current-size-percent');
const fontSelect = document.getElementById('font-select');
const themeBtns = document.querySelectorAll('.theme-select-btn');
const spacingTight = document.getElementById('spacing-tight');
const spacingNormal = document.getElementById('spacing-normal');
const spacingWide = document.getElementById('spacing-wide');

// TTS Elements
const ttsPlayBtn = document.getElementById('tts-play-btn');
const ttsStopBtn = document.getElementById('tts-stop-btn');

// Editor & Upload Elements
const editorTextarea = document.getElementById('editor-textarea');
const liveCharCount = document.getElementById('live-char-count');
const saveChapterBtn = document.getElementById('save-chapter-btn');
const editChapNum = document.getElementById('edit-chap-num');
const editChapType = document.getElementById('edit-chap-type');
const editChapTitle = document.getElementById('edit-chap-title');

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const uploadPreview = document.getElementById('upload-preview');
const previewFilename = document.getElementById('preview-filename');
const uploadBtn = document.getElementById('upload-btn');
const uploadStatus = document.getElementById('upload-status');

// Dashboard Elements
const dbTotalChapters = document.getElementById('db-total-chapters');
const dbTotalChars = document.getElementById('db-total-chars');
const dbTotalWords = document.getElementById('db-total-words');
const dbAvgChars = document.getElementById('db-avg-chars');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const searchResults = document.getElementById('search-results');
const tensionWaveform = document.getElementById('tension-waveform');
const keywordFrequencyList = document.getElementById('keyword-frequency-list');

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  loadChaptersList();
  initReaderSettings();
  initTTS();
  initEditorAndUpload();
  initDashboardEvents();
  applySavedStyles();
  applyLocalOnlyRestrictions();
});

function applyLocalOnlyRestrictions() {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (!isLocal) {
    if (editChapNum) editChapNum.disabled = true;
    if (editChapType) editChapType.disabled = true;
    if (editChapTitle) editChapTitle.disabled = true;
    if (editorTextarea) {
      editorTextarea.disabled = true;
      editorTextarea.placeholder = "소설 집필 기능은 로컬 실행 모드(localhost)에서만 가능합니다. 웹 배포 버전은 읽기 전용입니다.";
    }
    if (saveChapterBtn) {
      saveChapterBtn.disabled = true;
      saveChapterBtn.textContent = "로컬 모드에서만 저장 가능";
    }
    
    if (dropzone) {
      dropzone.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="upload-icon" style="color: var(--danger-color)"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <p>정적 호스팅 환경에서는 파일 업로드가 지원되지 않습니다.</p>
        <span class="file-hint">새 챕터를 추가하려면 로컬 폴더에 소설 파일을 넣고 Git으로 커밋/푸시하십시오.</span>
      `;
      // Clone dropzone to remove event listeners
      const newDropzone = dropzone.cloneNode(true);
      dropzone.parentNode.replaceChild(newDropzone, dropzone);
    }
  }
}

/* ==========================================================================
   NAVIGATION
   ========================================================================== */
function initNavigation() {
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-target');
      switchTab(targetTab);
    });
  });

  // Start Reading Button
  startReadingBtn.addEventListener('click', () => {
    if (state.lastReadChapterId !== null && state.chapters.some(c => c.id === state.lastReadChapterId)) {
      openReader(state.lastReadChapterId);
    } else if (state.chapters.length > 0) {
      openReader(state.chapters[0].id);
    }
  });

  // TOC button in reader navigation
  tocBtn.addEventListener('click', () => {
    switchTab('tab-home');
  });
}

function switchTab(tabId) {
  // Stop TTS if moving away from reader
  if (tabId !== 'tab-reader') {
    stopSpeech();
  }

  navButtons.forEach(btn => {
    if (btn.getAttribute('data-target') === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  tabPanes.forEach(pane => {
    if (pane.id === tabId) {
      pane.classList.add('active');
    } else {
      pane.classList.remove('active');
    }
  });

  if (tabId === 'tab-dashboard') {
    loadDashboardStats();
  }
}

/* ==========================================================================
   CHAPTER LOADING & LIST RENDERING
   ========================================================================== */
async function loadChaptersList() {
  try {
    const res = await fetch('data/chapters.json');
    const data = await res.json();
    state.chapters = data;
    renderChaptersGrid();
    updateMainStats();
  } catch (error) {
    console.error('Error fetching chapters list:', error);
    chaptersGrid.innerHTML = `<div class="empty-state">소설 목록을 불러오지 못했습니다. 서버를 점검해주세요.</div>`;
  }
}

function updateMainStats() {
  if (state.chapters.length === 0) return;

  const totalChars = state.chapters.reduce((sum, c) => sum + c.charCount, 0);
  const totalReadTime = state.chapters.reduce((sum, c) => sum + c.readingTime, 0);

  totalCharCountEl.textContent = `${totalChars.toLocaleString()}자`;
  totalChaptersEl.textContent = `${state.chapters.length}화`;
  avgReadTimeEl.textContent = `약 ${Math.round(totalReadTime / state.chapters.length)}분`;

  // Update quick reading button text based on last read chapter
  if (state.lastReadChapterId !== null) {
    const lastChap = state.chapters.find(c => c.id === state.lastReadChapterId);
    if (lastChap) {
      startReadingBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        이어서 읽기 (${lastChap.chapterNumber}${lastChap.type})
      `;
    }
  } else {
    startReadingBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      첫 챕터부터 읽기
    `;
  }
}

function renderChaptersGrid() {
  if (state.chapters.length === 0) {
    chaptersGrid.innerHTML = `<div class="empty-state">업로드된 챕터가 없습니다. '집필 / 업로드' 메뉴에서 첫 글을 올려보세요!</div>`;
    return;
  }

  chaptersGrid.innerHTML = state.chapters.map(c => `
    <div class="chapter-card" onclick="openReader(${c.id})">
      <div>
        <span class="card-num">${c.chapterNumber}${c.type}</span>
        <h4 class="card-title">${c.title}</h4>
      </div>
      <div class="card-stats">
        <span>독서 시간: 약 ${c.readingTime}분</span>
        <span>${c.charCount.toLocaleString()}자</span>
      </div>
    </div>
  `).join('');
}

/* ==========================================================================
   READER ENGINE
   ========================================================================== */
async function openReader(chapterId) {
  stopSpeech();
  state.currentChapterId = chapterId;
  state.lastReadChapterId = chapterId;
  localStorage.setItem('lastReadChapterId', chapterId);
  updateMainStats();

  // Enable Reader Tab Button
  navReaderBtn.removeAttribute('disabled');

  // Set Reader content loading state
  readerContentArea.innerHTML = `<div class="loading-spinner"></div>`;
  switchTab('tab-reader');

  try {
    const res = await fetch(`data/chapter-${chapterId}.json`);
    const chapter = await res.json();
    
    // Parse title
    const formattedTitle = `${chapter.chapterNumber}${chapter.type} : ${chapter.title}`;
    readerCurrentTitle.textContent = formattedTitle;

    // Split text by newlines and wrap in p tags
    const paragraphs = chapter.content
      .split('\n')
      .map(p => p.trim())
      .map(p => p ? `<p>${p}</p>` : `<p>&nbsp;</p>`)
      .join('');

    readerContentArea.innerHTML = `
      <h2>${formattedTitle}</h2>
      <div class="reader-text-paragraphs">
        ${paragraphs}
      </div>
    `;

    // Reset progress and scroll to top
    readerBody.scrollTop = 0;
    updateReaderProgress();

    // Configure Navigation Buttons
    const currIndex = state.chapters.findIndex(c => c.id === chapterId);
    prevChapterBtn.disabled = currIndex === 0;
    nextChapterBtn.disabled = currIndex === state.chapters.length - 1;
    
    prevChapterBtn.style.opacity = currIndex === 0 ? '0.3' : '1';
    nextChapterBtn.style.opacity = currIndex === state.chapters.length - 1 ? '0.3' : '1';

  } catch (error) {
    console.error('Error loading chapter content:', error);
    readerContentArea.innerHTML = `
      <div class="empty-state" style="color: var(--danger-color)">
        챕터 내용을 불러오는 데 실패했습니다. 파일을 다시 확인해주세요.
      </div>
    `;
  }
}

// Reader navigation actions
prevChapterBtn.addEventListener('click', () => {
  const currIndex = state.chapters.findIndex(c => c.id === state.currentChapterId);
  if (currIndex > 0) {
    openReader(state.chapters[currIndex - 1].id);
  }
});

nextChapterBtn.addEventListener('click', () => {
  const currIndex = state.chapters.findIndex(c => c.id === state.currentChapterId);
  if (currIndex < state.chapters.length - 1) {
    openReader(state.chapters[currIndex + 1].id);
  }
});

readerCloseBtn.addEventListener('click', () => {
  switchTab('tab-home');
});

// Scroll Progress Tracker
readerBody.addEventListener('scroll', updateReaderProgress);

function updateReaderProgress() {
  const scrollHeight = readerBody.scrollHeight - readerBody.clientHeight;
  if (scrollHeight <= 0) {
    readerProgressBar.style.width = '0%';
    return;
  }
  const scrolled = (readerBody.scrollTop / scrollHeight) * 100;
  readerProgressBar.style.width = `${scrolled}%`;
}

/* ==========================================================================
   READER CUSTOMIZATION & STYLING
   ========================================================================== */
function initReaderSettings() {
  // Toggle dropdown
  settingsToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    settingsDropdown.classList.toggle('show');
  });

  document.addEventListener('click', (e) => {
    if (!settingsDropdown.contains(e.target) && e.target !== settingsToggleBtn) {
      settingsDropdown.classList.remove('show');
    }
  });

  // Font Size
  sizeDecBtn.addEventListener('click', () => {
    if (state.fontSizePercent > 70) {
      state.fontSizePercent -= 10;
      updateFontSizeStyle();
    }
  });

  sizeIncBtn.addEventListener('click', () => {
    if (state.fontSizePercent < 200) {
      state.fontSizePercent += 10;
      updateFontSizeStyle();
    }
  });

  // Font Family
  fontSelect.addEventListener('change', (e) => {
    readerBody.classList.remove(state.fontClass);
    state.fontClass = e.target.value;
    readerBody.classList.add(state.fontClass);
    localStorage.setItem('readerFontClass', state.fontClass);
  });

  // Themes
  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      themeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const theme = btn.getAttribute('data-theme');
      // Apply theme to both full body and reader window depending on theme type
      document.body.className = theme;
      readerBody.className = `reader-viewport ${state.fontClass} ${state.spacingClass} ${theme}`;
      
      state.themeClass = theme;
      localStorage.setItem('readerThemeClass', theme);
    });
  });

  // Line Spacing
  spacingTight.addEventListener('click', () => changeSpacing('spacing-tight-val', spacingTight));
  spacingNormal.addEventListener('click', () => changeSpacing('spacing-normal-val', spacingNormal));
  spacingWide.addEventListener('click', () => changeSpacing('spacing-wide-val', spacingWide));
}

function changeSpacing(spacingClass, activeBtn) {
  [spacingTight, spacingNormal, spacingWide].forEach(btn => btn.classList.remove('active'));
  activeBtn.classList.add('active');

  readerBody.classList.remove(state.spacingClass);
  state.spacingClass = spacingClass;
  readerBody.classList.add(state.spacingClass);
  localStorage.setItem('readerSpacingClass', spacingClass);
}

function updateFontSizeStyle() {
  sizePercentEl.textContent = `${state.fontSizePercent}%`;
  readerContentArea.style.fontSize = `${state.fontSizePercent / 100}rem`;
  localStorage.setItem('readerFontSize', state.fontSizePercent);
}

function applySavedStyles() {
  // Apply saved Font Family
  fontSelect.value = state.fontClass;
  readerBody.classList.add(state.fontClass);

  // Apply saved Size
  updateFontSizeStyle();

  // Apply saved Spacing
  readerBody.classList.remove('spacing-normal-val');
  readerBody.classList.add(state.spacingClass);
  const spacingBtn = state.spacingClass === 'spacing-tight-val' ? spacingTight :
                     state.spacingClass === 'spacing-wide-val' ? spacingWide : spacingNormal;
  spacingBtn.classList.add('active');

  // Apply saved Theme
  document.body.className = state.themeClass;
  readerBody.classList.add(state.themeClass);
  themeBtns.forEach(btn => {
    if (btn.getAttribute('data-theme') === state.themeClass) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

/* ==========================================================================
   TEXT TO SPEECH (TTS) AUDIO
   ========================================================================== */
function initTTS() {
  ttsPlayBtn.addEventListener('click', () => {
    if (state.isTtsSpeaking) {
      if (state.isTtsPaused) {
        resumeSpeech();
      } else {
        pauseSpeech();
      }
    } else {
      startSpeech();
    }
  });

  ttsStopBtn.addEventListener('click', () => {
    stopSpeech();
  });
}

function startSpeech() {
  // Stop existing speech
  window.speechSynthesis.cancel();
  
  // Extract all text paragraphs
  const title = readerCurrentTitle.textContent;
  const paragraphs = Array.from(readerContentArea.querySelectorAll('.reader-text-paragraphs p'))
                          .map(p => p.innerText.trim())
                          .filter(txt => txt.length > 0 && txt !== ' ');
  
  const fullTextToRead = [title, ...paragraphs].join('\n\n');
  
  state.ttsUtterance = new SpeechSynthesisUtterance(fullTextToRead);
  state.ttsUtterance.lang = 'ko-KR'; // Korean
  state.ttsUtterance.rate = 1.0;     // Standard Speed

  // Set event handlers
  state.ttsUtterance.onstart = () => {
    state.isTtsSpeaking = true;
    state.isTtsPaused = false;
    ttsPlayBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
    `;
    ttsPlayBtn.title = "음성 낭독 일시정지";
    ttsStopBtn.classList.remove('hidden');
  };

  state.ttsUtterance.onend = () => {
    resetTtsUI();
  };

  state.ttsUtterance.onerror = () => {
    resetTtsUI();
  };

  window.speechSynthesis.speak(state.ttsUtterance);
}

function pauseSpeech() {
  window.speechSynthesis.pause();
  state.isTtsPaused = true;
  ttsPlayBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
  `;
  ttsPlayBtn.title = "음성 낭독 이어듣기";
}

function resumeSpeech() {
  window.speechSynthesis.resume();
  state.isTtsPaused = false;
  ttsPlayBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
  `;
  ttsPlayBtn.title = "음성 낭독 일시정지";
}

function stopSpeech() {
  window.speechSynthesis.cancel();
  resetTtsUI();
}

function resetTtsUI() {
  state.isTtsSpeaking = false;
  state.isTtsPaused = false;
  state.ttsUtterance = null;
  ttsPlayBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
  `;
  ttsPlayBtn.title = "음성 낭독 시작";
  ttsStopBtn.classList.add('hidden');
}

/* ==========================================================================
   집필 및 파일 업로드 포털
   ========================================================================== */
function initEditorAndUpload() {
  // Live Char Counter
  editorTextarea.addEventListener('input', () => {
    const chars = editorTextarea.value.replace(/\s/g, '').length;
    liveCharCount.textContent = chars.toLocaleString();
  });

  // Save Button Handler
  saveChapterBtn.addEventListener('click', async () => {
    const num = editChapNum.value.trim();
    const type = editChapType.value;
    const title = editChapTitle.value.trim();
    const content = editorTextarea.value.trim();

    if (!num || !title || !content) {
      alert('모든 필드(번호, 제목, 내용)를 작성해주세요.');
      return;
    }

    const payload = {
      chapterNumber: parseInt(num, 10),
      type,
      title,
      content
    };

    saveChapterBtn.disabled = true;
    saveChapterBtn.textContent = '저장 중...';

    try {
      const res = await fetch('/api/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (res.ok) {
        alert(`성공: [${data.filename}] 파일로 로컬 저장소에 기재 완료.`);
        // Reset Editor
        editChapNum.value = '';
        editChapTitle.value = '';
        editorTextarea.value = '';
        liveCharCount.textContent = '0';
        // Reload List
        await loadChaptersList();
        switchTab('tab-home');
      } else {
        alert(`오류: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('서버 전송 중 예외가 발생했습니다.');
    } finally {
      saveChapterBtn.disabled = false;
      saveChapterBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        파일로 저장하기
      `;
    }
  });

  // Drag and Drop File Upload
  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  ['dragleave', 'dragend'].forEach(evt => {
    dropzone.addEventListener(evt, () => dropzone.classList.remove('dragover'));
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleFileSelection(fileInput.files[0]);
    }
  });

  // Upload Button Trigger
  uploadBtn.addEventListener('click', async () => {
    const file = fileInput.files[0] || dropzone.selectedFile;
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    uploadBtn.disabled = true;
    uploadBtn.textContent = '업로드 중...';
    uploadStatus.className = 'upload-status';
    uploadStatus.textContent = '';

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (res.ok) {
        uploadStatus.classList.add('success');
        uploadStatus.textContent = `완료: ${data.filename} 업로드 완료.`;
        // Hide preview
        uploadPreview.classList.add('hidden');
        dropzone.selectedFile = null;
        fileInput.value = '';
        
        await loadChaptersList();
        setTimeout(() => {
          switchTab('tab-home');
          uploadStatus.textContent = '';
        }, 1500);
      } else {
        uploadStatus.classList.add('error');
        uploadStatus.textContent = `실패: ${data.error}`;
      }
    } catch (err) {
      console.error(err);
      uploadStatus.classList.add('error');
      uploadStatus.textContent = '서버 통신 중 예외 에러 발생.';
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = '업로드 실행';
    }
  });
}

function handleFileSelection(file) {
  if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
    alert('.txt 확장자를 가진 소설 텍스트 파일만 첨부할 수 있습니다.');
    return;
  }
  
  dropzone.selectedFile = file;
  previewFilename.textContent = file.name;
  uploadPreview.classList.remove('hidden');
  uploadStatus.textContent = '';
}

/* ==========================================================================
   OBSERVATION CONSOLE (DASHBOARD) LUNCH & SEARCH
   ========================================================================== */
async function loadDashboardStats() {
  // Show Loading States in UI
  tensionWaveform.innerHTML = `<div class="loading-spinner"></div>`;
  keywordFrequencyList.innerHTML = `<div class="loading-spinner"></div>`;

  try {
    const res = await fetch('data/stats.json');
    const stats = await res.json();

    // Summary Cards
    dbTotalChapters.textContent = `${stats.chapterCount}화`;
    dbTotalChars.textContent = `${stats.totalCharacters.toLocaleString()}자`;
    dbTotalWords.textContent = `${stats.totalWords.toLocaleString()}단어`;
    dbAvgChars.textContent = `${stats.averageLength.toLocaleString()}자`;

    // Tension Index oscilloscope graph render
    renderTensionChart(stats.tensionIndex);

    // Keyword frequencies sums render
    renderKeywordFrequencies(stats.characterMentions);

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    tensionWaveform.innerHTML = `<div class="empty-state">통계 분석 데이터를 받아오지 못했습니다.</div>`;
    keywordFrequencyList.innerHTML = `<div class="empty-state">데이터 연산 오류.</div>`;
  }
}

function renderTensionChart(tensionData) {
  if (!tensionData || tensionData.length === 0) {
    tensionWaveform.innerHTML = `<div class="empty-state">분석 가능한 에피소드 데이터가 부족합니다.</div>`;
    return;
  }

  tensionWaveform.innerHTML = tensionData.map(item => {
    // Generate height
    const height = Math.max(12, item.tensionScore);
    
    // Select color highlight depending on tension level
    let tensionClass = 'bg-primary';
    if (item.tensionScore > 75) tensionClass = 'high-tension';
    
    return `
      <div class="waveform-bar-wrapper" onclick="openReader(${item.chapterId})">
        <div class="waveform-bar ${tensionClass}" style="height: ${height}%">
          <div class="waveform-tooltip">
            <strong>${item.title}</strong><br>
            Tension: ${item.tensionScore}%
          </div>
        </div>
        <div class="waveform-label">${item.chapterId}화</div>
      </div>
    `;
  }).join('');
}

function renderKeywordFrequencies(mentionsData) {
  if (!mentionsData || mentionsData.length === 0) {
    keywordFrequencyList.innerHTML = `<div class="empty-state">키워드가 추출되지 않았습니다.</div>`;
    return;
  }

  // Calculate totals of key characters
  const keywords = ['도형', '장로', '교회', 'CCTV', 'AI', '경고', '비밀'];
  const totals = {};
  keywords.forEach(kw => totals[kw] = 0);

  mentionsData.forEach(item => {
    keywords.forEach(kw => {
      totals[kw] += (item[kw] || 0);
    });
  });

  // Find max total to normalize bars
  const maxCount = Math.max(...Object.values(totals), 1);

  keywordFrequencyList.innerHTML = keywords.map(kw => {
    const count = totals[kw];
    const percentage = Math.round((count / maxCount) * 100);

    return `
      <div class="kw-row">
        <div class="kw-meta">
          <span class="kw-name">"${kw}"</span>
          <span class="kw-val">${count}회 검출</span>
        </div>
        <div class="kw-bar-track">
          <div class="kw-bar-fill" style="width: ${percentage}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

function initDashboardEvents() {
  searchBtn.addEventListener('click', executeDashboardSearch);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') executeDashboardSearch();
  });
}

// Client-side full text index search inside all loaded chapter contents
async function executeDashboardSearch() {
  const query = searchInput.value.trim();
  if (!query) {
    searchResults.innerHTML = `<div class="empty-state">검색어를 입력하세요.</div>`;
    return;
  }

  searchResults.innerHTML = `<div class="loading-spinner"></div>`;

  try {
    const results = [];
    
    // We fetch each chapter and check for occurrences
    for (const chapter of state.chapters) {
      const res = await fetch(`data/chapter-${chapter.id}.json`);
      const detailed = await res.json();
      
      const content = detailed.content;
      const regex = new RegExp(query, 'gi');
      const matches = content.match(regex);
      
      if (matches) {
        // Find matching lines
        const lines = content.split('\n');
        const snippets = [];
        
        lines.forEach(line => {
          if (line.toLowerCase().includes(query.toLowerCase())) {
            // Highlight matching word in the line
            const highlightedLine = line.replace(
              new RegExp(`(${query})`, 'gi'), 
              '<span class="search-match-highlight">$1</span>'
            );
            snippets.push(highlightedLine.trim());
          }
        });

        // Limit snippets to first 3 matches to keep dashboard clean
        results.push({
          chapterId: chapter.id,
          title: chapter.title,
          type: chapter.type,
          count: matches.length,
          snippets: snippets.slice(0, 3)
        });
      }
    }

    if (results.length === 0) {
      searchResults.innerHTML = `<div class="empty-state">"${query}" 키워드 매칭 로그가 탐지되지 않았습니다.</div>`;
      return;
    }

    searchResults.innerHTML = results.map(res => `
      <div class="search-result-item">
        <div class="search-res-header">
          <span class="search-res-chap" onclick="openReader(${res.chapterId})">${res.chapterId}${res.type} : ${res.title}</span>
          <span class="search-res-count">${res.count}회 검출됨</span>
        </div>
        <div class="search-res-snippets">
          ${res.snippets.map(s => `• ... ${s} ...`).join('<br>')}
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('Search query failed:', error);
    searchResults.innerHTML = `<div class="empty-state" style="color: var(--danger-color)">로그 파일 검색 중 오류가 발생했습니다.</div>`;
  }
}
