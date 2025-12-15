import { BrowserQRCodeReader } from '@zxing/browser';

type HistoryEntry = {
  text: string;
  timestamp: number;
};

const dropzone = document.getElementById('dropzone') as HTMLElement;
const pasteBtn = document.getElementById('pasteBtn') as HTMLButtonElement;
const fileBtn = document.getElementById('fileBtn') as HTMLButtonElement;
const fileInput = document.getElementById('fileInput') as HTMLInputElement;
const statusEl = document.getElementById('status') as HTMLElement;
const resultSection = document.getElementById('result') as HTMLElement;
const resultText = document.getElementById('resultText') as HTMLElement;
const copyBtn = document.getElementById('copyBtn') as HTMLButtonElement;
const openLink = document.getElementById('openLink') as HTMLAnchorElement;
const historyList = document.getElementById('historyList') as HTMLUListElement;
const clearHistoryBtn = document.getElementById('clearHistory') as HTMLButtonElement;
const canvas = document.getElementById('workCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');

const reader = new BrowserQRCodeReader();
let processing = false;

if (!navigator.clipboard) {
  pasteBtn.disabled = true;
  pasteBtn.title = 'Clipboard API unavailable in this context';
}

function setStatus(message: string, variant: 'info' | 'error' | 'success' = 'info') {
  statusEl.textContent = message;
  statusEl.dataset.variant = variant;
}

function setResult(text: string) {
  resultText.textContent = text;
  resultSection.hidden = false;
  const asUrl = safeUrl(text);
  if (asUrl) {
    openLink.href = asUrl;
    openLink.hidden = false;
    openLink.textContent = 'Open link';
  } else {
    openLink.hidden = true;
  }
}

function safeUrl(text: string): string | null {
  try {
    const url = new URL(text);
    if (['http:', 'https:'].includes(url.protocol)) {
      return url.toString();
    }
  } catch {}
  return null;
}

async function onPaste(event: ClipboardEvent) {
  if (!event.clipboardData) return;
  const item = Array.from(event.clipboardData.items).find((i) => i.type.startsWith('image/'));
  if (!item) {
    setStatus('Clipboard does not contain an image.', 'error');
    return;
  }
  await handleBlob(item.getAsFile());
}

async function onDrop(event: DragEvent) {
  event.preventDefault();
  const file = event.dataTransfer?.files[0];
  if (!file) return;
  await handleBlob(file);
}

function onDragOver(event: DragEvent) {
  event.preventDefault();
}

async function triggerPaste() {
  try {
    const items = await navigator.clipboard.read();
    const blobItem = items
      .flatMap((item) => item.types.map((type) => ({ item, type })))
      .find(({ type }) => type.startsWith('image/'));
    if (blobItem) {
      const blob = await blobItem.item.getType(blobItem.type);
      await handleBlob(new File([blob], 'clipboard-image', { type: blob.type }));
      return;
    }
  } catch (error) {
    console.warn('Direct clipboard read failed, falling back to manual paste', error);
  }
  dropzone.focus();
  setStatus('Press Ctrl/Cmd+V now.');
}

function chooseFile() {
  fileInput.value = '';
  fileInput.click();
}

async function onFileChange() {
  const file = fileInput.files?.[0];
  if (!file) return;
  await handleBlob(file);
  fileInput.value = '';
}

async function handleBlob(file: File | null) {
  if (!file) {
    setStatus('No image received.', 'error');
    return;
  }
  if (!file.type.startsWith('image/')) {
    setStatus('Unsupported file type.', 'error');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    setStatus('Image too large (>5MB).', 'error');
    return;
  }
  if (!ctx) {
    setStatus('Canvas unavailable.', 'error');
    return;
  }
  if (processing) return;
  processing = true;
  setStatus('Decoding…');
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 800 / Math.max(bitmap.width, bitmap.height));
    canvas.width = bitmap.width * scale;
    canvas.height = bitmap.height * scale;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = reader.decodeFromCanvas(canvas);
    const text = result.getText();
    setResult(text);
    setStatus('QR decoded successfully.', 'success');
    await addHistoryEntry(text);
    await renderHistory();
  } catch (error) {
    console.error(error);
    setStatus('No QR code detected.', 'error');
    resultSection.hidden = true;
  } finally {
    processing = false;
  }
}

copyBtn.addEventListener('click', async () => {
  const text = resultText.textContent;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    setStatus('Copied to clipboard.', 'success');
  } catch {
    setStatus('Copy failed. Select text manually.', 'error');
  }
});

pasteBtn.addEventListener('click', triggerPaste);
fileBtn.addEventListener('click', chooseFile);
fileInput.addEventListener('change', onFileChange);

dropzone.addEventListener('paste', onPaste);
dropzone.addEventListener('dragover', onDragOver);
dropzone.addEventListener('drop', onDrop);

document.addEventListener('paste', onPaste);

type StoredHistory = HistoryEntry[];

async function getHistory(): Promise<StoredHistory> {
  return new Promise((resolve) => {
    chrome.storage.local.get({ history: [] }, (items) => {
      resolve((items.history as StoredHistory) ?? []);
    });
  });
}

async function setHistory(entries: StoredHistory) {
  return new Promise<void>((resolve) => {
    chrome.storage.local.set({ history: entries.slice(0, 10) }, () => resolve());
  });
}

async function addHistoryEntry(text: string) {
  const entries = await getHistory();
  entries.unshift({ text, timestamp: Date.now() });
  await setHistory(entries);
}

async function renderHistory() {
  const entries = await getHistory();
  historyList.innerHTML = '';
  entries.forEach((entry) => {
    const li = document.createElement('li');
    const content = document.createElement('p');
    content.textContent = entry.text.slice(0, 160);
    const time = document.createElement('time');
    time.textContent = new Date(entry.timestamp).toLocaleString();
    li.appendChild(content);
    li.appendChild(time);
    historyList.appendChild(li);
  });
}

clearHistoryBtn.addEventListener('click', async () => {
  await setHistory([]);
  await renderHistory();
  setStatus('History cleared.', 'info');
});

renderHistory().catch(console.error);
