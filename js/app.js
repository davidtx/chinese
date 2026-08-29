// 主应用逻辑
(function () {
  const CJK_REGEX = /[\u4e00-\u9fff]/;

  // ---- 状态 ----
  let currentPractice = null; // { id, text, createdAt, chars: [] }
  let currentChars = [];      // 本次输入的汉字数组（过滤后）
  let currentIndex = 0;
  let currentWriter = null;
  let currentMistakeCount = 0;
  let charBoxSize = 300;

  // ---- DOM ----
  const screens = {
    input: document.getElementById('screen-input'),
    practice: document.getElementById('screen-practice'),
    summary: document.getElementById('screen-summary'),
    history: document.getElementById('screen-history'),
  };

  const inputText = document.getElementById('input-text');
  const inputError = document.getElementById('input-error');
  const btnStart = document.getElementById('btn-start');
  const btnGotoHistory = document.getElementById('btn-goto-history');

  const btnBackInput = document.getElementById('btn-back-input');
  const btnBackInput2 = document.getElementById('btn-back-input-2');
  const practiceProgress = document.getElementById('practice-progress');
  const practiceMistakes = document.getElementById('practice-mistakes');
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

  // ---- 输入页 ----
  btnStart.addEventListener('click', () => {
    const raw = inputText.value.trim();
    const chars = Array.from(raw).filter((c) => CJK_REGEX.test(c));
    if (chars.length === 0) {
      inputError.textContent = '请输入至少一个汉字';
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

  // ---- 加载第 index 个字进行描红 ----
  function loadChar(index) {
    currentMistakeCount = 0;
    practiceMistakes.textContent = '';
    practiceProgress.textContent = `${index + 1} / ${currentChars.length}`;
    btnNext.textContent = index === currentChars.length - 1 ? '完成' : '下一个';

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
      drawingWidth: 28,
      highlightOnComplete: false,
    });

    startQuiz();
  }

  function startQuiz() {
    currentMistakeCount = 0;
    practiceMistakes.textContent = '';
    currentWriter.quiz({
      onMistake: function () {
        currentMistakeCount += 1;
        practiceMistakes.textContent = `写错 ${currentMistakeCount} 次`;
      },
      onCorrectStroke: function () {
        // 每写对一笔可在此加反馈动效，目前保持简洁
      },
      onComplete: function (summaryData) {
        // 用户描完整个字（笔画顺序判定完成）
        practiceMistakes.textContent =
          currentMistakeCount === 0 ? '全部正确！' : `写错 ${currentMistakeCount} 次`;
      },
    });
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
      const svgString = new XMLSerializer().serializeToString(clone);
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
    summaryScore.textContent = `${correctCount} / ${practice.chars.length} 个字一次写对`;

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
      historyList.innerHTML = '<div class="history-empty">还没有练习记录</div>';
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
      metaEl.textContent = `${date.toLocaleString()} · ${correctCount}/${rec.chars.length} 一次写对`;
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
