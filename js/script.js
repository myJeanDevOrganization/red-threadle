function boldNumbers(root) {
  const numberPattern = /\d[\d,]*(\.\d+)?/g;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    textNodes.push(node);
  }

  textNodes.forEach((textNode) => {
    const text = textNode.textContent;
    numberPattern.lastIndex = 0;
    if (!numberPattern.test(text)) return;
    numberPattern.lastIndex = 0;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match;
    while ((match = numberPattern.exec(text))) {
      fragment.append(text.slice(lastIndex, match.index));
      const strong = document.createElement('strong');
      strong.textContent = match[0];
      fragment.append(strong);
      lastIndex = match.index + match[0].length;
    }
    fragment.append(text.slice(lastIndex));

    textNode.replaceWith(fragment);
  });
}

let currentDateKey = null;
let countUpFrame = null;
let animationGeneration = 0;

const NOTE_TRANSITION_MS = 500;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resetSubmitButton() {
  animationGeneration += 1;

  if (countUpFrame !== null) {
    cancelAnimationFrame(countUpFrame);
    countUpFrame = null;
  }

  const button = document.querySelector('#cell-1-1 .note-submit');
  if (button) {
    button.textContent = 'Submit';
    button.disabled = false;
  }

  const diffEl = document.getElementById('note-diff');
  if (diffEl) {
    diffEl.textContent = '';
    diffEl.classList.remove('close', 'far', 'show');
  }

  document.querySelectorAll('.sticky-note').forEach((note) => {
    note.style.transform = '';
    note.style.zIndex = '';
  });
}

async function gatherNotes(myGeneration) {
  const centerNote = document.getElementById('cell-1-1');
  const notes = [...document.querySelectorAll('.sticky-note')].filter((note) => !note.hidden);
  if (!centerNote) return;

  centerNote.style.zIndex = '10';

  notes.forEach((note) => {
    note.style.transform = 'rotate(0deg)';
  });

  await wait(NOTE_TRANSITION_MS);
  if (myGeneration !== animationGeneration) return;

  const centerRect = centerNote.getBoundingClientRect();
  const centerX = centerRect.left + centerRect.width / 2;
  const centerY = centerRect.top + centerRect.height / 2;

  notes.forEach((note) => {
    if (note === centerNote) return;
    const rect = note.getBoundingClientRect();
    const dx = centerX - (rect.left + rect.width / 2);
    const dy = centerY - (rect.top + rect.height / 2);
    note.style.transform = `rotate(0deg) translate(${dx}px, ${dy}px)`;
  });

  await wait(NOTE_TRANSITION_MS);
}

async function scatterNotes(myGeneration) {
  const centerNote = document.getElementById('cell-1-1');
  const notes = [...document.querySelectorAll('.sticky-note')].filter((note) => !note.hidden);
  if (!centerNote) return;

  centerNote.style.zIndex = '10';

  const centerRect = centerNote.getBoundingClientRect();
  const centerX = centerRect.left + centerRect.width / 2;
  const centerY = centerRect.top + centerRect.height / 2;

  const offsets = new Map();
  notes.forEach((note) => {
    const rect = note.getBoundingClientRect();
    offsets.set(note, {
      dx: centerX - (rect.left + rect.width / 2),
      dy: centerY - (rect.top + rect.height / 2),
    });
  });

  notes.forEach((note) => {
    note.style.transition = 'none';
    const { dx, dy } = offsets.get(note);
    note.style.transform = `rotate(0deg) translate(${dx}px, ${dy}px)`;
  });

  void centerNote.offsetHeight;

  notes.forEach((note) => {
    note.style.transition = '';
  });

  notes.forEach((note) => {
    note.style.transform = 'rotate(0deg)';
  });

  await wait(NOTE_TRANSITION_MS);
  if (myGeneration !== animationGeneration) return;

  notes.forEach((note) => {
    note.style.transform = '';
  });

  await wait(NOTE_TRANSITION_MS);
}

const CONNECTED_TACKS = {
  'thumb-tack-1-0': 'cell-1-0',
  'thumb-tack-0-1': 'cell-0-1',
  'thumb-tack-2-1': 'cell-2-1',
  'thumb-tack-1-2': 'cell-1-2',
  'thumb-tack-0-0': 'cell-0-0',
  'thumb-tack-2-0': 'cell-2-0',
  'thumb-tack-0-2': 'cell-0-2',
  'thumb-tack-2-2': 'cell-2-2',
};
const NOTE_CELL_IDS = Object.values(CONNECTED_TACKS);

function tackCenter(tackEl, boardRect) {
  const r = tackEl.getBoundingClientRect();
  return {
    x: r.left + r.width / 2 - boardRect.left,
    y: r.top + r.height / 2 - boardRect.top,
  };
}

function drawStrings() {
  const board = document.querySelector('.board');
  const svg = document.getElementById('board-lines');
  const centerTack = document.getElementById('thumb-tack-1-1');
  if (!board || !svg || !centerTack) return;

  const boardRect = board.getBoundingClientRect();
  svg.setAttribute('viewBox', `0 0 ${boardRect.width} ${boardRect.height}`);
  svg.innerHTML = '';

  const centerPoint = tackCenter(centerTack, boardRect);

  Object.entries(CONNECTED_TACKS).forEach(([tackId, cellId]) => {
    const noteEl = document.getElementById(cellId);
    const tackEl = document.getElementById(tackId);
    if (!noteEl || !tackEl || noteEl.hidden) return;

    const point = tackCenter(tackEl, boardRect);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', centerPoint.x);
    line.setAttribute('y1', centerPoint.y);
    line.setAttribute('x2', point.x);
    line.setAttribute('y2', point.y);
    line.setAttribute('class', 'board-string');
    svg.appendChild(line);
  });
}

async function populateBoard(dateKey) {
  const data = boardData[dateKey];
  if (!data) return;

  currentDateKey = dateKey;

  const centerText = document.querySelector('#cell-1-1 .note-text');
  if (centerText) centerText.textContent = data.question;

  const input = document.querySelector('#cell-1-1 .note-input');
  if (input) input.value = '';

  resetSubmitButton();
  const myGeneration = animationGeneration;

  NOTE_CELL_IDS.forEach((cellId) => {
    const noteText = document.querySelector(`#${cellId} .note-text`);
    if (noteText) noteText.textContent = data.notes[cellId] || '';
  });

  document.querySelectorAll('.sticky-note').forEach((noteEl) => {
    const noteText = noteEl.querySelector('.note-text');
    const hasContent = Boolean(noteText && noteText.textContent.trim());
    noteEl.hidden = !hasContent;
  });

  boldNumbers(document.querySelector('.board'));

  const linesEl = document.getElementById('board-lines');
  if (linesEl) linesEl.innerHTML = '';

  await scatterNotes(myGeneration);
  if (myGeneration !== animationGeneration) return;

  drawStrings();
}

function animateCountUp(button, target, onComplete) {
  const duration = 1200;
  const start = performance.now();

  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);
    button.textContent = Math.round(progress * target).toLocaleString();

    if (progress < 1) {
      countUpFrame = requestAnimationFrame(frame);
    } else {
      countUpFrame = null;
      if (onComplete) onComplete();
    }
  }

  countUpFrame = requestAnimationFrame(frame);
}

async function checkAnswer() {
  if (!currentDateKey || !boardData[currentDateKey]) return;

  const input = document.querySelector('#cell-1-1 .note-input');
  const button = document.querySelector('#cell-1-1 .note-submit');
  const diffEl = document.getElementById('note-diff');
  if (!input || !button) return;

  const submitted = parseFloat(input.value.replace(/,/g, ''));
  if (Number.isNaN(submitted)) return;

  const actual = parseFloat(String(boardData[currentDateKey].answer).replace(/,/g, ''));
  const diff = Math.abs(submitted - actual);

  const myGeneration = ++animationGeneration;
  button.disabled = true;

  const linesEl = document.getElementById('board-lines');
  if (linesEl) linesEl.innerHTML = '';

  await gatherNotes(myGeneration);
  if (myGeneration !== animationGeneration) return;

  if (diffEl) {
    const percentOff = actual !== 0 ? diff / actual : diff;
    diffEl.textContent = `Off by ${diff.toLocaleString()}`;
    diffEl.classList.remove('close', 'far', 'show');
    diffEl.classList.add(percentOff <= 0.1 ? 'close' : 'far');
  }

  animateCountUp(button, actual, () => {
    if (myGeneration !== animationGeneration) return;
    if (diffEl) diffEl.classList.add('show');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const picker = document.getElementById('date-picker');
  const dateKeys = Object.keys(boardData);

  dateKeys.forEach((dateKey) => {
    const option = document.createElement('option');
    option.value = dateKey;
    option.textContent = dateKey;
    picker.append(option);
  });

  picker.addEventListener('change', () => {
    populateBoard(picker.value);
  });

  const input = document.querySelector('#cell-1-1 .note-input');
  if (input) {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/[^0-9,]/g, '');
    });
  }

  const submitBtn = document.querySelector('#cell-1-1 .note-submit');
  if (submitBtn) {
    submitBtn.addEventListener('click', checkAnswer);
  }

  if (dateKeys.length > 0) {
    picker.value = dateKeys[0];
    populateBoard(dateKeys[0]);
  }

  const board = document.querySelector('.board');
  if (board && window.ResizeObserver) {
    new ResizeObserver(() => drawStrings()).observe(board);
  }
});
