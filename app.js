// Teleprompter Pro - Main Application Logic

class TeleprompterApp {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.scrollSpeed = 3;
        this.fontSize = 48;
        this.margins = 10;
        this.mirrorMode = false;
        this.darkMode = true;
        this.scrollPosition = 0;
        this.animationFrame = null;
        this.touchPaused = false;
        this.speakerName = '';
        this.logoDataUrl = '';

        this.elements = {
            scriptInput: document.getElementById('scriptInput'),
            charCount: document.getElementById('charCount'),
            timeEstimate: document.getElementById('timeEstimate'),
            toggleMode: document.getElementById('toggleMode'),
            editorMode: document.getElementById('editorMode'),
            teleprompterMode: document.getElementById('teleprompterMode'),
            teleprompterContainer: document.querySelector('#teleprompterMode .teleprompter-container'),
            teleprompterText: document.getElementById('teleprompterText'),
            fontSize: document.getElementById('fontSize'),
            fontSizeValue: document.getElementById('fontSizeValue'),
            scrollSpeed: document.getElementById('scrollSpeed'),
            scrollSpeedValue: document.getElementById('scrollSpeedValue'),
            margins: document.getElementById('margins'),
            marginsValue: document.getElementById('marginsValue'),
            mirrorMode: document.getElementById('mirrorMode'),
            darkMode: document.getElementById('darkMode'),
            documentUpload: document.getElementById('documentUpload'),
            logoUpload: document.getElementById('logoUpload'),
            speakerNameInput: document.getElementById('speakerName'),
            clearLogo: document.getElementById('clearLogo'),
            logoPreview: document.getElementById('logoPreview'),
            logoPlaceholder: document.getElementById('logoPlaceholder'),
            speakerNameDisplay: document.getElementById('speakerNameDisplay'),
            btnStart: document.getElementById('btnStart'),
            btnPause: document.getElementById('btnPause'),
            btnRestart: document.getElementById('btnRestart'),
            btnExit: document.getElementById('btnExit'),
            btnSlower: document.getElementById('btnSlower'),
            btnFaster: document.getElementById('btnFaster'),
            currentSpeed: document.getElementById('currentSpeed'),
            countdownOverlay: document.getElementById('countdownOverlay'),
            importStatus: document.getElementById('importStatus')
        };

        this.init();
    }

    init() {
        if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
        }

        this.bindEvents();
        this.loadFromStorage();
        this.updateCharCount();
        this.refreshBranding();
    }

    bindEvents() {
        this.elements.scriptInput.addEventListener('input', () => this.updateCharCount());
        this.elements.toggleMode.addEventListener('click', () => this.toggleMode());

        this.elements.fontSize.addEventListener('input', (e) => this.updateFontSize(e.target.value));
        this.elements.scrollSpeed.addEventListener('input', (e) => this.updateScrollSpeed(e.target.value));
        this.elements.margins.addEventListener('input', (e) => this.updateMargins(e.target.value));
        this.elements.mirrorMode.addEventListener('change', (e) => this.toggleMirror(e.target.checked));
        this.elements.darkMode.addEventListener('change', (e) => this.toggleDarkMode(e.target.checked));

        this.elements.documentUpload.addEventListener('change', (e) => this.handleDocumentUpload(e));
        this.elements.logoUpload.addEventListener('change', (e) => this.handleLogoUpload(e));
        this.elements.speakerNameInput.addEventListener('input', (e) => this.updateSpeakerName(e.target.value));
        this.elements.clearLogo.addEventListener('click', () => this.clearLogo());

        this.elements.btnStart.addEventListener('click', () => this.startTeleprompter());
        this.elements.btnPause.addEventListener('click', () => this.togglePause());
        this.elements.btnRestart.addEventListener('click', () => this.restartTeleprompter());
        this.elements.btnExit.addEventListener('click', () => this.exitTeleprompter());
        this.elements.btnSlower.addEventListener('click', () => this.adjustSpeed(-1));
        this.elements.btnFaster.addEventListener('click', () => this.adjustSpeed(1));

        this.elements.teleprompterContainer.addEventListener('pointerdown', (e) => this.handleTeleprompterHoldStart(e));
        this.elements.teleprompterContainer.addEventListener('pointerup', () => this.handleTeleprompterHoldEnd());
        this.elements.teleprompterContainer.addEventListener('pointercancel', () => this.handleTeleprompterHoldEnd());
        this.elements.teleprompterContainer.addEventListener('pointerleave', () => this.handleTeleprompterHoldEnd());

        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    async handleDocumentUpload(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            this.setImportStatus(`Leyendo ${file.name}...`);
            const rawText = await this.extractTextFromFile(file);
            const formatted = this.formatForTeleprompter(rawText);
            if (!formatted) throw new Error('El documento no devolvió texto legible');
            this.elements.scriptInput.value = formatted;
            this.updateCharCount();
            this.setImportStatus(`Listo: ${file.name}`);
            this.elements.scriptInput.focus();
        } catch (error) {
            console.error(error);
            this.setImportStatus('No pude leer ese documento');
            alert('No pude leer ese documento. Prueba con otro PDF o Word.');
        } finally {
            this.saveToStorage();
            event.target.value = '';
        }
    }

    async extractTextFromFile(file) {
        const name = file.name.toLowerCase();
        if (name.endsWith('.pdf')) {
            if (!window.pdfjsLib) throw new Error('PDF.js no cargó');
            const data = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data }).promise;
            const pages = [];
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                const pageText = content.items.map(item => item.str).join(' ');
                pages.push(pageText);
            }
            return pages.join('\n\n');
        }

        if (name.endsWith('.doc') || name.endsWith('.docx')) {
            if (!window.mammoth) throw new Error('Mammoth no cargó');
            const data = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer: data });
            return result.value;
        }

        return await file.text();
    }

    formatForTeleprompter(text) {
        const cleaned = text
            .replace(/\r/g, '\n')
            .replace(/[ \t]+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        if (!cleaned) return '';

        const paragraphs = cleaned.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
        const lines = [];

        for (const paragraph of paragraphs) {
            const sentences = paragraph.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
            if (sentences && sentences.length > 1) {
                lines.push(...sentences.map(s => s.trim()));
                lines.push('');
            } else {
                lines.push(paragraph);
                lines.push('');
            }
        }

        return lines.join('\n').trim();
    }

    async handleLogoUpload(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const dataUrl = await this.fileToDataUrl(file);
            this.logoDataUrl = dataUrl;
            this.refreshBranding();
            this.saveToStorage();
        } catch (error) {
            console.error(error);
            alert('No pude cargar ese logo.');
        } finally {
            event.target.value = '';
        }
    }

    fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    clearLogo() {
        this.logoDataUrl = '';
        this.refreshBranding();
        this.saveToStorage();
    }

    setImportStatus(text) {
        if (this.elements.importStatus) this.elements.importStatus.textContent = text;
    }

    updateSpeakerName(value) {
        this.speakerName = value.trim();
        this.refreshBranding();
        this.saveToStorage();
    }

    refreshBranding() {
        this.elements.speakerNameDisplay.textContent = this.speakerName || 'Tu nombre';

        if (this.logoDataUrl) {
            this.elements.logoPreview.src = this.logoDataUrl;
            this.elements.logoPreview.classList.remove('hidden');
            this.elements.logoPlaceholder.classList.add('hidden');
        } else {
            this.elements.logoPreview.removeAttribute('src');
            this.elements.logoPreview.classList.add('hidden');
            this.elements.logoPlaceholder.classList.remove('hidden');
        }
    }

    updateCharCount() {
        const text = this.elements.scriptInput.value;
        const chars = text.length;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const minutes = Math.max(1, Math.ceil(words / 150));

        this.elements.charCount.textContent = `${chars} caracteres`;
        this.elements.timeEstimate.textContent = `~${minutes} min`;
        this.saveToStorage();
    }

    updateFontSize(size) {
        this.fontSize = parseInt(size, 10);
        this.elements.fontSizeValue.textContent = `${size}px`;
        this.elements.teleprompterText.style.fontSize = `${size}px`;
        this.saveToStorage();
    }

    updateScrollSpeed(speed) {
        this.scrollSpeed = parseInt(speed, 10);
        this.elements.scrollSpeedValue.textContent = speed;
        this.elements.currentSpeed.textContent = `Vel: ${speed}`;
        this.saveToStorage();
    }

    updateMargins(margin) {
        this.margins = parseInt(margin, 10);
        this.elements.marginsValue.textContent = `${margin}%`;
        this.elements.teleprompterText.style.paddingLeft = `${margin}%`;
        this.elements.teleprompterText.style.paddingRight = `${margin}%`;
        this.saveToStorage();
    }

    toggleMirror(enabled) {
        this.mirrorMode = enabled;
        this.saveToStorage();
    }

    toggleDarkMode(enabled) {
        this.darkMode = enabled;
        document.body.classList.toggle('dark-mode', enabled);
        document.body.classList.toggle('light-mode', !enabled);
        this.saveToStorage();
    }

    applyTeleprompterContent() {
        this.elements.teleprompterText.textContent = this.elements.scriptInput.value.trim();
        this.elements.teleprompterText.classList.toggle('mirror', this.mirrorMode);
        this.elements.teleprompterText.style.fontSize = `${this.fontSize}px`;
        this.elements.teleprompterText.style.paddingLeft = `${this.margins}%`;
        this.elements.teleprompterText.style.paddingRight = `${this.margins}%`;
        this.refreshBranding();
    }

    toggleMode() {
        const script = this.elements.scriptInput.value.trim();
        const editorActive = this.elements.editorMode.classList.contains('active');

        if (editorActive) {
            if (!script) {
                alert('Por favor escribe o importa un script primero');
                return;
            }

            this.elements.editorMode.classList.remove('active');
            this.elements.teleprompterMode.classList.add('active');
            this.elements.teleprompterContainer.classList.add('active');
            this.elements.toggleMode.textContent = '✏️ Editar Script';
            this.applyTeleprompterContent();
            this.toggleDarkMode(this.darkMode);
        } else {
            this.stopTeleprompter();
            this.elements.teleprompterMode.classList.remove('active');
            this.elements.editorMode.classList.add('active');
            this.elements.toggleMode.textContent = '🎬 Iniciar Teleprompter';
        }
    }

    async startTeleprompter() {
        await this.showCountdown(3);
        this.isRunning = true;
        this.isPaused = false;
        this.touchPaused = false;
        this.scrollPosition = 0;
        this.elements.btnStart.disabled = true;
        this.elements.btnPause.disabled = false;
        this.elements.btnPause.textContent = '⏸️ Pausar';
        this.elements.teleprompterContainer.classList.add('active');
        this.requestFullscreenIfMobile();
        this.scroll();
    }

    scroll() {
        if (!this.isRunning || this.isPaused) return;

        this.scrollPosition += this.scrollSpeed * 0.5;
        const transform = `translateY(-${this.scrollPosition}px) ${this.mirrorMode ? 'scaleX(-1)' : ''}`;
        this.elements.teleprompterText.style.transform = transform;
        this.elements.teleprompterText.style.opacity = '1';
        this.elements.teleprompterText.style.visibility = 'visible';

        const maxScroll = Math.max(0, this.elements.teleprompterText.scrollHeight - window.innerHeight + 200);
        if (this.scrollPosition >= maxScroll) {
            this.stopTeleprompter();
            return;
        }

        this.animationFrame = requestAnimationFrame(() => this.scroll());
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.elements.btnPause.textContent = '▶️ Reanudar';
        } else {
            this.elements.btnPause.textContent = '⏸️ Pausar';
            this.scroll();
        }
    }

    handleTeleprompterHoldStart(event) {
        if (!this.isRunning || this.isPaused || this.touchPaused) return;
        if (event.target.closest('button')) return;
        this.touchPaused = true;
        this.isPaused = true;
        this.elements.btnPause.textContent = '▶️ Reanudar';
        if (event.pointerId !== undefined && event.currentTarget?.setPointerCapture) {
            try { event.currentTarget.setPointerCapture(event.pointerId); } catch (_) {}
        }
    }

    handleTeleprompterHoldEnd() {
        if (!this.touchPaused) return;
        this.touchPaused = false;
        this.isPaused = false;
        this.elements.btnPause.textContent = '⏸️ Pausar';
        this.scroll();
    }

    requestFullscreenIfMobile() {
        const isMobile = window.matchMedia('(max-width: 768px)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const target = this.elements.teleprompterMode;
        if (!isMobile || !target.requestFullscreen) return;
        if (document.fullscreenElement) return;
        target.requestFullscreen().catch(() => {});
    }

    restartTeleprompter() {
        this.scrollPosition = 0;
        this.elements.teleprompterText.style.transform = `translateY(0) ${this.mirrorMode ? 'scaleX(-1)' : ''}`;
        if (!this.isPaused) this.scroll();
    }

    stopTeleprompter() {
        this.isRunning = false;
        this.isPaused = false;
        this.touchPaused = false;
        this.elements.teleprompterText.style.transform = '';
        if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        }
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
        this.elements.btnStart.disabled = false;
        this.elements.btnPause.disabled = true;
    }

    exitTeleprompter() {
        this.stopTeleprompter();
        this.elements.teleprompterContainer.classList.remove('active');
        this.elements.teleprompterMode.classList.remove('active');
        this.elements.editorMode.classList.add('active');
        this.elements.toggleMode.textContent = '🎬 Iniciar Teleprompter';
    }

    adjustSpeed(delta) {
        const newSpeed = this.scrollSpeed + delta;
        if (newSpeed >= 1 && newSpeed <= 10) {
            this.elements.scrollSpeed.value = newSpeed;
            this.updateScrollSpeed(newSpeed);
        }
    }

    showCountdown(seconds) {
        return new Promise((resolve) => {
            this.elements.countdownOverlay.classList.remove('hidden');
            const countdownEl = this.elements.countdownOverlay.querySelector('.countdown');
            let count = seconds;
            countdownEl.textContent = count;

            const interval = setInterval(() => {
                count--;
                if (count > 0) {
                    countdownEl.textContent = count;
                } else {
                    clearInterval(interval);
                    this.elements.countdownOverlay.classList.add('hidden');
                    resolve();
                }
            }, 1000);
        });
    }

    handleKeyboard(e) {
        if (!this.elements.teleprompterMode.classList.contains('active')) return;

        switch (e.code) {
            case 'Space':
                e.preventDefault();
                if (this.isRunning) this.togglePause();
                else this.startTeleprompter();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.adjustSpeed(1);
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.adjustSpeed(-1);
                break;
            case 'Escape':
                this.exitTeleprompter();
                break;
        }
    }

    saveToStorage() {
        const settings = {
            fontSize: this.fontSize,
            scrollSpeed: this.scrollSpeed,
            margins: this.margins,
            mirrorMode: this.mirrorMode,
            darkMode: this.darkMode,
            script: this.elements.scriptInput.value,
            speakerName: this.speakerName,
            logoDataUrl: this.logoDataUrl
        };
        try {
            localStorage.setItem('teleprompterSettings', JSON.stringify(settings));
        } catch (e) {
            console.warn('No pude guardar todo en localStorage');
        }
    }

    loadFromStorage() {
        const saved = localStorage.getItem('teleprompterSettings');
        if (!saved) return;

        try {
            const settings = JSON.parse(saved);
            if (settings.fontSize) {
                this.elements.fontSize.value = settings.fontSize;
                this.updateFontSize(settings.fontSize);
            }
            if (settings.scrollSpeed) {
                this.elements.scrollSpeed.value = settings.scrollSpeed;
                this.updateScrollSpeed(settings.scrollSpeed);
            }
            if (settings.margins !== undefined) {
                this.elements.margins.value = settings.margins;
                this.updateMargins(settings.margins);
            }
            if (settings.mirrorMode !== undefined) {
                this.elements.mirrorMode.checked = settings.mirrorMode;
                this.toggleMirror(settings.mirrorMode);
            }
            if (settings.darkMode !== undefined) {
                this.elements.darkMode.checked = settings.darkMode;
                this.toggleDarkMode(settings.darkMode);
            }
            if (settings.script) this.elements.scriptInput.value = settings.script;
            if (settings.speakerName) {
                this.speakerName = settings.speakerName;
                this.elements.speakerNameInput.value = settings.speakerName;
            }
            if (settings.logoDataUrl) this.logoDataUrl = settings.logoDataUrl;
            if (settings.logoDataUrl) this.setImportStatus('Logo cargado');
            this.refreshBranding();
            this.updateCharCount();
        } catch (e) {
            console.error('Error loading settings:', e);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.teleprompterApp = new TeleprompterApp();
});
