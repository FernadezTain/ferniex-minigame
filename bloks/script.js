// Константы
const BOARD_SIZE = 8;
const PIECE_COUNT = 3;
const SECRET_KEY = 'block-blast-2025-secret';
const TOUCH_OFFSET_Y = 100;

let currentUser = null;
try {
    currentUser = JSON.parse(sessionStorage.getItem('ag_user') || 'null');
} catch(_) {}

const PIECE_SHAPES = [
    [[1]],
    [[1, 1]],
    [[1], [1]],
    [[1, 1, 1]],
    [[1], [1], [1]],
    [[1, 1, 1, 1]],
    [[1], [1], [1], [1]],
    [[1, 1, 1, 1, 1]],
    [[1], [1], [1], [1], [1]],
    [[1, 1], [1, 1]],
    [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
    [[1, 0], [1, 0], [1, 1]],
    [[0, 1], [0, 1], [1, 1]],
    [[1, 1], [1, 0], [1, 0]],
    [[1, 1], [0, 1], [0, 1]],
    [[1, 1, 1], [0, 1, 0]],
    [[0, 1, 0], [1, 1, 1]],
    [[1, 0], [1, 1], [1, 0]],
    [[0, 1], [1, 1], [0, 1]],
    [[1, 1, 0], [0, 1, 1]],
    [[0, 1, 1], [1, 1, 0]],
    [[1, 0], [1, 1], [0, 1]],
    [[0, 1], [1, 1], [1, 0]],
    [[1, 1, 1], [1, 0, 0]],
    [[1, 1, 1], [0, 0, 1]],
    [[1, 0, 0], [1, 1, 1]],
    [[0, 0, 1], [1, 1, 1]],
    [[1, 1], [1, 0]],
    [[1, 1], [0, 1]],
    [[1, 0], [1, 1]],
    [[0, 1], [1, 1]],
];

const COLORS = [
    '#FF6B6B', '#4ECDC4', '#FFE66D', '#A78BFA',
    '#4ADE80', '#FB923C', '#F472B6', '#60A5FA'
];

class BlockBlastGame {
    constructor() {
        this.board = this.createEmptyBoard();
        this.pieces = [];
        this.score = 0;
        this.highScore = this.loadHighScore();
        this.clearedLines = 0;
        this.maxCombo = 0;
        this.piecesPlaced = 0;
        this.currentCombo = 0;
        this.isDragging = false;
        this.rewardSent = false; // флаг — награда уже отправлена
        
        this.init();
    }
    
    init() {
        this.createBoard();
        this.generateNewPieces();
        this.updateScore();
        this.updateStats();
        this.setupEventListeners();
    }
    
    createEmptyBoard() {
        return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));
    }
    
    createBoard() {
        const boardElement = document.getElementById('gameBoard');
        boardElement.innerHTML = '';
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                boardElement.appendChild(cell);
            }
        }
    }
    
    generateNewPieces() {
        const piecesGrid = document.getElementById('piecesGrid');
        piecesGrid.innerHTML = '';
        this.pieces = [];
        
        const boardAnalysis = this.analyzeBoardSpace();
        const suitableShapes = this.getSuitableShapes(boardAnalysis);
        
        for (let i = 0; i < PIECE_COUNT; i++) {
            let shape;
            if (Math.random() < 0.7 && suitableShapes.length > 0) {
                shape = suitableShapes[Math.floor(Math.random() * suitableShapes.length)];
            } else {
                shape = PIECE_SHAPES[Math.floor(Math.random() * PIECE_SHAPES.length)];
            }
            const color = COLORS[Math.floor(Math.random() * COLORS.length)];
            const piece = { id: i, shape: JSON.parse(JSON.stringify(shape)), color, used: false };
            this.pieces.push(piece);
            this.createPieceElement(piece, i);
        }
    }
    
    analyzeBoardSpace() {
        const analysis = {
            emptySpaces: [],
            largestHorizontalGap: 0,
            largestVerticalGap: 0,
            largestSquareGap: 0,
            hasSmallSpaces: false,
            hasMediumSpaces: false,
            hasLargeSpaces: false
        };
        for (let row = 0; row < BOARD_SIZE; row++) {
            let horizontalGap = 0;
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (this.board[row][col] === 0) {
                    horizontalGap++;
                    analysis.emptySpaces.push({ row, col });
                } else {
                    if (horizontalGap > 0) analysis.largestHorizontalGap = Math.max(analysis.largestHorizontalGap, horizontalGap);
                    horizontalGap = 0;
                }
            }
            if (horizontalGap > 0) analysis.largestHorizontalGap = Math.max(analysis.largestHorizontalGap, horizontalGap);
        }
        for (let col = 0; col < BOARD_SIZE; col++) {
            let verticalGap = 0;
            for (let row = 0; row < BOARD_SIZE; row++) {
                if (this.board[row][col] === 0) {
                    verticalGap++;
                } else {
                    if (verticalGap > 0) analysis.largestVerticalGap = Math.max(analysis.largestVerticalGap, verticalGap);
                    verticalGap = 0;
                }
            }
            if (verticalGap > 0) analysis.largestVerticalGap = Math.max(analysis.largestVerticalGap, verticalGap);
        }
        for (let size = 5; size >= 2; size--) {
            for (let row = 0; row <= BOARD_SIZE - size; row++) {
                for (let col = 0; col <= BOARD_SIZE - size; col++) {
                    let isEmpty = true;
                    for (let r = row; r < row + size && isEmpty; r++)
                        for (let c = col; c < col + size && isEmpty; c++)
                            if (this.board[r][c] !== 0) isEmpty = false;
                    if (isEmpty) analysis.largestSquareGap = Math.max(analysis.largestSquareGap, size);
                }
            }
        }
        analysis.hasSmallSpaces = analysis.largestHorizontalGap >= 1 || analysis.largestVerticalGap >= 1;
        analysis.hasMediumSpaces = analysis.largestHorizontalGap >= 3 || analysis.largestVerticalGap >= 3;
        analysis.hasLargeSpaces = analysis.largestSquareGap >= 3 || analysis.largestHorizontalGap >= 5;
        return analysis;
    }
    
    getSuitableShapes(analysis) {
        const suitable = [];
        PIECE_SHAPES.forEach((shape) => {
            const height = shape.length;
            const width = shape[0].length;
            let fits = false;
            if (height <= 2 && width <= 2 && analysis.hasSmallSpaces) fits = true;
            if ((height <= 3 && width <= 3) && analysis.hasMediumSpaces) fits = true;
            if (height === 1 && width <= analysis.largestHorizontalGap) fits = true;
            if (width === 1 && height <= analysis.largestVerticalGap) fits = true;
            if (height === width && height <= analysis.largestSquareGap) fits = true;
            if (fits || this.canShapeFitAnywhere(shape)) suitable.push(shape);
        });
        return suitable.length > 0 ? suitable : PIECE_SHAPES;
    }
    
    canShapeFitAnywhere(shape) {
        const testPiece = { shape, color: '#000000', used: false };
        for (let row = 0; row < BOARD_SIZE; row++)
            for (let col = 0; col < BOARD_SIZE; col++)
                if (this.canPlacePiece(row, col, testPiece)) return true;
        return false;
    }
    
    createPieceElement(piece, index) {
        const wrapper = document.createElement('div');
        wrapper.className = 'piece-wrapper';
        wrapper.dataset.pieceId = index;
        const grid = document.createElement('div');
        grid.className = 'piece-grid';
        grid.style.gridTemplateColumns = `repeat(${piece.shape[0].length}, 24px)`;
        grid.style.gridTemplateRows = `repeat(${piece.shape.length}, 24px)`;
        piece.shape.forEach(row => {
            row.forEach(cell => {
                const cellElement = document.createElement('div');
                cellElement.className = 'piece-cell';
                if (cell) {
                    cellElement.classList.add('filled');
                    cellElement.style.background = `linear-gradient(135deg, ${piece.color}, ${this.lightenColor(piece.color, 20)})`;
                }
                grid.appendChild(cellElement);
            });
        });
        wrapper.appendChild(grid);
        document.getElementById('piecesGrid').appendChild(wrapper);
        this.setupDragAndDrop(wrapper, piece, index);
    }
    
    setupDragAndDrop(wrapper, piece, index) {
        let isDragging = false;
        let ghostPiece = null;
        let currentPreviewRow = null;
        let currentPreviewCol = null;
        
        const createGhostPiece = (e) => {
            ghostPiece = wrapper.cloneNode(true);
            ghostPiece.style.position = 'fixed';
            ghostPiece.style.pointerEvents = 'none';
            ghostPiece.style.zIndex = '1000';
            ghostPiece.style.opacity = '0.8';
            ghostPiece.style.transform = 'scale(1.1)';
            ghostPiece.style.transition = 'none';
            document.body.appendChild(ghostPiece);
            updateGhostPosition(e);
        };
        
        const updateGhostPosition = (e) => {
            if (!ghostPiece) return;
            const clientX = e.clientX || (e.touches && e.touches[0].clientX);
            const clientY = e.clientY || (e.touches && e.touches[0].clientY);
            if (clientX !== undefined && clientY !== undefined) {
                const isTouchEvent = !!(e.touches || e.changedTouches);
                const offsetY = isTouchEvent ? TOUCH_OFFSET_Y : ghostPiece.offsetHeight / 2;
                ghostPiece.style.left = (clientX - ghostPiece.offsetWidth / 2) + 'px';
                ghostPiece.style.top = (clientY - offsetY) + 'px';
            }
        };
        
        const removeGhostPiece = () => {
            if (ghostPiece && ghostPiece.parentNode) {
                ghostPiece.parentNode.removeChild(ghostPiece);
                ghostPiece = null;
            }
        };
        
        const onStart = (e) => {
            if (piece.used) return;
            e.preventDefault();
            isDragging = true;
            this.isDragging = true;
            wrapper.classList.add('dragging');
            document.body.classList.add('dragging');
            createGhostPiece(e);
        };
        
        const onMove = (e) => {
            if (!isDragging) return;
            e.preventDefault();
            updateGhostPosition(e);
            const clientX = e.clientX || (e.touches && e.touches[0].clientX);
            const clientY = e.clientY || (e.touches && e.touches[0].clientY);
            const isTouchEvent = !!(e.touches || e.changedTouches);
            const lookupY = isTouchEvent ? clientY - TOUCH_OFFSET_Y : clientY;
            if (ghostPiece) ghostPiece.style.display = 'none';
            const elements = document.elementsFromPoint(clientX, lookupY);
            const cell = elements.find(el => el.classList.contains('cell'));
            if (ghostPiece) ghostPiece.style.display = 'block';
            if (cell) {
                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);
                if (currentPreviewRow !== row || currentPreviewCol !== col) {
                    currentPreviewRow = row;
                    currentPreviewCol = col;
                    this.showPreview(row, col, piece);
                }
            } else {
                if (currentPreviewRow !== null || currentPreviewCol !== null) {
                    this.clearPreview();
                    currentPreviewRow = null;
                    currentPreviewCol = null;
                }
            }
        };
        
        const onEnd = (e) => {
            if (!isDragging) return;
            isDragging = false;
            this.isDragging = false;
            wrapper.classList.remove('dragging');
            document.body.classList.remove('dragging');
            removeGhostPiece();
            const clientX = e.clientX || (e.changedTouches && e.changedTouches[0].clientX);
            const clientY = e.clientY || (e.changedTouches && e.changedTouches[0].clientY);
            const isTouchEnd = !!(e.changedTouches && !e.clientX);
            const lookupY = isTouchEnd ? clientY - TOUCH_OFFSET_Y : clientY;
            const elements = document.elementsFromPoint(clientX, lookupY);
            const cell = elements.find(el => el.classList.contains('cell'));
            if (cell) {
                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);
                this.placePiece(row, col, index);
            }
            this.clearPreview();
            currentPreviewRow = null;
            currentPreviewCol = null;
        };
        
        const onCancel = () => {
            if (isDragging) {
                isDragging = false;
                this.isDragging = false;
                wrapper.classList.remove('dragging');
                document.body.classList.remove('dragging');
                removeGhostPiece();
                this.clearPreview();
                currentPreviewRow = null;
                currentPreviewCol = null;
            }
        };
        
        wrapper.addEventListener('mousedown', onStart);
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
        wrapper.addEventListener('touchstart', onStart, { passive: false });
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
        document.addEventListener('touchcancel', onCancel);
    }
    
    setupEventListeners() {
        document.getElementById('restartBtn').addEventListener('click', () => this.restart());
        document.getElementById('rewardBtn').addEventListener('click', () => this.sendReward());
        document.getElementById('modalBackdrop').addEventListener('click', () => this.restart());
    }
    
    showPreview(startRow, startCol, piece) {
        this.clearPreview();
        const canPlace = this.canPlacePiece(startRow, startCol, piece);
        piece.shape.forEach((row, i) => {
            row.forEach((cell, j) => {
                if (cell) {
                    const targetRow = startRow + i;
                    const targetCol = startCol + j;
                    if (targetRow >= 0 && targetRow < BOARD_SIZE && targetCol >= 0 && targetCol < BOARD_SIZE) {
                        const cellElement = document.querySelector(`[data-row="${targetRow}"][data-col="${targetCol}"]`);
                        if (cellElement) {
                            cellElement.classList.add(canPlace ? 'preview' : 'invalid-preview');
                            if (canPlace) cellElement.style.color = piece.color;
                        }
                    }
                }
            });
        });
    }
    
    clearPreview() {
        document.querySelectorAll('.preview, .invalid-preview').forEach(cell => {
            cell.classList.remove('preview', 'invalid-preview');
            cell.style.color = '';
        });
    }
    
    canPlacePiece(startRow, startCol, piece) {
        for (let i = 0; i < piece.shape.length; i++) {
            for (let j = 0; j < piece.shape[i].length; j++) {
                if (piece.shape[i][j]) {
                    const targetRow = startRow + i;
                    const targetCol = startCol + j;
                    if (targetRow < 0 || targetRow >= BOARD_SIZE || targetCol < 0 || targetCol >= BOARD_SIZE) return false;
                    if (this.board[targetRow][targetCol] !== 0) return false;
                }
            }
        }
        return true;
    }
    
    placePiece(startRow, startCol, pieceIndex) {
        const piece = this.pieces[pieceIndex];
        if (piece.used || !this.canPlacePiece(startRow, startCol, piece)) return;
        
        piece.shape.forEach((row, i) => {
            row.forEach((cell, j) => {
                if (cell) {
                    this.board[startRow + i][startCol + j] = piece.color;
                }
            });
        });
        
        this.score += 10;
        this.updateScore();
        piece.used = true;
        document.querySelector(`[data-piece-id="${pieceIndex}"]`).classList.add('used');
        this.piecesPlaced++;
        this.renderBoard();
        
        setTimeout(() => {
            const linesCleared = this.checkAndClearLines();
            if (linesCleared > 0) {
                this.currentCombo++;
                if (this.currentCombo > 1) this.showCombo();
                if (this.currentCombo > this.maxCombo) this.maxCombo = this.currentCombo;
            } else {
                this.currentCombo = 0;
            }
            if (this.pieces.every(p => p.used)) this.generateNewPieces();
            this.updateStats();
            setTimeout(() => {
                if (!this.hasValidMoves()) this.gameOver();
            }, 600);
        }, 300);
    }
    
    renderBoard() {
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                const value = this.board[row][col];
                if (value !== 0) {
                    cell.classList.add('filled');
                    cell.dataset.color = COLORS.indexOf(value) + 1;
                } else {
                    cell.classList.remove('filled');
                    delete cell.dataset.color;
                }
            }
        }
    }
    
    checkAndClearLines() {
        const rowsToClear = [];
        const colsToClear = [];
        for (let row = 0; row < BOARD_SIZE; row++) {
            if (this.board[row].every(cell => cell !== 0)) rowsToClear.push(row);
        }
        for (let col = 0; col < BOARD_SIZE; col++) {
            let filled = true;
            for (let row = 0; row < BOARD_SIZE; row++) {
                if (this.board[row][col] === 0) { filled = false; break; }
            }
            if (filled) colsToClear.push(col);
        }
        const totalLines = rowsToClear.length + colsToClear.length;
        if (totalLines > 0) {
            rowsToClear.forEach(row => {
                for (let col = 0; col < BOARD_SIZE; col++)
                    document.querySelector(`[data-row="${row}"][data-col="${col}"]`).classList.add('clearing');
            });
            colsToClear.forEach(col => {
                for (let row = 0; row < BOARD_SIZE; row++)
                    document.querySelector(`[data-row="${row}"][data-col="${col}"]`).classList.add('clearing');
            });
            setTimeout(() => {
                rowsToClear.forEach(row => {
                    for (let col = 0; col < BOARD_SIZE; col++) this.board[row][col] = 0;
                });
                colsToClear.forEach(col => {
                    for (let row = 0; row < BOARD_SIZE; row++) this.board[row][col] = 0;
                });
                this.renderBoard();
                const linePoints = totalLines * 30;
                const comboBonus = this.currentCombo > 1 ? (this.currentCombo - 1) * 75 : 0;
                this.score += linePoints + comboBonus;
                this.clearedLines += totalLines;
                this.updateScore();
            }, 500);
        }
        return totalLines;
    }
    
    showCombo() {
        const comboDisplay = document.getElementById('comboDisplay');
        document.getElementById('comboMultiplier').textContent = `x${this.currentCombo}`;
        comboDisplay.classList.remove('hidden');
        setTimeout(() => comboDisplay.classList.add('hidden'), 1500);
    }
    
    hasValidMoves() {
        const availablePieces = this.pieces.filter(p => !p.used);
        if (availablePieces.length === 0) return true;
        for (const piece of availablePieces)
            for (let row = 0; row < BOARD_SIZE; row++)
                for (let col = 0; col < BOARD_SIZE; col++)
                    if (this.canPlacePiece(row, col, piece)) return true;
        return false;
    }
    
    updateScore() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('highScore').textContent = this.highScore;
    }
    
    updateStats() {
        document.getElementById('clearedLines').textContent = this.clearedLines;
        document.getElementById('maxCombo').textContent = this.maxCombo;
        document.getElementById('piecesPlaced').textContent = this.piecesPlaced;
    }
    
    async gameOver() {
        // Сохраняем рекорд
        const isNewHighScore = this.score > this.highScore;
        if (isNewHighScore) {
            this.highScore = this.score;
            this.saveHighScore();
        }

        // Автоматически отправляем награду ОДИН РАЗ
        if (!this.rewardSent) {
            this.rewardSent = true;
            await this.sendRewardToServer();
        }

        // Показываем модал ПОСЛЕ отправки — без размытия и улетания
        if (isNewHighScore) {
            document.getElementById('newHighScore').classList.remove('hidden');
        } else {
            document.getElementById('newHighScore').classList.add('hidden');
        }
        document.getElementById('finalScore').textContent = this.score;

        // Убираем анимацию у модала чтобы он не улетал
        const modal = document.getElementById('gameOverModal');
        const modalContent = modal.querySelector('.modal-content');
        modalContent.style.animation = 'none';
        modal.classList.remove('hidden');

        // Прячем кнопку награды — она уже отправлена автоматически
        const rewardBtn = document.getElementById('rewardBtn');
        if (rewardBtn) rewardBtn.style.display = 'none';
    }
    
    async sendRewardToServer() {
        const user = currentUser || JSON.parse(sessionStorage.getItem('ag_user') || 'null');
        if (!user) return;
        try {
            await fetch('https://ferniex-id.vercel.app/api/stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id || user.userId,
                    game: 'ferniex_blocks',
                    score: this.score
                })
            });
        } catch(e) {
            console.error('reward error:', e);
        }
    }

    // Кнопка "Получить награду" — теперь просто закрывает модал
    async sendReward() {
        const modal = document.getElementById('gameOverModal');
        const modalContent = modal.querySelector('.modal-content');
        modalContent.style.animation = 'modalSlideOut 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
        setTimeout(() => this.restart(), 400);
    }
    
    hideGameOver() {
        document.getElementById('gameOverModal').classList.add('hidden');
    }
    
    restart() {
        this.hideGameOver();
        this.board = this.createEmptyBoard();
        this.score = 0;
        this.clearedLines = 0;
        this.maxCombo = 0;
        this.piecesPlaced = 0;
        this.currentCombo = 0;
        this.rewardSent = false; // сбрасываем флаг для новой игры

        // Восстанавливаем кнопку награды
        const rewardBtn = document.getElementById('rewardBtn');
        if (rewardBtn) rewardBtn.style.display = '';

        this.renderBoard();
        this.generateNewPieces();
        this.updateScore();
        this.updateStats();
    }
    
    lightenColor(color, percent) {
        const num = parseInt(color.replace("#",""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
    }
    
    loadHighScore() {
        const saved = localStorage.getItem('blockBlastHighScore');
        return saved ? parseInt(saved) : 0;
    }
    
    saveHighScore() {
        localStorage.setItem('blockBlastHighScore', this.highScore.toString());
    }

    generateChecksum(score) {
        const str = `${score}${this.clearedLines}${this.maxCombo}${SECRET_KEY}`;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new BlockBlastGame();
});
