// 主应用逻辑
(function () {
  const CJK_REGEX = /[\u4e00-\u9fff]/;
  const DRAWING_WIDTH = 28;
  const REFERENCE_COLOR = '#f0a8a8'; // 效果图里字帖参考笔画的颜色（淡红色）
  const DEFAULT_PRACTICE_TEXT = '春眠不觉晓';

  // ---- 多语言 ----
  const I18N = {
    en: {
      title: 'Chinese Character Tracing',
      subtitle: 'Enter Chinese characters to trace them one by one',
      placeholder: 'e.g. 春眠不觉晓 (leave blank to use the sample)',
      start: 'Start',
      history: 'History',
      back: 'Back',
      hint: 'Hint',
      langToggleLabel: '中文',
      clear: 'Clear',
      next: 'Next',
      done: 'Done',
      mistakes: (n) => `${n} mistake${n === 1 ? '' : 's'}`,
      allCorrect: 'All correct!',
      errorNoChar: 'Please enter at least one Chinese character',
      summaryTitle: 'Practice Results',
      summaryScore: (correct, total) => `${correct} / ${total} correct on first try`,
      restart: 'Practice Again',
      historyTitle: 'History',
      historyEmpty: 'No practice records yet',
      historyMeta: (correct, total) => `${correct}/${total} correct on first try`,
      dateLocale: 'en-US',
      chooseCharacters: 'Choose Characters',
      pickerTitle: 'Choose Characters',
      groupLabel: (n) => `Group ${n}`,
    },
    zh: {
      title: '汉字描红练习',
      subtitle: '输入一行汉字，逐字描红练习',
      placeholder: '例如：春眠不觉晓（留空则使用示例）',
      start: '开始练习',
      history: '历史记录',
      back: '返回',
      hint: '提示',
      langToggleLabel: 'English',
      clear: '清除重写',
      next: '下一个',
      done: '完成',
      mistakes: (n) => `写错 ${n} 次`,
      allCorrect: '全部正确！',
      errorNoChar: '请输入至少一个汉字',
      summaryTitle: '本次练习成果',
      summaryScore: (correct, total) => `${correct} / ${total} 个字一次写对`,
      restart: '再练一行',
      historyTitle: '历史记录',
      historyEmpty: '还没有练习记录',
      historyMeta: (correct, total) => `${correct}/${total} 一次写对`,
      dateLocale: 'zh-CN',
      chooseCharacters: '选字练习',
      pickerTitle: '选字练习',
      groupLabel: (n) => `第 ${n} 组`,
    },
  };

  let lang = localStorage.getItem('hanzi-lang') || 'en';
  function t(key) {
    return I18N[lang][key];
  }

  // ---- 状态 ----
  let currentPractice = null; // { id, text, createdAt, chars: [] }
  let currentChars = [];      // 本次输入的汉字数组（过滤后）
  let currentIndex = 0;
  let currentWriter = null;
  let currentMistakeCount = 0;
  let quizCompleted = false;
  let charBoxSize = 300;
  let hintEnabled = localStorage.getItem('hanzi-hint-enabled') === 'true';

  // ---- DOM ----
  const screens = {
    input: document.getElementById('screen-input'),
    practice: document.getElementById('screen-practice'),
    summary: document.getElementById('screen-summary'),
    history: document.getElementById('screen-history'),
    picker: document.getElementById('screen-picker'),
  };

  const inputText = document.getElementById('input-text');
  const inputError = document.getElementById('input-error');
  const btnStart = document.getElementById('btn-start');
  const btnGotoHistory = document.getElementById('btn-goto-history');
  const btnGotoPicker = document.getElementById('btn-goto-picker');

  const btnBackInput = document.getElementById('btn-back-input');
  const btnBackInput2 = document.getElementById('btn-back-input-2');
  const btnBackInput3 = document.getElementById('btn-back-input-3');
  const pickerTitleEl = document.getElementById('picker-title');
  const gradeTabsEl = document.getElementById('grade-tabs');
  const groupListEl = document.getElementById('group-list');
  let selectedGradeId = localStorage.getItem('hanzi-picker-grade') || (CHARACTER_GRADES[0] && CHARACTER_GRADES[0].id);
  const practiceProgress = document.getElementById('practice-progress');
  const practiceMistakes = document.getElementById('practice-mistakes');
  const hintToggleInput = document.getElementById('hint-toggle-input');
  const hintLabel = document.getElementById('hint-label');
  const langToggleBtn = document.getElementById('lang-toggle');
  const langToggleInputBtn = document.getElementById('lang-toggle-input');
  const charBox = document.getElementById('char-box');
  const btnClear = document.getElementById('btn-clear');
  const btnNext = document.getElementById('btn-next');

  const summaryText = document.getElementById('summary-text');
  const summaryScore = document.getElementById('summary-score');
  const summaryGrid = document.getElementById('summary-grid');
  const btnRestart = document.getElementById('btn-restart');

  const historyList = document.getElementById('history-list');

  // ---- 屏幕切换 ----
  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove('active'));
    screens[name].classList.add('active');
  }

  // ---- 多语言应用 ----
  function applyLanguage() {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.getElementById('page-title').textContent = t('title');
    document.getElementById('app-title').textContent = t('title');
    document.getElementById('app-subtitle').textContent = t('subtitle');
    inputText.placeholder = t('placeholder');
    btnStart.textContent = t('start');
    btnGotoHistory.textContent = t('history');
    btnGotoPicker.textContent = t('chooseCharacters');
    btnBackInput.title = t('back');
    btnBackInput2.title = t('back');
    btnBackInput3.title = t('back');
    pickerTitleEl.textContent = t('pickerTitle');
    hintLabel.textContent = t('hint');
    langToggleBtn.textContent = t('langToggleLabel');
    langToggleInputBtn.textContent = t('langToggleLabel');
    btnClear.textContent = t('clear');
    btnNext.textContent =
      currentChars.length && currentIndex === currentChars.length - 1 ? t('done') : t('next');
    document.getElementById('summary-title').textContent = t('summaryTitle');
    btnRestart.textContent = t('restart');
    document.getElementById('history-title').textContent = t('historyTitle');
    updateMistakesText();
  }

  function toggleLanguage() {
    lang = lang === 'en' ? 'zh' : 'en';
    localStorage.setItem('hanzi-lang', lang);
    applyLanguage();
    if (screens.summary.classList.contains('active') && currentPractice) {
      renderSummary(currentPractice);
    }
    if (screens.history.classList.contains('active')) {
      renderHistory();
    }
    if (screens.picker.classList.contains('active')) {
      renderPicker();
    }
  }

  langToggleBtn.addEventListener('click', toggleLanguage);
  langToggleInputBtn.addEventListener('click', toggleLanguage);

  // ---- 选字练习页 ----
  function renderPicker() {
    gradeTabsEl.innerHTML = '';
    CHARACTER_GRADES.forEach((grade) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'grade-tab' + (grade.id === selectedGradeId ? ' active' : '');
      tab.textContent = grade.name[lang] || grade.name.en;
      tab.addEventListener('click', () => {
        selectedGradeId = grade.id;
        localStorage.setItem('hanzi-picker-grade', selectedGradeId);
        renderPicker();
      });
      gradeTabsEl.appendChild(tab);
    });

    const grade = CHARACTER_GRADES.find((g) => g.id === selectedGradeId) || CHARACTER_GRADES[0];
    groupListEl.innerHTML = '';
    if (!grade) return;
    grade.groups.forEach((chars, i) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'group-card';

      const label = document.createElement('div');
      label.className = 'g-label';
      label.textContent = t('groupLabel')(i + 1);
      card.appendChild(label);

      const charsEl = document.createElement('div');
      charsEl.className = 'g-chars';
      charsEl.textContent = chars.join(' ');
      card.appendChild(charsEl);

      card.addEventListener('click', () => {
        startPractice(chars.join(''), chars);
      });

      groupListEl.appendChild(card);
    });
  }

  btnGotoPicker.addEventListener('click', () => {
    renderPicker();
    showScreen('picker');
  });

  btnBackInput3.addEventListener('click', () => {
    showScreen('input');
  });

  // ---- 输入页 ----
  btnStart.addEventListener('click', () => {
    let raw = inputText.value.trim();
    if (raw === '') raw = DEFAULT_PRACTICE_TEXT;
    const chars = Array.from(raw).filter((c) => CJK_REGEX.test(c));
    if (chars.length === 0) {
      inputError.textContent = t('errorNoChar');
      return;
    }
    inputError.textContent = '';
    startPractice(raw, chars);
  });

  btnGotoHistory.addEventListener('click', () => {
    renderHistory();
    showScreen('history');
  });

  btnBackInput.addEventListener('click', () => {
    if (currentWriter) {
      currentWriter = null;
    }
    showScreen('input');
  });

  btnBackInput2.addEventListener('click', () => {
    showScreen('input');
  });

  // ---- 初始应用语言 ----
  applyLanguage();

  // ---- 提示模式开关 ----
  hintToggleInput.checked = hintEnabled;
  hintToggleInput.addEventListener('change', () => {
    hintEnabled = hintToggleInput.checked;
    localStorage.setItem('hanzi-hint-enabled', String(hintEnabled));
    if (currentWriter) {
      startQuiz();
    }
  });

  // ---- 开始一次练习 ----
  function startPractice(rawText, chars) {
    currentChars = chars;
    currentIndex = 0;
    currentPractice = {
      text: rawText,
      createdAt: Date.now(),
      chars: [],
    };
    showScreen('practice');
    loadChar(currentIndex);
  }

  // ---- 提示文字更新（写错次数 / 全部正确） ----
  function updateMistakesText() {
    if (!currentWriter) {
      practiceMistakes.textContent = '';
      return;
    }
    if (quizCompleted) {
      practiceMistakes.textContent =
        currentMistakeCount === 0 ? t('allCorrect') : t('mistakes')(currentMistakeCount);
    } else {
      practiceMistakes.textContent = currentMistakeCount > 0 ? t('mistakes')(currentMistakeCount) : '';
    }
  }

  // ---- 加载第 index 个字进行描红 ----
  function loadChar(index) {
    currentMistakeCount = 0;
    quizCompleted = false;
    practiceMistakes.textContent = '';
    practiceProgress.textContent = `${index + 1} / ${currentChars.length}`;
    btnNext.textContent = index === currentChars.length - 1 ? t('done') : t('next');

    const target = document.getElementById('character-target');
    target.innerHTML = '';

    charBoxSize = charBox.clientWidth;

    currentWriter = HanziWriter.create('character-target', currentChars[index], {
      width: charBoxSize,
      height: charBoxSize,
      padding: Math.round(charBoxSize * 0.06),
      showOutline: true,
      strokeAnimationSpeed: 1,
      delayBetweenStrokes: 100,
      strokeColor: '#2b2b2b',
      outlineColor: '#dddddd',
      highlightColor: '#8aa9f7',
      drawingWidth: DRAWING_WIDTH,
      highlightOnComplete: false,
    });

    startQuiz();
  }

  function startQuiz() {
    currentMistakeCount = 0;
    quizCompleted = false;
    practiceMistakes.textContent = '';
    currentWriter.quiz({
      onMistake: function () {
        currentMistakeCount += 1;
        updateMistakesText();
      },
      onCorrectStroke: function (strokeData) {
        if (hintEnabled && strokeData.strokesRemaining > 0) {
          currentWriter.highlightStroke(strokeData.strokeNum + 1);
        }
      },
      onComplete: function (summaryData) {
        // 用户描完整个字（笔画顺序判定完成）
        quizCompleted = true;
        updateMistakesText();
      },
    });
    if (hintEnabled) {
      currentWriter.highlightStroke(0);
    }
  }

  // ---- 清除重写 ----
  btnClear.addEventListener('click', () => {
    if (currentWriter) {
      startQuiz();
    }
  });

  // ---- 下一个 / 完成 ----
  btnNext.addEventListener('click', async () => {
    const snapshot = captureSnapshot();
    currentPractice.chars.push({
      char: currentChars[currentIndex],
      strokeImage: snapshot,
      mistakeCount: currentMistakeCount,
      isCorrect: currentMistakeCount === 0,
      completedAt: Date.now(),
    });

    if (currentIndex < currentChars.length - 1) {
      currentIndex += 1;
      loadChar(currentIndex);
    } else {
      await finishPractice();
    }
  });

  // ---- 把当前 SVG 描红结果转成 PNG dataURL ----
  function captureSnapshot() {
    try {
      const svg = document.querySelector('#character-target svg');
      if (!svg) return null;
      const clone = svg.cloneNode(true);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('width', charBoxSize);
      clone.setAttribute('height', charBoxSize);

      // hanzi-writer 写对一笔后，会把用户实际写下的笔迹淡出（drawingFadeDuration），
      // 换成它自己“标准”的笔画形状；克隆到的 DOM 里用户笔迹的 opacity 已经是 0。
      // 这些路径本身的形状（d 属性）是对的，只是被淡出了，所以只需要把透明度改回来即可，
      // 不需要也不应该自己重新计算路径坐标（尝试过，坐标系对不上，画出来的位置完全错误）。
      const drawnPaths = clone.querySelectorAll('path[stroke-width="' + DRAWING_WIDTH + '"]');
      drawnPaths.forEach((path) => {
        path.removeAttribute('opacity');
        path.style.opacity = '1';
      });

      // 字帖参考笔画（田字格里的浅灰轮廓 + 写对后显示的标准笔画）改成淡红色，
      // 和用户自己写的黑色笔画区分开，方便对比效果图。
      const referenceStrokeColors = ['rgba(221,221,221,1)', 'rgba(43,43,43,1)'];
      clone.querySelectorAll('path[stroke]').forEach((path) => {
        if (referenceStrokeColors.includes(path.getAttribute('stroke'))) {
          path.setAttribute('stroke', REFERENCE_COLOR);
        }
      });

      let svgString = new XMLSerializer().serializeToString(clone);
      // hanzi-writer 的 clip-path 引用带完整页面 URL（如 url("http://.../#mask-1")），
      // 在 <img> 中作为独立文档渲染时无法解析，导致裁剪失效、笔画整体变成一大团。
      // 去掉 URL 前缀，只保留 #fragment，使其在导出的图片里也能正确裁剪。
      svgString = svgString.replace(/url\(&quot;https?:\/\/[^#&]*#/g, 'url(&quot;#');
      const svgData = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));

      const canvas = document.createElement('canvas');
      canvas.width = charBoxSize;
      canvas.height = charBoxSize;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, charBoxSize, charBoxSize);

      // 同步方式尝试：先返回 svg dataURL，异步再升级为 png（存储时用 svg 也可以显示）
      return svgData;
    } catch (err) {
      console.error('截图失败', err);
      return null;
    }
  }

  // ---- 完成整行练习 ----
  async function finishPractice() {
    try {
      await DB.savePractice(currentPractice);
    } catch (err) {
      console.error('保存练习记录失败', err);
    }
    renderSummary(currentPractice);
    showScreen('summary');
  }

  // ---- 渲染汇总页 ----
  function renderSummary(practice) {
    summaryText.textContent = practice.text;
    const correctCount = practice.chars.filter((c) => c.isCorrect).length;
    summaryScore.textContent = t('summaryScore')(correctCount, practice.chars.length);

    summaryGrid.innerHTML = '';
    practice.chars.forEach((c) => {
      const item = document.createElement('div');
      item.className = 'summary-item';

      const img = document.createElement('img');
      img.src = c.strokeImage || '';
      img.alt = c.char;
      item.appendChild(img);

      const badge = document.createElement('div');
      badge.className = 'summary-badge ' + (c.isCorrect ? 'badge-correct' : 'badge-wrong');
      badge.textContent = c.isCorrect ? '✓' : '✕';
      item.appendChild(badge);

      summaryGrid.appendChild(item);
    });
  }

  btnRestart.addEventListener('click', () => {
    inputText.value = '';
    showScreen('input');
  });

  // ---- 历史记录 ----
  async function renderHistory() {
    historyList.innerHTML = '';
    let records = [];
    try {
      records = await DB.getAllPractices();
    } catch (err) {
      console.error('读取历史记录失败', err);
    }

    if (records.length === 0) {
      historyList.innerHTML = `<div class="history-empty">${t('historyEmpty')}</div>`;
      return;
    }

    records.forEach((rec) => {
      const item = document.createElement('div');
      item.className = 'history-item';

      const textEl = document.createElement('div');
      textEl.className = 'h-text';
      textEl.textContent = rec.text;
      item.appendChild(textEl);

      const correctCount = rec.chars.filter((c) => c.isCorrect).length;
      const metaEl = document.createElement('div');
      metaEl.className = 'h-meta';
      const date = new Date(rec.createdAt);
      metaEl.textContent = `${date.toLocaleString(t('dateLocale'))} · ${t('historyMeta')(correctCount, rec.chars.length)}`;
      item.appendChild(metaEl);

      item.addEventListener('click', () => {
        renderSummary(rec);
        currentPractice = rec;
        showScreen('summary');
      });

      historyList.appendChild(item);
    });
  }
})();
