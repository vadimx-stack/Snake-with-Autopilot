const SnakeGame = (() => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const gridSize = 20;
    const gridWidth = canvas.width / gridSize;
    const gridHeight = canvas.height / gridSize;
    
    const startButton = document.getElementById('startButton');
    const autopilotButton = document.getElementById('autopilotButton');
    const restartButton = document.getElementById('restartButton');
    const speedSlider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');
    const scoreElement = document.getElementById('score');
    const finalScoreElement = document.getElementById('finalScore');
    const highScoreElement = document.getElementById('highScore');
    const gameOverOverlay = document.getElementById('gameOverOverlay');
    
    let gameState = {
        snake: [],
        food: { x: 0, y: 0 },
        direction: 'right',
        nextDirection: 'right',
        speed: 10,
        score: 0,
        highScore: localStorage.getItem('snakeHighScore') || 0,
        gameOver: false,
        gameStarted: false,
        autopilot: false,
        gameLoop: null,
        isPathfinding: false,
        pathToFood: [],
        pathToTail: [],
        followingTail: false,
        pathfindingMode: 'food',
        lastAteFood: 0,
        hamiltonian: null,
        safetyMode: false
    };
    
    const init = () => {
        gameState.snake = [
            { x: 5, y: 5 },
            { x: 4, y: 5 },
            { x: 3, y: 5 }
        ];
        
        gameState.direction = 'right';
        gameState.nextDirection = 'right';
        gameState.score = 0;
        gameState.gameOver = false;
        gameState.gameStarted = false;
        gameState.pathToFood = [];
        gameState.pathToTail = [];
        gameState.followingTail = false;
        gameState.pathfindingMode = 'food';
        gameState.lastAteFood = 0;
        gameState.safetyMode = false;
        
        scoreElement.textContent = gameState.score;
        highScoreElement.textContent = gameState.highScore;
        
        generateFood();
        
        render();
    };
    
    const generateFood = () => {
        let foodPosition;
        
        do {
            foodPosition = {
                x: Math.floor(Math.random() * gridWidth),
                y: Math.floor(Math.random() * gridHeight)
            };
        } while (gameState.snake.some(segment => segment.x === foodPosition.x && segment.y === foodPosition.y));
        
        gameState.food = foodPosition;
    };
    
    const render = () => {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (gameState.autopilot) {
            drawGrid();
        }
        
        gameState.snake.forEach((segment, index) => {
            if (index === 0) {
                ctx.fillStyle = '#3fe08f';
            } else {
                const colorValue = 255 - (index * 5);
                ctx.fillStyle = `rgb(${colorValue}, 240, 143)`;
            }
            
            ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize, gridSize);
            
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 1;
            ctx.strokeRect(segment.x * gridSize + 1, segment.y * gridSize + 1, gridSize - 2, gridSize - 2);
        });
        
        const foodPulse = Math.sin(Date.now() / 200) * 0.1 + 0.9;
        const foodSize = gridSize * foodPulse;
        const foodOffset = (gridSize - foodSize) / 2;
        
        ctx.fillStyle = '#ff5555';
        ctx.beginPath();
        ctx.arc(
            gameState.food.x * gridSize + gridSize / 2,
            gameState.food.y * gridSize + gridSize / 2,
            foodSize / 2,
            0,
            Math.PI * 2
        );
        ctx.fill();
        
        if (gameState.autopilot) {
            if (gameState.pathToFood.length > 0 && gameState.pathfindingMode === 'food') {
                ctx.fillStyle = 'rgba(74, 107, 175, 0.3)';
                gameState.pathToFood.forEach(node => {
                    ctx.fillRect(node.x * gridSize, node.y * gridSize, gridSize, gridSize);
                });
            }
            
            if (gameState.pathToTail.length > 0 && gameState.pathfindingMode === 'tail') {
                ctx.fillStyle = 'rgba(175, 74, 107, 0.3)';
                gameState.pathToTail.forEach(node => {
                    ctx.fillRect(node.x * gridSize, node.y * gridSize, gridSize, gridSize);
                });
            }
            
            ctx.font = '14px Arial';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.textAlign = 'left';
            ctx.fillText(`Режим: ${getPathfindingModeText()}`, 10, 20);
            
            if (gameState.safetyMode) {
                ctx.fillText('Безопасный режим активен', 10, 40);
            }
        }
    };
    
    const getPathfindingModeText = () => {
        switch (gameState.pathfindingMode) {
            case 'food': return 'Поиск еды';
            case 'tail': return 'Следование к хвосту';
            case 'wander': return 'Свободное движение';
            default: return 'Неизвестно';
        }
    };
    
    const drawGrid = () => {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 0.5;
        
        for (let y = 0; y <= gridHeight; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * gridSize);
            ctx.lineTo(canvas.width, y * gridSize);
            ctx.stroke();
        }
        
        for (let x = 0; x <= gridWidth; x++) {
            ctx.beginPath();
            ctx.moveTo(x * gridSize, 0);
            ctx.lineTo(x * gridSize, canvas.height);
            ctx.stroke();
        }
    };
    
    const update = () => {
        if (gameState.gameOver || !gameState.gameStarted) return;
        
        gameState.direction = gameState.nextDirection;
        
        const head = { ...gameState.snake[0] };
        
        switch (gameState.direction) {
            case 'up':
                head.y -= 1;
                break;
            case 'down':
                head.y += 1;
                break;
            case 'left':
                head.x -= 1;
                break;
            case 'right':
                head.x += 1;
                break;
        }
        
        if (head.x < 0 || head.x >= gridWidth || head.y < 0 || head.y >= gridHeight) {
            gameOver();
            return;
        }
        
        if (gameState.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
            gameOver();
            return;
        }
        
        gameState.snake.unshift(head);
        
        if (head.x === gameState.food.x && head.y === gameState.food.y) {
            gameState.score += 10;
            scoreElement.textContent = gameState.score;
            scoreElement.classList.add('pulse');
            
            gameState.lastAteFood = 0;
            
            setTimeout(() => {
                scoreElement.classList.remove('pulse');
            }, 500);
            
            generateFood();
            
            if (gameState.autopilot) {
                gameState.pathToFood = [];
                gameState.pathToTail = [];
                gameState.pathfindingMode = 'food';
                gameState.followingTail = false;
                findPathToFood();
            }
        } else {
            gameState.snake.pop();
            
            gameState.lastAteFood++;
            
            if (gameState.lastAteFood > gameState.snake.length * 3 && gameState.autopilot) {
                gameState.safetyMode = true;
            } else if (gameState.lastAteFood <= gameState.snake.length) {
                gameState.safetyMode = false;
            }
        }
    };
    
    const gameOver = () => {
        gameState.gameOver = true;
        clearInterval(gameState.gameLoop);
        
        if (gameState.score > gameState.highScore) {
            gameState.highScore = gameState.score;
            localStorage.setItem('snakeHighScore', gameState.highScore);
            highScoreElement.textContent = gameState.highScore;
        }
        
        finalScoreElement.textContent = gameState.score;
        gameOverOverlay.classList.add('active');
    };
    
    const startGame = () => {
        if (gameState.gameStarted) return;
        
        gameState.gameStarted = true;
        gameOverOverlay.classList.remove('active');
        startButton.textContent = 'Пауза';
        
        gameState.gameLoop = setInterval(() => {
            if (gameState.autopilot) {
                autoPilotMove();
            }
            
            update();
            render();
        }, 1000 / gameState.speed);
    };
    
    const pauseGame = () => {
        if (!gameState.gameStarted) return;
        
        gameState.gameStarted = false;
        startButton.textContent = 'Продолжить';
        clearInterval(gameState.gameLoop);
    };
    
    const restartGame = () => {
        clearInterval(gameState.gameLoop);
        init();
        gameOverOverlay.classList.remove('active');
    };
    
    const toggleAutopilot = () => {
        gameState.autopilot = !gameState.autopilot;
        
        if (gameState.autopilot) {
            autopilotButton.textContent = 'Выключить автопилот';
            findPathToFood();
        } else {
            autopilotButton.textContent = 'Включить автопилот';
            gameState.pathToFood = [];
            gameState.pathToTail = [];
            gameState.pathfindingMode = 'food';
            gameState.followingTail = false;
        }
    };
    
    const autoPilotMove = () => {
        if (gameState.pathfindingMode === 'food' && gameState.pathToFood.length === 0) {
            if (!findPathToFood()) {
                gameState.pathfindingMode = 'tail';
                findPathToTail();
            }
        } else if (gameState.pathfindingMode === 'tail' && gameState.pathToTail.length === 0) {
            if (findPathToFood()) {
                gameState.pathfindingMode = 'food';
            } else {
                gameState.pathfindingMode = 'wander';
            }
        }
        
        if (gameState.pathfindingMode === 'food' && gameState.pathToFood.length > 0) {
            followPath(gameState.pathToFood);
        } else if (gameState.pathfindingMode === 'tail' && gameState.pathToTail.length > 0) {
            followPath(gameState.pathToTail);
        } else {
            avoidObstacles();
        }
    };
    
    const followPath = (path) => {
        if (path.length === 0) return;
        
        const nextStep = path[0];
        const head = gameState.snake[0];
        
        if (nextStep.x < head.x) {
            gameState.nextDirection = 'left';
        } else if (nextStep.x > head.x) {
            gameState.nextDirection = 'right';
        } else if (nextStep.y < head.y) {
            gameState.nextDirection = 'up';
        } else if (nextStep.y > head.y) {
            gameState.nextDirection = 'down';
        }
        
        path.shift();
    };
    
    const findPathToFood = () => {
        if (gameState.isPathfinding) return false;
        gameState.isPathfinding = true;
        
        const head = gameState.snake[0];
        const target = gameState.food;
        
        const grid = createGrid();
        
        const path = aStar(grid, head, target);
        
        gameState.pathToFood = path;
        gameState.isPathfinding = false;
        
        return path.length > 0;
    };
    
    const findPathToTail = () => {
        if (gameState.isPathfinding) return false;
        gameState.isPathfinding = true;
        
        const head = gameState.snake[0];
        const tail = gameState.snake[gameState.snake.length - 1];
        
        const grid = createGrid();
        
        const tailY = tail.y;
        const tailX = tail.x;
        if (tailY >= 0 && tailY < grid.length && tailX >= 0 && tailX < grid[0].length) {
            grid[tailY][tailX] = 0;
        }
        
        const path = aStar(grid, head, tail);
        
        gameState.pathToTail = path;
        gameState.isPathfinding = false;
        
        return path.length > 0;
    };
    
    const createGrid = () => {
        const grid = Array(gridHeight).fill().map(() => Array(gridWidth).fill(0));
        
        for (let i = 1; i < gameState.snake.length; i++) {
            const segment = gameState.snake[i];
            if (segment.y >= 0 && segment.y < gridHeight && segment.x >= 0 && segment.x < gridWidth) {
                grid[segment.y][segment.x] = 1;
            }
        }
        
        return grid;
    };
    
    const aStar = (grid, start, end) => {
        const openSet = [start];
        const closedSet = [];
        const cameFrom = {};
        
        const gScore = {};
        const fScore = {};
        
        gScore[`${start.x},${start.y}`] = 0;
        fScore[`${start.x},${start.y}`] = heuristic(start, end);
        
        function heuristic(a, b) {
            return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
        }
        
        function getNeighbors(node) {
            const neighbors = [];
            const dirs = [
                { x: 0, y: -1 },
                { x: 1, y: 0 },
                { x: 0, y: 1 },
                { x: -1, y: 0 }
            ];
            
            for (const dir of dirs) {
                const newX = node.x + dir.x;
                const newY = node.y + dir.y;
                
                if (newX < 0 || newX >= gridWidth || newY < 0 || newY >= gridHeight) {
                    continue;
                }
                
                if (grid[newY][newX] === 1) {
                    continue;
                }
                
                neighbors.push({ x: newX, y: newY });
            }
            
            return neighbors;
        }
        
        while (openSet.length > 0) {
            let current = openSet[0];
            let lowestFScore = fScore[`${current.x},${current.y}`];
            let currentIndex = 0;
            
            for (let i = 1; i < openSet.length; i++) {
                const node = openSet[i];
                const nodeKey = `${node.x},${node.y}`;
                
                if (fScore[nodeKey] < lowestFScore) {
                    lowestFScore = fScore[nodeKey];
                    current = node;
                    currentIndex = i;
                }
            }
            
            if (current.x === end.x && current.y === end.y) {
                const path = [];
                let temp = current;
                
                while (cameFrom[`${temp.x},${temp.y}`]) {
                    path.unshift(temp);
                    temp = cameFrom[`${temp.x},${temp.y}`];
                }
                
                return path;
            }
            
            openSet.splice(currentIndex, 1);
            closedSet.push(current);
            
            const neighbors = getNeighbors(current);
            
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.x},${neighbor.y}`;
                
                if (closedSet.some(node => node.x === neighbor.x && node.y === neighbor.y)) {
                    continue;
                }
                
                const tentativeGScore = gScore[`${current.x},${current.y}`] + 1;
                
                const inOpenSet = openSet.some(node => node.x === neighbor.x && node.y === neighbor.y);
                
                if (!inOpenSet || tentativeGScore < (gScore[neighborKey] || Infinity)) {
                    cameFrom[neighborKey] = current;
                    gScore[neighborKey] = tentativeGScore;
                    fScore[neighborKey] = gScore[neighborKey] + heuristic(neighbor, end);
                    
                    if (!inOpenSet) {
                        openSet.push(neighbor);
                    }
                }
            }
        }
        
        return [];
    };
    
    const avoidObstacles = () => {
        const head = gameState.snake[0];
        const possibleDirections = [];
        
        const directions = ['up', 'right', 'down', 'left'];
        
        const directionScores = directions.map(dir => {
            let newX = head.x;
            let newY = head.y;
            
            switch (dir) {
                case 'up':
                    newY--;
                    break;
                case 'right':
                    newX++;
                    break;
                case 'down':
                    newY++;
                    break;
                case 'left':
                    newX--;
                    break;
            }
            
            if (newX < 0 || newX >= gridWidth || newY < 0 || newY >= gridHeight) {
                return { direction: dir, score: -1000 };
            }
            
            if (gameState.snake.some(segment => segment.x === newX && segment.y === newY)) {
                return { direction: dir, score: -1000 };
            }
            
            let score = 0;
            
            if (!gameState.safetyMode) {
                score += (gridWidth - Math.abs(newX - gameState.food.x)) * 2;
                score += (gridHeight - Math.abs(newY - gameState.food.y)) * 2;
            }
            
            score += Math.min(newX, gridWidth - 1 - newX);
            score += Math.min(newY, gridHeight - 1 - newY);
            
            if ((dir === 'up' && gameState.direction === 'up') ||
                (dir === 'right' && gameState.direction === 'right') ||
                (dir === 'down' && gameState.direction === 'down') ||
                (dir === 'left' && gameState.direction === 'left')) {
                score += 5;
            }
            
            if (gameState.safetyMode) {
                const tail = gameState.snake[gameState.snake.length - 1];
                score += (gridWidth - Math.abs(newX - tail.x)) * 3;
                score += (gridHeight - Math.abs(newY - tail.y)) * 3;
            }
            
            return { direction: dir, score };
        });
        
        const validDirections = directionScores
            .filter(item => item.score > -1000)
            .sort((a, b) => b.score - a.score);
        
        if (validDirections.length > 0) {
            gameState.nextDirection = validDirections[0].direction;
            
            if (gameState.safetyMode && Math.random() < 0.1) {
                gameState.pathfindingMode = 'food';
                gameState.pathToFood = [];
                gameState.pathToTail = [];
            }
        }
    };
    
    const handleKeydown = (e) => {
        if (gameState.autopilot) return;
        
        switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                if (gameState.direction !== 'down') {
                    gameState.nextDirection = 'up';
                }
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                if (gameState.direction !== 'left') {
                    gameState.nextDirection = 'right';
                }
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                if (gameState.direction !== 'up') {
                    gameState.nextDirection = 'down';
                }
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                if (gameState.direction !== 'right') {
                    gameState.nextDirection = 'left';
                }
                break;
            case ' ':
                gameState.gameStarted ? pauseGame() : startGame();
                break;
        }
    };
    
    const handleSpeedChange = () => {
        const newSpeed = parseInt(speedSlider.value);
        gameState.speed = newSpeed;
        speedValue.textContent = newSpeed;
        
        if (gameState.gameStarted) {
            clearInterval(gameState.gameLoop);
            gameState.gameLoop = setInterval(() => {
                if (gameState.autopilot) {
                    autoPilotMove();
                }
                
                update();
                render();
            }, 1000 / gameState.speed);
        }
    };
    
    const setupEventListeners = () => {
        document.addEventListener('keydown', handleKeydown);
        
        startButton.addEventListener('click', () => {
            gameState.gameStarted ? pauseGame() : startGame();
        });
        
        restartButton.addEventListener('click', restartGame);
        
        autopilotButton.addEventListener('click', toggleAutopilot);
        
        speedSlider.addEventListener('input', handleSpeedChange);
        
        setupTouchControls();
    };
    
    const setupTouchControls = () => {
        let touchStartX = 0;
        let touchStartY = 0;
        
        canvas.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
            e.preventDefault();
        }, { passive: false });
        
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
        
        canvas.addEventListener('touchend', (e) => {
            if (gameState.autopilot) return;
            
            const touchEndX = e.changedTouches[0].screenX;
            const touchEndY = e.changedTouches[0].screenY;
            
            const diffX = touchEndX - touchStartX;
            const diffY = touchEndY - touchStartY;
            
            if (Math.abs(diffX) > Math.abs(diffY)) {
                if (diffX > 0 && gameState.direction !== 'left') {
                    gameState.nextDirection = 'right';
                } else if (diffX < 0 && gameState.direction !== 'right') {
                    gameState.nextDirection = 'left';
                }
            } else {
                if (diffY > 0 && gameState.direction !== 'up') {
                    gameState.nextDirection = 'down';
                } else if (diffY < 0 && gameState.direction !== 'down') {
                    gameState.nextDirection = 'up';
                }
            }
            
            e.preventDefault();
        }, { passive: false });
    };
    
    return {
        init: () => {
            init();
            setupEventListeners();
        }
    };
})();

document.addEventListener('DOMContentLoaded', SnakeGame.init);