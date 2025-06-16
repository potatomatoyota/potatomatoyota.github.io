document.addEventListener('DOMContentLoaded', () => {
            // API 和 DOM 元素
            const API_URL_BASE = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=";
            let API_KEY = '';

            const screens = {
                setup: document.getElementById('setup-screen'),
                game: document.getElementById('game-screen'),
                over: document.getElementById('game-over-screen')
            };

            const apiKeyInput = document.getElementById('api-key');
            const startGameBtn = document.getElementById('start-game-btn');
            const difficultyBtns = document.querySelectorAll('.difficulty-btn');

            const scoreDisplay = document.getElementById('score');
            const timerDisplay = document.getElementById('timer');
            const timerText = document.getElementById('timer-text');
            const puzzleWordDisplay = document.getElementById('puzzle-word');
            const answerInput = document.getElementById('answer-input');
            const feedbackDisplay = document.getElementById('feedback');

            const finalScoreDisplay = document.getElementById('final-score');
            const restartBtn = document.getElementById('restart-btn');

            // 遊戲狀態變數
            let score = 0;
            let timer = 30;
            let timerInterval;
            let currentWord = '';
            let currentPuzzle = '';
            let currentDifficulty = 'medium';
            let isGameActive = false;
            let isSubmitting = false;
            let usedWords = [];

            // 載入儲存的 API 金鑰
            const savedKey = localStorage.getItem('geminiApiKey');
            if (savedKey) {
                apiKeyInput.value = savedKey;
            }
            
            // 畫面切換函式
            function switchScreen(toScreen) {
                Object.values(screens).forEach(screen => {
                    screen.classList.remove('active');
                });
                screens[toScreen].classList.add('active');
            }

            // 事件監聽器
            difficultyBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    difficultyBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    currentDifficulty = btn.dataset.difficulty;
                });
            });

            startGameBtn.addEventListener('click', startGame);
            restartBtn.addEventListener('click', () => switchScreen('setup'));
            answerInput.addEventListener('keyup', (event) => {
                if (event.key === 'Enter' && !isSubmitting) {
                    handleSubmit();
                }
            });

            // 遊戲流程函式
            function startGame() {
                API_KEY = apiKeyInput.value.trim();
                if (!API_KEY) {
                    alert('請先輸入您的 Gemini API 金鑰！');
                    return;
                }
                localStorage.setItem('geminiApiKey', API_KEY);

                score = 0;
                isGameActive = true;
                usedWords = [];
                
                updateScoreDisplay();
                switchScreen('game');
                nextRound();
            }

            function nextRound() {
                resetRound();
                fetchPuzzleFromGemini();
            }

            function resetRound() {
                clearInterval(timerInterval);
                timer = 30;
                timerText.textContent = timer;
                timerDisplay.classList.remove('warning');
                answerInput.value = '';
                answerInput.disabled = true;
                isSubmitting = false;
                feedbackDisplay.textContent = '';
                feedbackDisplay.className = 'feedback';
                puzzleWordDisplay.innerHTML = 'loading';
            }

            async function fetchPuzzleFromGemini() {
                const prompt = generatePrompt(currentDifficulty, usedWords); 
                try {
                    const response = await fetch(`${API_URL_BASE}${API_KEY}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ "contents": [{ "parts": [{ "text": prompt }] }] })
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error.message || `API 請求失敗`);
                    }
                    
                    const data = await response.json();
                    const textResponse = data.candidates[0].content.parts[0].text;
                    const jsonMatch = textResponse.match(/```json\n([\s\S]*?)\n```/);
                    
                    if (!jsonMatch) {
                        throw new Error('API 回應格式錯誤');
                    }
                    
                    const puzzleData = JSON.parse(jsonMatch[1]);
                    currentWord = puzzleData.word.toLowerCase();
                    currentPuzzle = puzzleData.puzzle;
                    usedWords.push(currentWord);
                    puzzleWordDisplay.textContent = currentPuzzle;
                    startRound();
                } catch (error) {
                    console.error("Gemini API 錯誤:", error);
                    puzzleWordDisplay.textContent = " 載入失敗";
                    feedbackDisplay.textContent = `錯誤: ${error.message}`;
                    feedbackDisplay.className = 'feedback wrong';
                    isGameActive = false;
                }
            }
            
            function startRound() {
                answerInput.disabled = false;
                answerInput.focus();
                
                timerInterval = setInterval(() => {
                    timer--;
                    timerText.textContent = timer;
                    if (timer <= 10) {
                        timerDisplay.classList.add('warning');
                    }
                    if (timer <= 0) {
                        clearInterval(timerInterval);
                        handleTimeout();
                    }
                }, 1000);
            }
            
            function generatePrompt(difficulty, exclusionList = []) {
                let lengthRange, missingLetters;
                switch(difficulty) {
                    case 'hard': lengthRange = "9到12個字母"; missingLetters = "3到5個"; break;
                    case 'easy': lengthRange = "4到6個字母"; missingLetters = "1到2個"; break;
                    default: lengthRange = "6到9個字母"; missingLetters = "2到3個"; break;
                }
                
                let exclusionClause = '';
                if (exclusionList.length > 0) {
                    exclusionClause = `\nIMPORTANT: Avoid using any of these words: ${exclusionList.join(', ')}.`;
                }
                
                return `You are a puzzle generator for an English spelling game. Your task is to provide a single common English word and a puzzle version of it.
                        Rules:
                        1. The word's length must be between ${lengthRange}.
                        2. Randomly replace ${missingLetters} letters in the word with an underscore '_'.
                        3. Ensure that if a letter appears multiple times, only one instance is replaced.
                        ${exclusionClause}
                        Return the result strictly in JSON format within a code block.
                        Example format:
                        \`\`\`json
                        { "word": "example", "puzzle": "ex__ple" }
                        \`\`\`
                    `;
            }

            function checkAnswerFormat(userAnswer, puzzle) {
                if (userAnswer.length !== puzzle.length) return false;
                const pattern = puzzle.replace(/_/g, '.');
                const regex = new RegExp(`^${pattern}$`);
                return regex.test(userAnswer);
            }

            async function isRealWord(word) {
                const prompt = `Is the string "${word}" a common, valid English word? Please answer with only "yes" or "no".`;
                try {
                    const response = await fetch(`${API_URL_BASE}${API_KEY}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            "contents": [{ "parts": [{ "text": prompt }] }],
                            "generationConfig": { "maxOutputTokens": 10 }
                        })
                    });
                    
                    if (!response.ok) return false;
                    
                    const data = await response.json();
                    if (!data.candidates || data.candidates.length === 0) return false;
                    
                    const textResponse = data.candidates[0].content.parts[0].text.trim().toLowerCase();
                    return textResponse.includes('yes');
                } catch (error) {
                    console.error("驗證單字時出錯:", error);
                    return false;
                }
            }

            async function handleSubmit() {
                if (!isGameActive || isSubmitting) return;
                
                isSubmitting = true;
                clearInterval(timerInterval);
                const userAnswer = answerInput.value.trim().toLowerCase();
                
                if (userAnswer === currentWord) {
                    handleCorrectAnswer();
                    return;
                }
                
                if (!checkAnswerFormat(userAnswer, currentPuzzle)) {
                    handleWrongAnswer();
                    return;
                }
                
                feedbackDisplay.textContent = '正在驗證答案...';
                feedbackDisplay.className = 'feedback info';
                
                const isValidWord = await isRealWord(userAnswer);
                if (isValidWord) {
                    handleCorrectAnswer(true);
                } else {
                    handleWrongAnswer();
                }
            }

            function handleCorrectAnswer(isAlternative = false) {
                score++;
                updateScoreDisplay();
                feedbackDisplay.textContent = isAlternative 
                    ? `"${answerInput.value.trim()}" 也對`
                    : '正確！準備下一題...';
                feedbackDisplay.className = 'feedback correct';
                answerInput.disabled = true;
                
                setTimeout(() => {
                    if(isGameActive) nextRound();
                }, 2000);
            }

            function handleWrongAnswer() {
                isGameActive = false;
                feedbackDisplay.textContent = `答錯了！正確答案是: ${currentWord}`;
                feedbackDisplay.className = 'feedback wrong';
                answerInput.disabled = true;
                setTimeout(gameOver, 2500);
            }

            function handleTimeout() {
                isGameActive = false;
                answerInput.disabled = true;
                feedbackDisplay.textContent = `時間到！正確答案是: ${currentWord}`;
                feedbackDisplay.className = 'feedback wrong';
                setTimeout(gameOver, 2500);
            }
            
            function gameOver() {
                finalScoreDisplay.textContent = score;
                switchScreen('over');
            }

            function updateScoreDisplay() {
                scoreDisplay.textContent = `分數: ${score}`;
            }
        });