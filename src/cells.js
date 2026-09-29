// Ұяшықтар жүйесі (Mystery Cells / Құпия ұяшықтар)
import { QUESTIONS } from './questions.js';

export const PROMO_CODE_INFO = {
  code: "HACKALEMAI",
  title: "БАРШАҒА СУПЕР СЫЙЛЫҚ!",
  description: "3 ай тегін кино көру жазылымы (кинотеатр/стриминг)",
  giftDetails: "Құттықтаймыз! Бұл сыйлық барлық 16 студент пен бүкіл топқа бірдей берілді! Промокодты сақтап алыңыз."
};

export class CellsManager {
  constructor() {
    this.totalCells = 24;
    this.cells = [];
    this.initCells();
  }

  initCells() {
    const list = [];
    
    // 1. Екі супер сыйлық ұяшығы: HACKALEMAI
    list.push({
      type: 'gift',
      icon: '🎁',
      title: 'СУПЕР СЫЙЛЫҚ!',
      subtitle: 'Баршаға промокод: HACKALEMAI',
      points: 15,
      isGroupGift: true,
      promoCode: PROMO_CODE_INFO.code
    });
    list.push({
      type: 'gift',
      icon: '🎁',
      title: 'СУПЕР СЫЙЛЫҚ!',
      subtitle: 'Баршаға промокод: HACKALEMAI',
      points: 15,
      isGroupGift: true,
      promoCode: PROMO_CODE_INFO.code
    });

    // 2. Үш Бомба ұяшығы (-1 балл)
    list.push({
      type: 'bomb',
      icon: '💣',
      title: 'БОМБА ЖАРЫЛДЫ!',
      subtitle: 'Айыппұл: -1 ұпай',
      penalty: -1
    });
    list.push({
      type: 'bomb',
      icon: '💣',
      title: 'БОМБА ЖАРЫЛДЫ!',
      subtitle: 'Айыппұл: -1 ұпай',
      penalty: -1
    });
    list.push({
      type: 'bomb',
      icon: '💣',
      title: 'БОМБА ЖАРЫЛДЫ!',
      subtitle: 'Айыппұл: -1 ұпай',
      penalty: -1
    });

    // 3. Екі Сәттілік / 2x бонус ұяшығы
    list.push({
      type: 'bonus',
      icon: '🍀',
      title: 'СӘТТІЛІК!',
      subtitle: '+5 бонус ұпай сыйланды',
      points: 5
    });
    list.push({
      type: 'bonus',
      icon: '🔥',
      title: '2X ҰПАЙ!',
      subtitle: 'Келесі сұрақ 2 еселенеді',
      multiplier: 2
    });

    // 4. Бір қауіпсіз / бос ұяшық
    list.push({
      type: 'safe',
      icon: '🛡️',
      title: 'ҚАУІПСІЗ ҰЯШЫҚ',
      subtitle: 'Сұрақсыз өтіп кету (+2 ұпай)',
      points: 2
    });

    // 5. Қалған 16 ұяшыққа 5 тақырыптың сұрақтарын таратамыз
    // 90 сұрақтың ішінен әртүрлі тақырыптардан 16 сұрақты таңдаймыз
    const shuffledQuestions = [...QUESTIONS].sort(() => Math.random() - 0.5);
    for (let i = 0; i < 16; i++) {
      const q = shuffledQuestions[i];
      list.push({
        type: 'question',
        icon: '❓',
        title: `Сұрақ (${q.points} ұпай)`,
        subtitle: `Тақырып: ${q.topicId}-бөлім`,
        questionRef: q
      });
    }

    // Әр раундта ұяшықтардың орындарын кездейсоқ араластырамыз (Shuffle)
    const shuffled = list.sort(() => Math.random() - 0.5);
    this.cells = shuffled.map((item, idx) => ({
      ...item,
      id: idx + 1,
      number: idx + 1,
      isOpened: false
    }));
  }

  getCell(index) {
    return this.cells[index];
  }

  openCell(index) {
    if (this.cells[index]) {
      this.cells[index].isOpened = true;
      return this.cells[index];
    }
    return null;
  }

  reset() {
    this.initCells();
  }
}
