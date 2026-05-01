// Teleprompter Pro - Main Application Logic

class TeleprompterApp {
    constructor() {
        // State
        this.isRunning = false;
        this.isPaused = false;
        this.scrollSpeed = 3;
        this.fontSize = 48;
        this.margins = 10;
        this.mirrorMode = false;
        this.darkMode = true;
        this.scrollPosition = 0;
        this.animationFrame = null;
        
        // Elements
        this.elements = {
            scriptInput: document.getElementById('scriptInput'),
            charCount: document.getElementById('charCount'),
            timeEstimate: document.getElementById('timeEstimate'),
            toggleMode: document.getElementById('toggleMode'),
            editorMode: document.getElementById('editorMode'),
            teleprompterMode: document.getElementById('teleprompterMode'),
            teleprompterText: document.getElementById('teleprompterText'),
            fontSize: document.getElementById('fontSize'),
            fontSizeValue: document.getElementById('fontSizeValue'),
            scrollSpeed: document.getElementById('scrollSpeed'),
            scrollSpeedValue: document.getElementById('scrollSpeedValue'),
            margins: document.getElementById('margins'),
            marginsValue: document.getElementById('marginsValue'),
            mirrorMode: document.getElementById('mirrorMode'),
            darkMode: document.getElementById('darkMode'),
            btnStart: document.getElementById('btnStart'),
            btnPause: document.getElementById('btnPause'),
            btnRestart: document.getElementById('btnRestart'),
            btnExit: document.getElementById('btnExit'),
            btnSlower: document.getElementById('btnSlower'),
            btnFaster: document.getElementById('btnFaster'),
            currentSpeed: document.getElementById('currentSpeed'),
            countdownOverlay: document.getElementById('countdownOverlay')
        };
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.updateCharCount();
        this.loadFromStorage();
    }
    
    bindEvents() {
        // Editor events
        this.elements.scriptInput.addEventListener('input', () => this.updateCharCount());
        this.elements.toggleMode.addEventListener('click', () => this.toggleMode());
        
        // Settings events
        this.elements.fontSize.addEventListener('input', (e) => this.updateFontSize(e.target.value));
        this.elements.scrollSpeed.addEventListener('input', (e) => this.updateScrollSpeed(e.target.value));
        this.elements.margins.addEventListener('input', (e) => this.updateMargins(e.target.value));
        this.elements.mirrorMode.addEventListener('change', (e) => this.toggleMirror(e.target.checked));
        this.elements.darkMode.addEventListener('change', (e) => this.toggleDarkMode(e.target.checked));
        
        // Teleprompter controls
        this.elements.btnStart.addEventListener('click', () => this.startTeleprompter());
        this.elements.btnPause.addEventListener('click', () => this.togglePause());
        this.elements.btnRestart.addEventListener('click', () => this.restartTeleprompter());
        this.elements.btnExit.addEventListener('click', () => this.exitTeleprompter());
        this.elements.btnSlower.addEventListener('click', () => this.adjustSpeed(-1));
        this.elements.btnFaster.addEventListener('click', () => this.adjustSpeed(1));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }
    
    updateCharCount() {
        const text = this.elements.scriptInput.value;
        const chars = text.length;
        const words = text.trim().split(/\s+/).filter(w => w).length;
        const minutes = Math.ceil(words / 150); // Average speaking rate
        
        this.elements.charCount.textContent = `${chars} caracteres`;
        this.elements.timeEstimate.textContent = `~${minutes} min`;
        
        this.saveToStorage();
    }
    
    updateFontSize(size) {
        this.fontSize = parseInt(size);
        this.elements.fontSizeValue.textContent = `${size}px`;
        this.elements.teleprompterText.style.fontSize = `${size}px`;
        this.saveToStorage();
    }
    
    updateScrollSpeed(speed) {
        this.scrollSpeed = parseInt(speed);
        this.elements.scrollSpeedValue.textContent = speed;
        this.elements.currentSpeed.textContent = `Vel: ${speed}`;
        this.saveToStorage();
    }
    
    updateMargins(margin) {
        this.margins = parseInt(margin);
        this.elements.marginsValue.textContent = `${margin}%`;
        this.elements.teleprompterText.style.paddingLeft = `${margin}%`;
        this.elements.teleprompterText.style.paddingRight = `${margin}%`;
        this.saveToStorage();
    }
    
    toggleMirror(enabled) {
        this.mirrorMode = enabled;
        this.elements.teleprompterText.classList.toggle('mirror', enabled);
        this.saveToStorage();
    }
    
    toggleDarkMode(enabled) {
        this.darkMode = enabled;
        document.body.classList.toggle('dark-mode', enabled);
        document.body.classList.toggle('light-mode', !enabled);
        this.saveToStorage();
    }
    
    toggleMode() {
        const script = this.elements.scriptInput.value.trim();
        
        if (!script) {
            alert('Por favor escribe un script primero');
            return;
        }
        
        const editorActive = this.elements.editorMode.classList.contains('active');
        
        if (editorActive) {
            // Switch to teleprompter mode
            this.elements.editorMode.classList.remove('active');
            this.elements.teleprompterMode.classList.add('active');
            this.elements.teleprompterText.textContent = script;
            this.elements.toggleMode.textContent = '✏️ Editar Script';
            
            // Apply current settings
            this.updateFontSize(this.fontSize);
            this.updateMargins(this.margins);
            this.toggleMirror(this.mirrorMode);
            this.toggleDarkMode(this.darkMode);
        } else {
            // Switch back to editor
            this.exitTeleprompter();
            this.elements.editorMode.classList.add('active');
            this.elements.teleprompterMode.classList.remove('active');
            this.elements.toggleMode.textContent = '🎬 Iniciar Teleprompter';
        }
    }
    
    async startTeleprompter() {
        // Countdown
        await this.showCountdown(3);
        
        this.isRunning = true;
        this.isPaused = false;
        this.scrollPosition = 0;
        
        this.elements.btnStart.disabled = true;
        this.elements.btnPause.disabled = false;
        this.elements.btnPause.textContent = '⏸️ Pausar';
        
        this.scroll();
    }
    
    scroll() {
        if (!this.isRunning || this.isPaused) return;
        
        this.scrollPosition += this.scrollSpeed * 0.5;
        this.elements.teleprompterText.style.transform = `translateY(-${this.scrollPosition}px) ${this.mirrorMode ? 'scaleX(-1)' : ''}`;
        
        // Check if reached end
        const maxScroll = this.elements.teleprompterText.scrollHeight - window.innerHeight;
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
    
    restartTeleprompter() {
        this.scrollPosition = 0;
        this.elements.teleprompterText.style.transform = `translateY(0) ${this.mirrorMode ? 'scaleX(-1)' : ''}`;
        
        if (!this.isPaused) {
            this.scroll();
        }
    }
    
    stopTeleprompter() {
        this.isRunning = false;
        this.isPaused = false;
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        this.elements.btnStart.disabled = false;
        this.elements.btnPause.disabled = true;
    }
    
    exitTeleprompter() {
        this.stopTeleprompter();
        this.toggleMode();
    }
    
    adjustSpeed(delta) {
        const newSpeed = this.scrollSpeed + delta;
        if (newSpeed >= 1 && newSpeed <= 10) {
            this.updateScrollSpeed(newSpeed);
            this.elements.scrollSpeed.value = newSpeed;
        }
    }
    
    async showCountdown(seconds) {
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
        // Only handle shortcuts in teleprompter mode
        if (!this.elements.teleprompterMode.classList.contains('active')) return;
        
        switch(e.code) {
            case 'Space':
                e.preventDefault();
                if (this.isRunning) {
                    this.togglePause();
                } else {
                    this.startTeleprompter();
                }
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
            script: this.elements.scriptInput.value
        };
        localStorage.setItem('teleprompterSettings', JSON.stringify(settings));
    }
    
    loadFromStorage() {
        const saved = localStorage.getItem('teleprompterSettings');
        if (saved) {
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
                if (settings.script) {
                    this.elements.scriptInput.value = settings.script;
                    this.updateCharCount();
                }
            } catch (e) {
                console.error('Error loading settings:', e);
            }
        }
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.teleprompterApp = new TeleprompterApp();
});
