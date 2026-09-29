import { STUDENTS, AUTHORS } from './students.js';
import { TOPICS } from './topics.js';
import { QUESTIONS } from './questions.js';
import { sounds } from './audio.js';
import { FortuneWheel } from './wheel.js';
import { ConfettiEngine } from './confetti.js';
import { CellsManager, PROMO_CODE_INFO } from './cells.js';
import { realtime } from './realtime.js';

class QuizApp {
  constructor() {
    this.confetti = new ConfettiEngine();
    this.cellsManager = new CellsManager();
    this.loadState();

    this.currentRole = 'admin'; // 'admin' or 'player'
    this.myStudent = null; // for player mode

    this.selectedStudent = null;
    this.selectedTopic = null;
    this.currentQuestion = null;
    this.currentMultiplier = 1;

    this.timerInterval = null;
    this.timeLeft = 30;
    this.timerTotal = 30;

    this.wheelMode = 'students';
    this.gameTabMode = 'cells'; // 'cells' or 'wheel'

    this.buzzerLocked = false;
    this.buzzerWinner = null;

    this.initElements();
    this.checkUrlRole();
    this.initRealtimeListeners();
    this.initWheel();
    this.renderAuthors();
    this.renderMysteryCells();
    this.renderScoreboard();
    this.renderTopicsGrid();
    this.renderPlayerPicker();
    this.bindEvents();
    this.updateStats();
  }

  loadState() {
    try {
      const savedStudents = localStorage.getItem('kazakh_quiz_students_v2');
      if (savedStudents) {
        this.students = JSON.parse(savedStudents);
      } else {
        this.students = JSON.parse(JSON.stringify(STUDENTS));
      }

      const savedUsed = localStorage.getItem('kazakh_quiz_used_q_v2');
      this.usedQuestionIds = savedUsed ? new Set(JSON.parse(savedUsed)) : new Set();

      const savedMyId = localStorage.getItem('kazakh_quiz_my_id');
      if (savedMyId) {
        this.myStudent = this.students.find(s => s.id === parseInt(savedMyId, 10)) || null;
      }
    } catch (e) {
      this.students = JSON.parse(JSON.stringify(STUDENTS));
      this.usedQuestionIds = new Set();
    }
  }

  saveState() {
    try {
      localStorage.setItem('kazakh_quiz_students_v2', JSON.stringify(this.students));
      localStorage.setItem('kazakh_quiz_used_q_v2', JSON.stringify(Array.from(this.usedQuestionIds)));
      realtime.emit('SYNC_SCORES', { students: this.students });
    } catch (e) {}
  }

  checkUrlRole() {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role');
    if (roleParam === 'player' || window.innerWidth <= 600) {
      this.setRole('player');
    } else {
      this.setRole('admin');
    }
  }

  setRole(role) {
    this.currentRole = role;
    if (role === 'player') {
      this.viewAdmin.classList.add('hidden');
      this.viewPlayer.classList.remove('hidden');
      this.btnRolePlayer.classList.add('active');
      this.btnRoleAdmin.classList.remove('active');
      this.updatePlayerScreenState();
    } else {
      this.viewPlayer.classList.add('hidden');
      this.viewAdmin.classList.remove('hidden');
      this.btnRoleAdmin.classList.add('active');
      this.btnRolePlayer.classList.remove('active');
    }
  }

  initElements() {
    // Views and Navigation
    this.viewAdmin = document.getElementById('view-admin');
    this.viewPlayer = document.getElementById('view-player');
    this.btnRoleAdmin = document.getElementById('btn-role-admin');
    this.btnRolePlayer = document.getElementById('btn-role-player');
    this.btnShareLink = document.getElementById('btn-share-link');

    // Admin Buzzer monitor
    this.buzzerWinnerText = document.getElementById('buzzer-winner-text');
    this.btnResetBuzzer = document.getElementById('btn-reset-buzzer');

    // Mystery Cells vs Wheel Tabs
    this.tabGameCells = document.getElementById('tab-game-cells');
    this.tabGameWheel = document.getElementById('tab-game-wheel');
    this.containerCellsView = document.getElementById('container-cells-view');
    this.containerWheelView = document.getElementById('container-wheel-view');
    this.mysteryCellsGrid = document.getElementById('mystery-cells-grid');
    this.btnShuffleCells = document.getElementById('btn-shuffle-cells');

    // Wheel Elements
    this.btnSpin = document.getElementById('btn-spin');
    this.modeStudentsTab = document.getElementById('tab-mode-students');
    this.modeTopicsTab = document.getElementById('tab-mode-topics');

    // Turn Card elements
    this.activeStudentCard = document.getElementById('active-student-card');
    this.activeStudentName = document.getElementById('active-student-name');
    this.activeStudentScore = document.getElementById('active-student-score');
    this.activeStudentAvatar = document.getElementById('active-student-avatar');

    this.activeTopicCard = document.getElementById('active-topic-card');
    this.activeTopicTitle = document.getElementById('active-topic-title');
    this.activeTopicBadge = document.getElementById('active-topic-badge');

    this.btnStartQuestion = document.getElementById('btn-start-question');
    this.btnRandomTopic = document.getElementById('btn-random-topic');

    // Modals
    this.modalQuestion = document.getElementById('modal-question');
    this.modalGift = document.getElementById('modal-gift');
    this.modalBomb = document.getElementById('modal-bomb');
    this.modalPodium = document.getElementById('modal-podium');
    this.modalQBank = document.getElementById('modal-qbank');

    // Question modal elements
    this.qModalTopic = document.getElementById('qmodal-topic');
    this.qModalPoints = document.getElementById('qmodal-points');
    this.qModalStudent = document.getElementById('qmodal-student');
    this.qModalTimer = document.getElementById('qmodal-timer-num');
    this.qModalTimerCircle = document.getElementById('qmodal-timer-circle');
    this.qModalText = document.getElementById('qmodal-text');
    this.qModalOptions = document.getElementById('qmodal-options');
    this.qModalExplanation = document.getElementById('qmodal-explanation');
    this.qModalExpText = document.getElementById('qmodal-exp-text');
    this.btnRevealAnswer = document.getElementById('btn-reveal-answer');
    this.btnCorrect = document.getElementById('btn-answer-correct');
    this.btnWrong = document.getElementById('btn-answer-wrong');
    this.btnPass = document.getElementById('btn-answer-pass');
    this.btnCloseQModal = document.getElementById('btn-close-qmodal');

    // Gift modal elements
    this.btnCopyPromo = document.getElementById('btn-copy-promo');
    this.btnCloseGift = document.getElementById('btn-close-gift');

    // Bomb modal elements
    this.bombVictimText = document.getElementById('bomb-victim-text');
    this.btnCloseBomb = document.getElementById('btn-close-bomb');

    // Player View Elements
    this.playerRegCard = document.getElementById('player-reg-card');
    this.playerRemoteScreen = document.getElementById('player-remote-screen');
    this.playerNamePicker = document.getElementById('player-name-picker');
    this.myAvatar = document.getElementById('my-avatar');
    this.myName = document.getElementById('my-name');
    this.myScore = document.getElementById('my-score');
    this.btnChangeStudent = document.getElementById('btn-change-student');
    this.btnMobileBuzzer = document.getElementById('btn-mobile-buzzer');
    this.playerBuzzerStatus = document.getElementById('player-buzzer-status');
    this.playerStatusText = document.getElementById('player-status-text');
    this.playerBuzzFeedback = document.getElementById('player-buzz-feedback');

    // Controls & Stats
    this.btnMute = document.getElementById('btn-mute');
    this.btnFullscreen = document.getElementById('btn-fullscreen');
    this.btnReset = document.getElementById('btn-reset');
    this.btnPodium = document.getElementById('btn-podium');
    this.btnQuestionBank = document.getElementById('btn-qbank');
    this.studentSearch = document.getElementById('student-search');
    this.scoreboardList = document.getElementById('scoreboard-list');
    this.topicsGrid = document.getElementById('topics-grid');
    this.authorsContainer = document.getElementById('authors-container');
    this.statsUsedQ = document.getElementById('stats-used-q');
    this.statsRemainingQ = document.getElementById('stats-remaining-q');
  }

  // ==========================================
  // REALTIME SYNCHRONIZATION
  // ==========================================
  initRealtimeListeners() {
    // When a student presses the buzzer
    realtime.on('BUZZER_PRESS', (data) => {
      this.handleBuzzerPressReceived(data);
    });

    // When admin resets the buzzer
    realtime.on('BUZZER_RESET', () => {
      this.handleBuzzerResetReceived();
    });

    // When Super Gift HACKALEMAI is triggered
    realtime.on('SUPER_GIFT_TRIGGER', (data) => {
      this.handleSuperGiftReceived(data);
    });

    // Score sync across tabs
    realtime.on('SYNC_SCORES', (data) => {
      if (data && data.students) {
        this.students = data.students;
        this.renderScoreboard();
        this.updatePlayerScreenState();
      }
    });
  }

  handleBuzzerPressReceived(data) {
    if (this.buzzerLocked) return;

    this.buzzerLocked = true;
    this.buzzerWinner = data;

    sounds.playBuzzer();

    // Update Admin UI
    if (this.buzzerWinnerText) {
      this.buzzerWinnerText.innerHTML = `🎯 <strong>БІРІНШІ БАСҚАН:</strong> <span style="color:#FEF08A; font-size:16px;">${data.name}</span>!`;
    }

    // Set as active student on Admin board
    const matched = this.students.find(s => s.id === data.id);
    if (matched) {
      this.selectStudent(matched);
    }

    // Update Player UI feedback
    if (this.currentRole === 'player') {
      if (this.myStudent && this.myStudent.id === data.id) {
        this.playerBuzzFeedback.className = 'player-feedback-box win';
        this.playerBuzzFeedback.innerHTML = `🎉 СІЗ 1-ОЙЫНШЫ БОЛЫП БАСТЫҢЫЗ! Жауап беріңіз!`;
      } else {
        this.playerBuzzFeedback.className = 'player-feedback-box late';
        this.playerBuzzFeedback.innerHTML = `⏳ <strong>${data.name}</strong> сізден бұрын басып үлгерді!`;
      }
      this.playerBuzzFeedback.classList.remove('hidden');
      this.playerBuzzerStatus.className = 'buzzer-state-banner state-pressed';
      this.playerStatusText.textContent = `КЕЗЕК: ${data.name}`;
    }
  }

  handleBuzzerResetReceived() {
    this.buzzerLocked = false;
    this.buzzerWinner = null;

    if (this.buzzerWinnerText) {
      this.buzzerWinnerText.textContent = 'Раунд ашық! Студенттердің басуын күтуде...';
    }

    if (this.currentRole === 'player') {
      this.playerBuzzerStatus.className = 'buzzer-state-banner state-ready';
      this.playerStatusText.textContent = 'РАУНД БАСТАЛДЫ! БАСУҒА ДАЙЫН!';
      this.playerBuzzFeedback.classList.add('hidden');
    }
  }

  handleSuperGiftReceived(data) {
    sounds.playJackpotGift();
    this.confetti.blast(120);

    // Open Gift Modal for ALL users (both admin and players)
    this.modalGift.classList.add('active');
  }

  // ==========================================
  // MYSTERY CELLS LOGIC (ҰЯШЫҚТАР ТАҚТАСЫ)
  // ==========================================
  renderMysteryCells() {
    this.mysteryCellsGrid.innerHTML = '';
    const cells = this.cellsManager.cells;

    cells.forEach((cell, idx) => {
      const card = document.createElement('div');
      card.className = `mystery-cell-card ${cell.isOpened ? `opened cell-type-${cell.type}` : ''}`;
      card.dataset.index = idx;

      if (!cell.isOpened) {
        card.innerHTML = `
          <div class="cell-closed-face">
            <span class="cell-number">${cell.number}</span>
            <span class="cell-mini-ornament">✦</span>
          </div>
        `;
      } else {
        card.innerHTML = `
          <div class="cell-opened-face">
            <span class="cell-open-icon">${cell.icon}</span>
            <span class="cell-open-label">${cell.title}</span>
          </div>
        `;
      }

      card.addEventListener('click', () => {
        if (cell.isOpened) return;
        this.openMysteryCell(idx, card);
      });

      this.mysteryCellsGrid.appendChild(card);
    });
  }

  openMysteryCell(index, cardEl) {
    const cell = this.cellsManager.openCell(index);
    if (!cell) return;

    sounds.playClick();
    this.renderMysteryCells();

    // 1. СУПЕР СЫЙЛЫҚ / ДЖЕКПОТ (HACKALEMAI)
    if (cell.type === 'gift') {
      realtime.emit('SUPER_GIFT_TRIGGER', { promoCode: PROMO_CODE_INFO.code });
      if (this.selectedStudent) {
        this.selectedStudent.score += cell.points;
        this.saveState();
        this.renderScoreboard();
      }
      this.showToast(`🎁 СУПЕР СЫЙЛЫҚ! Промокод HACKALEMAI бүкіл топқа ашылды!`, 'warning');
      return;
    }

    // 2. БОМБА 💣 (-1 ұпай)
    if (cell.type === 'bomb') {
      sounds.playBombExplosion();
      if (this.selectedStudent) {
        this.selectedStudent.score = Math.max(0, this.selectedStudent.score + cell.penalty);
        this.bombVictimText.innerHTML = `<strong>${this.selectedStudent.name}</strong> абайсызда бомбаға тап болды! Айыппұл: <strong>-1 ҰПАЙ</strong>.`;
        this.saveState();
        this.renderScoreboard();
      } else {
        this.bombVictimText.innerHTML = `Бомба жарылды! Кезектегі студент таңдалмағандықтан ешкімнен ұпай алынбады.`;
      }
      this.modalBomb.classList.add('active');
      return;
    }

    // 3. СӘТТІЛІК / БОНУС 🍀
    if (cell.type === 'bonus') {
      sounds.playWin();
      this.confetti.blast(60);
      if (cell.multiplier) {
        this.currentMultiplier = cell.multiplier;
        this.showToast(`🔥 БОНУС! Келесі сұрақ 2 еселенеді (2X ҰПАЙ)!`, 'warning');
      } else if (cell.points && this.selectedStudent) {
        this.selectedStudent.score += cell.points;
        this.saveState();
        this.renderScoreboard();
        this.showToast(`🍀 СӘТТІЛІК! ${this.selectedStudent.name} +${cell.points} бонус алды!`, 'success');
      }
      return;
    }

    // 4. ҚАУІПСІЗ ҰЯШЫҚ 🛡️
    if (cell.type === 'safe') {
      sounds.playWin();
      if (this.selectedStudent) {
        this.selectedStudent.score += cell.points;
        this.saveState();
        this.renderScoreboard();
      }
      this.showToast(`🛡️ Қауіпсіз ұяшық! +2 ұпай қосылды.`, 'info');
      return;
    }

    // 5. СҰРАҚ ❓
    if (cell.type === 'question' && cell.questionRef) {
      const q = cell.questionRef;
      const matchedTopic = TOPICS.find(t => t.id === q.topicId) || TOPICS[0];
      this.selectTopic(matchedTopic);

      if (this.selectedStudent) {
        this.openQuestionModal(q);
      } else {
        this.showToast(`❓ ${q.points} ұпайлық сұрақ ашылды! Жауап беретін студентті белгілеңіз.`, 'info');
      }
    }
  }

  // ==========================================
  // PLAYER VIEW: BUZZER & NAME PICKER
  // ==========================================
  renderPlayerPicker() {
    this.playerNamePicker.innerHTML = '';
    this.students.forEach(st => {
      const btn = document.createElement('button');
      btn.className = 'player-pick-btn';
      btn.textContent = st.name;
      btn.addEventListener('click', () => {
        sounds.playClick();
        this.myStudent = st;
        try {
          localStorage.setItem('kazakh_quiz_my_id', st.id.toString());
        } catch (e) {}
        this.updatePlayerScreenState();
        this.showToast(`Қош келдіңіз, ${st.name}!`, 'success');
      });
      this.playerNamePicker.appendChild(btn);
    });
  }

  updatePlayerScreenState() {
    if (!this.myStudent) {
      this.playerRegCard.classList.remove('hidden');
      this.playerRemoteScreen.classList.add('hidden');
    } else {
      this.playerRegCard.classList.add('hidden');
      this.playerRemoteScreen.classList.remove('hidden');

      // Refresh my current student score
      const fresh = this.students.find(s => s.id === this.myStudent.id);
      if (fresh) this.myStudent = fresh;

      this.myName.textContent = this.myStudent.name;
      this.myScore.textContent = `${this.myStudent.score} ұпай`;
      this.myAvatar.textContent = this.myStudent.name.charAt(0);
      this.myAvatar.style.backgroundColor = this.myStudent.color || '#3B82F6';
    }
  }

  triggerBuzzerPress() {
    if (!this.myStudent) {
      this.showToast('Алдымен өз атыңызды таңдаңыз!', 'warning');
      return;
    }

    if (this.buzzerLocked) {
      this.showToast('Кезек алынып қойды, келесі раундты күтіңіз!', 'error');
      return;
    }

    // Haptic feedback for mobile phones
    if (navigator.vibrate) {
      navigator.vibrate([120, 60, 120]);
    }

    sounds.playBuzzer();

    realtime.emit('BUZZER_PRESS', {
      id: this.myStudent.id,
      name: this.myStudent.name,
      timestamp: Date.now()
    });
  }

  // ==========================================
  // WHEEL & SELECTION
  // ==========================================
  initWheel() {
    this.wheel = new FortuneWheel('wheel-canvas', (winner) => {
      this.handleWheelWin(winner);
    });
    this.updateWheelItems();
  }

  updateWheelItems() {
    if (this.wheelMode === 'students') {
      this.wheel.setItems(this.students, 'students');
    } else {
      const topicItems = TOPICS.map(t => ({
        id: t.id,
        name: t.shortTitle,
        shortTitle: t.shortTitle,
        color: t.color,
        type: 'topic',
        topicRef: t
      }));
      topicItems.push({ id: 'b2', name: '2X ҰПАЙ', color: '#E11D48', type: 'mult', value: 2 });
      topicItems.push({ id: 'bl', name: 'СӘТТІЛІК +20', color: '#10B981', type: 'luck', value: 20 });
      this.wheel.setItems(topicItems, 'topics');
    }
  }

  handleWheelWin(winner) {
    if (this.wheelMode === 'students') {
      this.selectStudent(winner);
      this.showToast(`🎯 Дөңгелек таңдауы: ${winner.name}!`, 'info');
    } else {
      if (winner.type === 'topic') {
        this.selectTopic(winner.topicRef);
        this.showToast(`📚 Тақырып: ${winner.topicRef.shortTitle}!`, 'success');
      } else if (winner.type === 'mult') {
        this.currentMultiplier = winner.value;
        this.showToast(`🔥 2X БОНУС түсті!`, 'warning');
      } else if (winner.type === 'luck' && this.selectedStudent) {
        this.selectedStudent.score += winner.value;
        this.saveState();
        this.renderScoreboard();
        this.showToast(`🍀 ${this.selectedStudent.name} +20 ұпай алды!`, 'success');
      }
    }
  }

  selectStudent(student) {
    this.selectedStudent = student;
    this.activeStudentName.textContent = student.name;
    this.activeStudentScore.textContent = `${student.score} ұпай • ${student.answeredCount} сұрақ`;
    this.activeStudentAvatar.textContent = student.name.charAt(0);
    this.activeStudentAvatar.style.backgroundColor = student.color;
    this.activeStudentCard.classList.remove('empty-state');
    this.activeStudentCard.classList.add('active-state');

    this.renderScoreboard();
    this.updateTurnControls();
  }

  selectTopic(topic) {
    this.selectedTopic = topic;
    this.activeTopicTitle.textContent = topic.title;
    this.activeTopicBadge.textContent = topic.shortTitle;
    this.activeTopicBadge.style.backgroundColor = topic.color;
    this.activeTopicCard.classList.remove('empty-state');
    this.activeTopicCard.classList.add('active-state');

    this.updateTurnControls();
  }

  updateTurnControls() {
    const ready = this.selectedStudent && this.selectedTopic;
    this.btnStartQuestion.disabled = !ready;
    if (ready) {
      this.btnStartQuestion.classList.add('btn-pulse');
    } else {
      this.btnStartQuestion.classList.remove('btn-pulse');
    }
  }

  startQuestionFlow() {
    if (!this.selectedStudent || !this.selectedTopic) {
      this.showToast('Алдымен студент пен тақырыпты таңдаңыз!', 'warning');
      return;
    }

    const topicQuestions = QUESTIONS.filter(q => q.topicId === this.selectedTopic.id);
    const available = topicQuestions.filter(q => !this.usedQuestionIds.has(q.id));

    const chosenQuestion = available.length > 0 
      ? available[Math.floor(Math.random() * available.length)]
      : topicQuestions[Math.floor(Math.random() * topicQuestions.length)];

    this.openQuestionModal(chosenQuestion);
  }

  openQuestionModal(question) {
    this.currentQuestion = question;
    sounds.init();
    sounds.playClick();

    const multText = this.currentMultiplier > 1 ? ` (x${this.currentMultiplier} БОНУС!)` : '';
    const pointsValue = question.points * this.currentMultiplier;

    this.qModalTopic.textContent = `${this.selectedTopic ? this.selectedTopic.shortTitle : 'Сұрақ'}`;
    this.qModalPoints.textContent = `+${pointsValue} Ұпай${multText}`;
    if (this.selectedTopic) {
      this.qModalPoints.style.backgroundColor = this.selectedTopic.color;
    }
    this.qModalStudent.textContent = `Жауап беруші: ${this.selectedStudent ? this.selectedStudent.name : 'Студент'}`;
    this.qModalText.textContent = question.question;

    this.qModalOptions.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D'];
    question.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'option-card';
      btn.innerHTML = `
        <span class="option-badge">${letters[idx]}</span>
        <span class="option-text">${opt}</span>
      `;
      btn.addEventListener('click', () => {
        sounds.playClick();
        const all = this.qModalOptions.querySelectorAll('.option-card');
        all.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
      this.qModalOptions.appendChild(btn);
    });

    this.qModalExplanation.classList.add('hidden');
    this.qModalExpText.textContent = question.explanation;
    this.startTimer(30);

    this.modalQuestion.classList.add('active');
  }

  startTimer(seconds = 30) {
    clearInterval(this.timerInterval);
    this.timeLeft = seconds;
    this.timerTotal = seconds;
    this.updateTimerDisplay();

    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      this.updateTimerDisplay();

      if (this.timeLeft <= 5 && this.timeLeft > 0) {
        sounds.playTimerWarning();
      }

      if (this.timeLeft <= 0) {
        clearInterval(this.timerInterval);
        sounds.playWrong();
        this.revealAnswer(false);
      }
    }, 1000);
  }

  updateTimerDisplay() {
    this.qModalTimer.textContent = this.timeLeft;
    const progress = this.timeLeft / this.timerTotal;
    const offset = 283 * (1 - progress);
    if (this.qModalTimerCircle) {
      this.qModalTimerCircle.style.strokeDashoffset = offset;
      this.qModalTimerCircle.style.stroke = this.timeLeft <= 5 ? '#EF4444' : '#10B981';
    }
  }

  revealAnswer() {
    clearInterval(this.timerInterval);
    const all = this.qModalOptions.querySelectorAll('.option-card');
    all.forEach((btn, idx) => {
      btn.disabled = true;
      if (idx === this.currentQuestion.correct) {
        btn.classList.add('correct');
      } else if (btn.classList.contains('selected')) {
        btn.classList.add('wrong');
      }
    });
    this.qModalExplanation.classList.remove('hidden');
  }

  markAnswer(isCorrect) {
    clearInterval(this.timerInterval);
    this.revealAnswer();
    this.usedQuestionIds.add(this.currentQuestion.id);

    if (isCorrect) {
      sounds.playWin();
      this.confetti.blast(80);
      const points = this.currentQuestion.points * this.currentMultiplier;
      if (this.selectedStudent) {
        this.selectedStudent.score += points;
        this.selectedStudent.answeredCount += 1;
      }
      this.showToast(`🎉 Дұрыс жауап! +${points} ұпай қосылды!`, 'success');
    } else {
      sounds.playWrong();
      if (this.selectedStudent) {
        this.selectedStudent.answeredCount += 1;
      }
      this.showToast(`❌ Қате жауап!`, 'error');
    }

    this.currentMultiplier = 1;
    this.saveState();
    this.renderScoreboard();
    this.updateStats();

    setTimeout(() => {
      this.closeQuestionModal();
    }, 2400);
  }

  closeQuestionModal() {
    clearInterval(this.timerInterval);
    this.modalQuestion.classList.remove('active');
    this.currentQuestion = null;
  }

  // ==========================================
  // RENDERING & HELPERS
  // ==========================================
  renderAuthors() {
    this.authorsContainer.innerHTML = '';
    AUTHORS.forEach(author => {
      const badge = document.createElement('div');
      badge.className = 'author-chip';
      badge.innerHTML = `
        <span class="author-icon">⭐</span>
        <span class="author-name">${author.name}</span>
        <span class="author-role">${author.role}</span>
      `;
      this.authorsContainer.appendChild(badge);
    });
  }

  renderScoreboard() {
    const query = (this.studentSearch ? this.studentSearch.value : '').toLowerCase().trim();
    const sorted = [...this.students].sort((a, b) => b.score - a.score);

    this.scoreboardList.innerHTML = '';
    sorted.forEach((st, index) => {
      if (query && !st.name.toLowerCase().includes(query)) return;

      const card = document.createElement('div');
      card.className = `student-row ${this.selectedStudent && this.selectedStudent.id === st.id ? 'active-selected' : ''}`;

      let rankBadge = `<span class="rank-num">${index + 1}</span>`;
      if (index === 0 && st.score > 0) rankBadge = `<span class="rank-badge gold">🥇</span>`;
      else if (index === 1 && st.score > 0) rankBadge = `<span class="rank-badge silver">🥈</span>`;
      else if (index === 2 && st.score > 0) rankBadge = `<span class="rank-badge bronze">🥉</span>`;

      card.innerHTML = `
        <div class="student-left">
          ${rankBadge}
          <div class="student-avatar" style="background-color: ${st.color}">${st.name.charAt(0)}</div>
          <div class="student-meta">
            <span class="student-name">${st.name}</span>
            <span class="student-ans">${st.answeredCount} сұрақ</span>
          </div>
        </div>
        <div class="student-right">
          <span class="student-pts">${st.score} <small>ұп</small></span>
          <div class="score-quick-btns">
            <button class="btn-micro" data-action="add10">+10</button>
            <button class="btn-micro" data-action="sub5">-5</button>
          </div>
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.score-quick-btns')) return;
        sounds.playClick();
        this.selectStudent(st);
      });

      card.querySelector('[data-action="add10"]').onclick = (e) => {
        e.stopPropagation();
        sounds.playClick();
        st.score += 10;
        this.saveState();
        this.renderScoreboard();
        this.updatePlayerScreenState();
      };

      card.querySelector('[data-action="sub5"]').onclick = (e) => {
        e.stopPropagation();
        sounds.playClick();
        st.score = Math.max(0, st.score - 5);
        this.saveState();
        this.renderScoreboard();
        this.updatePlayerScreenState();
      };

      this.scoreboardList.appendChild(card);
    });
  }

  renderTopicsGrid() {
    this.topicsGrid.innerHTML = '';
    TOPICS.forEach(topic => {
      const card = document.createElement('div');
      card.className = `topic-card ${this.selectedTopic && this.selectedTopic.id === topic.id ? 'active-topic' : ''}`;
      card.style.setProperty('--topic-color', topic.color);

      const topicQuestions = QUESTIONS.filter(q => q.topicId === topic.id);
      const used = topicQuestions.filter(q => this.usedQuestionIds.has(q.id)).length;

      card.innerHTML = `
        <div class="topic-header">
          <span class="topic-icon">${topic.icon}</span>
          <span class="topic-progress-badge">${used}/${topicQuestions.length}</span>
        </div>
        <h4 class="topic-card-title">${topic.shortTitle}</h4>
        <p class="topic-card-desc">${topic.description}</p>
      `;

      card.addEventListener('click', () => {
        sounds.playClick();
        this.selectTopic(topic);
        this.renderTopicsGrid();
      });

      this.topicsGrid.appendChild(card);
    });
  }

  updateStats() {
    const total = QUESTIONS.length;
    const used = this.usedQuestionIds.size;
    if (this.statsUsedQ) this.statsUsedQ.textContent = used;
    if (this.statsRemainingQ) this.statsRemainingQ.textContent = total - used;
  }

  bindEvents() {
    // Role switcher
    this.btnRoleAdmin.onclick = () => this.setRole('admin');
    this.btnRolePlayer.onclick = () => this.setRole('player');

    // Share link to group
    this.btnShareLink.onclick = () => {
      const url = new URL(window.location.href);
      url.searchParams.set('role', 'player');
      navigator.clipboard.writeText(url.toString()).then(() => {
        this.showToast('📋 Студенттерге арналған сілтеме көшірілді! Группаға жібере аласыз.', 'success');
      }).catch(() => {
        this.showToast(`Сілтеме: ${url.toString()}`, 'info');
      });
    };

    // Reset Buzzer button
    this.btnResetBuzzer.onclick = () => {
      sounds.playClick();
      realtime.emit('BUZZER_RESET', {});
      this.showToast('Буззер жаңа раундқа ашылды!', 'info');
    };

    // Mobile Buzzer Button
    this.btnMobileBuzzer.onclick = () => {
      this.triggerBuzzerPress();
    };

    // Change student profile on mobile
    this.btnChangeStudent.onclick = () => {
      this.myStudent = null;
      try { localStorage.removeItem('kazakh_quiz_my_id'); } catch(e) {}
      this.updatePlayerScreenState();
    };

    // Tabs: Cells vs Wheel
    this.tabGameCells.onclick = () => {
      sounds.playClick();
      this.gameTabMode = 'cells';
      this.tabGameCells.classList.add('active');
      this.tabGameWheel.classList.remove('active');
      this.containerCellsView.classList.remove('hidden');
      this.containerWheelView.classList.add('hidden');
    };

    this.tabGameWheel.onclick = () => {
      sounds.playClick();
      this.gameTabMode = 'wheel';
      this.tabGameWheel.classList.add('active');
      this.tabGameCells.classList.remove('active');
      this.containerWheelView.classList.remove('hidden');
      this.containerCellsView.classList.add('hidden');
      this.wheel.initCanvasSize();
      this.wheel.draw();
    };

    this.btnShuffleCells.onclick = () => {
      sounds.playClick();
      this.cellsManager.reset();
      this.renderMysteryCells();
      this.showToast('Ұяшықтар жаңадан араластырылды!', 'info');
    };

    // Wheel Spin
    this.btnSpin.onclick = () => this.wheel.spin();
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !this.modalQuestion.classList.contains('active') && this.currentRole === 'admin') {
        e.preventDefault();
        this.wheel.spin();
      }
    });

    this.modeStudentsTab.onclick = () => {
      sounds.playClick();
      this.wheelMode = 'students';
      this.modeStudentsTab.classList.add('active');
      this.modeTopicsTab.classList.remove('active');
      this.updateWheelItems();
    };

    this.modeTopicsTab.onclick = () => {
      sounds.playClick();
      this.wheelMode = 'topics';
      this.modeTopicsTab.classList.add('active');
      this.modeStudentsTab.classList.remove('active');
      this.updateWheelItems();
    };

    // Turn Actions
    this.btnStartQuestion.onclick = () => this.startQuestionFlow();
    this.btnRandomTopic.onclick = () => {
      sounds.playClick();
      const randomTopic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
      this.selectTopic(randomTopic);
      this.renderTopicsGrid();
    };

    // Question modal controls
    this.btnRevealAnswer.onclick = () => this.revealAnswer();
    this.btnCorrect.onclick = () => this.markAnswer(true);
    this.btnWrong.onclick = () => this.markAnswer(false);
    this.btnPass.onclick = () => this.closeQuestionModal();
    this.btnCloseQModal.onclick = () => this.closeQuestionModal();

    // Gift modal controls
    this.btnCopyPromo.onclick = () => {
      navigator.clipboard.writeText(PROMO_CODE_INFO.code).then(() => {
        this.showToast('📋 «HACKALEMAI» промокоды көшірілді!', 'success');
      });
    };
    this.btnCloseGift.onclick = () => this.modalGift.classList.remove('active');

    // Bomb modal controls
    this.btnCloseBomb.onclick = () => this.modalBomb.classList.remove('active');

    // Mute & Fullscreen
    this.btnMute.onclick = () => {
      const isMuted = sounds.toggleMute();
      this.btnMute.textContent = isMuted ? '🔇' : '🔊';
    };

    this.btnFullscreen.onclick = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    };

    // Reset All
    this.btnReset.onclick = () => {
      if (confirm('Ойынды толықтай қайта бастағыңыз келе ме? Ұпайлар 0 болады.')) {
        this.students = JSON.parse(JSON.stringify(STUDENTS));
        this.usedQuestionIds = new Set();
        this.cellsManager.reset();
        this.saveState();
        this.renderScoreboard();
        this.renderMysteryCells();
        this.renderTopicsGrid();
        this.updateStats();
        this.showToast('Ойын жаңадан басталды!', 'success');
      }
    };

    // Podium & QBank Modals
    this.btnPodium.onclick = () => this.openPodiumModal();
    this.btnQuestionBank.onclick = () => this.openQBankModal();

    if (this.studentSearch) {
      this.studentSearch.addEventListener('input', () => this.renderScoreboard());
    }
  }

  openPodiumModal() {
    sounds.playFanfare();
    this.confetti.blast(100);

    const sorted = [...this.students].sort((a, b) => b.score - a.score);
    const first = sorted[0];
    const second = sorted[1];
    const third = sorted[2];

    const podiumContainer = document.getElementById('podium-content');
    podiumContainer.innerHTML = `
      <div class="podium-stage">
        <div class="podium-step step-2">
          <div class="podium-avatar" style="background-color: ${second.color}">${second.name.charAt(0)}</div>
          <div class="podium-name">${second.name}</div>
          <div class="podium-score">${second.score} ұпай</div>
          <div class="podium-pillar p2"><span class="pillar-rank">🥈 2-орын</span></div>
        </div>
        <div class="podium-step step-1">
          <div class="crown-icon">👑</div>
          <div class="podium-avatar main" style="background-color: ${first.color}">${first.name.charAt(0)}</div>
          <div class="podium-name">${first.name}</div>
          <div class="podium-score">${first.score} ұпай</div>
          <div class="podium-pillar p1"><span class="pillar-rank">🥇 1-орын</span></div>
        </div>
        <div class="podium-step step-3">
          <div class="podium-avatar" style="background-color: ${third.color}">${third.name.charAt(0)}</div>
          <div class="podium-name">${third.name}</div>
          <div class="podium-score">${third.score} ұпай</div>
          <div class="podium-pillar p3"><span class="pillar-rank">🥉 3-орын</span></div>
        </div>
      </div>
      <div class="podium-full-list">
        <h4>Толық рейтинг</h4>
        <div class="podium-table">
          ${sorted.map((s, i) => `
            <div class="podium-row">
              <span class="pr-rank">#${i + 1}</span>
              <span class="pr-name">${s.name}</span>
              <span class="pr-score">${s.score} ұпай</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.getElementById('btn-close-podium').onclick = () => {
      this.modalPodium.classList.remove('active');
    };
    this.modalPodium.classList.add('active');
  }

  openQBankModal() {
    sounds.playClick();
    const bankList = document.getElementById('qbank-list');
    const filterTopic = document.getElementById('qbank-topic-filter');

    const render = (val = 'all') => {
      bankList.innerHTML = '';
      const filtered = QUESTIONS.filter(q => val === 'all' || q.topicId.toString() === val);
      filtered.forEach((q, idx) => {
        const item = document.createElement('div');
        item.className = 'qbank-item';
        item.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="qbank-badge">${q.points} ұпай</span>
            <small style="color:var(--text-dim);">${this.usedQuestionIds.has(q.id) ? '✅ Ойналды' : '⏳ Ашық'}</small>
          </div>
          <div class="qbank-qtext"><strong>${idx + 1}.</strong> ${q.question}</div>
          <div class="qbank-options-preview">
            ${q.options.map((opt, i) => `
              <span class="qbank-opt ${i === q.correct ? 'correct' : ''}">
                ${['A', 'B', 'C', 'D'][i]}: ${opt}
              </span>
            `).join('')}
          </div>
          <small style="color:var(--text-dim);">💡 ${q.explanation}</small>
        `;
        bankList.appendChild(item);
      });
    };

    filterTopic.onchange = () => render(filterTopic.value);
    render(filterTopic.value);

    document.getElementById('btn-close-qbank').onclick = () => {
      this.modalQBank.classList.remove('active');
    };
    this.modalQBank.classList.add('active');
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-msg toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 3200);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new QuizApp();
});
