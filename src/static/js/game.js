import { addNotification } from "./notification.js"

// Game JavaScript
document.addEventListener("DOMContentLoaded", () => {
    const socket = io("/game")
    const visitorsElement = document.getElementById("visitors")
    const surrendedElement = document.getElementById("surrended")
    const currentPlayerElement = document.getElementById("current-player")
    const timerElement = document.getElementById("timer")
    const mobileTimerElement = document.getElementById("mobile-timer")
    const timerProgressCircle = document.getElementById("timer-progress-circle")
    const mobileTimerProgress = document.getElementById("mobile-timer-progress")
    const selectedCharElement = document.getElementById("selected-char")
    const surrenderBtn = document.getElementById("btn-surrend")
    const playersContainer = document.getElementById("players")
    const playModeSwitch = document.getElementById("play-mode-switch")
    const playModeLabel = document.getElementById("play-mode-label")

    // Zoom and Pan elements
    const boardContainer = document.getElementById("board-container")
    const boardViewport = document.getElementById("board-viewport")
    const boardWrapper = document.getElementById("board-wrapper")
    const gameBoard = document.getElementById("game-board")
    const zoomSlider = document.getElementById("zoom-slider")
    const zoomPercentage = document.getElementById("zoom-percentage")
    const zoomInBtn = document.getElementById("zoom-in")
    const zoomOutBtn = document.getElementById("zoom-out")
    const resetZoomBtn = document.getElementById("reset-zoom")
    const panIndicator = document.getElementById("pan-indicator")

    let timerTask = null
    let maxTimestampMs = 0
    let initialTimerDuration = 0
    let isPlayModeSwitchAvailable = true

    // Zoom and Pan variables
    let currentZoom = 100
    let isPanning = false
    let startX = 0
    let startY = 0
    let scrollLeft = 0
    let scrollTop = 0

    // Initialize zoom and pan functionality
    initializeZoomAndPan()

    // Socket event handlers
    socket.on("connect", () => {
        console.log("Connected to game")
        addNotification("Connected to game", "success")
    })

    socket.on("disconnect", () => {
        console.log("Disconnected from game")
        addNotification("Disconnected from game", "danger")
    })

    socket.on("self_init", (data) => {
        // Initialize game's board
        for (const i in data.cells) {
            const cell = data.cells[i]
            const btnElement = document.getElementById(`btn-${i}`)

            if (!["1", "2", "3", "4"].includes(cell)) continue
            btnElement.classList.add("played")

            if (cell == "1") {
                btnElement.textContent = "S"
                continue
            } else if (cell == "2") {
                btnElement.textContent = "O"
                continue
            }

            btnElement.classList.remove("played")
            btnElement.classList.add("cell-scored")
            if (cell == "3") {
                btnElement.textContent = "S"
            } else if (cell == "4") {
                btnElement.textContent = "O"
            }
        }

        // Initialize players list
        if (data.players && data.scores && data.players_statuses) {
            const scores = data.scores.split(" ")
            playersContainer.innerHTML = ""

            data.players.forEach((username, i) => {
                let isStatusOnline = false
                let isStatusPlaying = false
                const playerCard = document.createElement("div")
                playerCard.className = "player-score-card"
                playerCard.id = `item-${username}`

                let badges = ""
                if (username === playersContainer.getAttribute("data-current-user")) {
                    badges += ' <span class="badge bg-primary ms-2">You</span>'
                }
                if (username === playersContainer.getAttribute("data-host")) {
                    badges += ' <span class="badge bg-success ms-2">Host</span>'
                }

                if (data.players_statuses[i] == "3") {
                    isStatusOnline = true
                    isStatusPlaying = true
                } else if (data.players_statuses[i] == "2") {
                    isStatusOnline = true
                    isStatusPlaying = false
                } else if (data.players_statuses[i] == "1") {
                    isStatusOnline = false
                    isStatusPlaying = true
                } else if (data.players_statuses[i] == "0") {
                    isStatusOnline = false
                    isStatusPlaying = false
                }

                if (!isStatusOnline) {
                    playerCard.classList.add("text-danger")
                }

                playerCard.innerHTML = `
                <div class="player-info">
                    <span id="status-${username}" class="player-status ${isStatusPlaying ? "text-success" : "text-danger"} fas fa-circle me-2" data-bs-toggle="tooltip" data-bs-title="Status: ${isStatusPlaying ? "Playing" : "Spectating"}"></span>
                    <span class="player-name">${username}</span>
                    ${badges}
                </div>
                <div class="player-score">
                    <span id="${username}" class="score-number">${scores[i] || 0}</span>
                    <small class="text-muted">points</small>
                </div>
                `

                playersContainer.appendChild(playerCard)
            })
        }

        // Set surrenders information
        if (data.surrenders !== undefined) {
            const [current, max] = data.surrenders.split("/")
            surrendedElement.innerText = `${current} / ${max}`
        }

        // Set current player
        setCurrentPlayer(data.current_player)

        // Update play mode switch
        updatePlayModeSwitch(data.playing_status, data.surrended_status)

        // Initialize tooltips
        initBootstrapTooltips()

        console.log("Game initialized with players:", data.players)
    })

    socket.on("self_init_timer", (data) => {
        initTimer(data)
    })

    socket.on("self_surrend", (data) => {
        playModeSwitch.disabled = false
    })

    socket.on("self_turn_playing_status", (data) => {
        if (!data.success || data.status === undefined) {
            return
        }
        updatePlayModeSwitch(data.status, true)
    })

    socket.on("self_refresh_timer", (data) => {
        const [timestamp, currentPlayer] = data.split(" ")
        initTimer(Number.parseInt(timestamp))
        setCurrentPlayer(currentPlayer)
    })

    socket.on("user_join", (data) => {
        const playerItem = document.getElementById(`item-${data.username}`)
        if (playerItem) {
            playerItem.classList.remove("text-danger")
            addNotification(`${data.username} rejoined the game`, "success")
        }

        if (data.surrenders !== undefined) {
            const [current, max] = data.surrenders.split("/")
            surrendedElement.innerText = `${current} / ${max}`
        }

        updatePlayerModeStatus(data.username, data.playing_status)
    })

    socket.on("user_leave", (data) => {
        setCurrentPlayer(data.current_player)

        const playerItem = document.getElementById(`item-${data.username}`)
        if (playerItem) {
            playerItem.classList.add("text-danger")
            addNotification(`${data.username} left the game`, "warning")
        }

        if (data.surrenders !== undefined) {
            const [current, max] = data.surrenders.split("/")
            surrendedElement.innerText = `${current} / ${max}`
        }
    })

    socket.on("user_play", (data) => {
        // Update the board cell
        const cellButton = document.getElementById(`btn-${data.char_index}`)
        if (cellButton) {
            cellButton.innerText = data.char
            cellButton.disabled = true
            cellButton.classList.add("played")

            // Enhanced click animation
            cellButton.style.animation = "cellClick 0.4s ease"
            setTimeout(() => {
                cellButton.style.animation = ""
            }, 400)
        }

        // Highlight scored cells with staggered animation
        if (data.changed_states && data.changed_states.length > 0) {
            data.changed_states.forEach((index, i) => {
                setTimeout(() => {
                    const cell = document.getElementById(`btn-${index}`)
                    if (cell) {
                        cell.classList.remove("played")
                        cell.classList.add("cell-scored")
                        cell.style.animation = "scoreAnimation 0.6s ease"
                        setTimeout(() => {
                            cell.style.animation = ""
                        }, 600)
                    }
                }, i * 150) // Increased stagger time
            })
        }

        // Update player score with animation
        const scoreElement = document.getElementById(data.username)
        if (scoreElement) {
            const currentScore = Number.parseInt(scoreElement.innerText) || 0
            const newScore = currentScore + (data.added_score || 0)

            animateScoreChange(scoreElement, currentScore, newScore)

            if (data.added_score && data.added_score > 0) {
                addNotification(`${data.username} scored ${data.added_score} points!`, "success")
                createFloatingPoints(scoreElement, data.added_score)
            }
        }

        if (data.current_player) {
            setCurrentPlayer(data.current_player)
        }
    })

    socket.on("user_turn_playing_status", (data) => {
        if (data.username === undefined || data.status === undefined || data.current_player === undefined) {
            return
        }

        updatePlayerModeStatus(data.username, data.status)
        setCurrentPlayer(data.current_player)
    })

    socket.on("user_surrend", (data) => {
        if (data.surrenders !== undefined) {
            const [current, max] = data.surrenders.split("/")
            surrendedElement.innerText = `${current} / ${max}`
            addNotification("A player has surrendered", "warning")
        }
    })

    socket.on("user_reset_timer", (data) => {
        initTimer(data)
    })

    socket.on("visitor_join", (data) => {
        if (data.visitors == undefined) return
        visitorsElement.innerText = data.visitors
    })

    socket.on("visitor_leave", (data) => {
        if (data.visitors == undefined) return
        visitorsElement.innerText = data.visitors
    })

    socket.on("game_not_found", (data) => {
        addNotification("Game not found! Redirecting...", "danger")

        setTimeout(() => {
            const gameSection = document.getElementsByClassName("game-section")
            if (gameSection.length < 1) return
            window.location.href = gameSection[0].getAttribute("data-join-room-url")
        }, 2000)
    })

    socket.on("game_require_2_players", (data) => {
        addNotification("To play, there must be at least 2 players online and active", "danger")
    })

    socket.on("game_end", (data) => {
        addNotification("Game ended! Redirecting...", "info")
        stopTimer()
        createCelebrationEffect()

        setTimeout(() => {
            const gameSection = document.getElementsByClassName("game-section")
            if (gameSection.length < 1) return
            window.location.href = gameSection[0].getAttribute("data-thank-you-url")
        }, 5000)
    })

    // Game functions
    window.btnPlayClicked = (cellId) => {
        if (!checkAvailableActivePlayers()) {
            addNotification("To play, there must be at least 2 players online and active", "danger")
            return
        }

        const cellButton = document.getElementById(`btn-${cellId}`)

        if (playersContainer.getAttribute("data-current-user") != currentPlayerElement.textContent) {
            addNotification("You aren't the current player", "danger")
            return
        }

        if (!cellButton || cellButton.innerText.trim() !== "" || cellButton.disabled) {
            addNotification("This cell is already taken!", "warning")
            return
        }

        const selectedChar = selectedCharElement.value

        // Enhanced visual feedback
        cellButton.classList.add("playing")
        cellButton.style.transform = "scale(0.9)"
        addNotification("Please wait....", "primary")

        socket.emit("play", {
            char_index: cellId,
            char: selectedChar,
        })

        setTimeout(() => {
            cellButton.classList.remove("playing")
            cellButton.style.transform = ""
        }, 300)
    }

    playModeSwitch.addEventListener("input", (event) => {
        if (!isPlayModeSwitchAvailable) {
            playModeSwitch.disabled = true
            addNotification("Please wait around 10 seconds to switch the play mode", "warning")
            return
        }

        socket.emit("turn_playing_status")

        setTimeout(() => {
            isPlayModeSwitchAvailable = false
            playModeSwitch.disabled = true
        }, 1)
        setTimeout(() => {
            isPlayModeSwitchAvailable = true
            playModeSwitch.disabled = false
            addNotification("Now you can switch it back", "info")
        }, 10_000)
    })

    if (surrenderBtn) {
        surrenderBtn.addEventListener("click", function () {
            if (confirm("Are you sure you want to surrender? This action cannot be undone.")) {
                socket.emit("surrend")
                this.disabled = true
                this.innerHTML = '<i class="fas fa-flag me-2"></i>Surrendered'
                this.classList.remove("btn-outline-danger")
                this.classList.add("btn-danger")
                addNotification("You have surrendered", "info")
            }
        })
    }

    // Zoom and Pan Functions
    function initializeZoomAndPan() {
        // Zoom slider event
        zoomSlider.addEventListener("input", (e) => {
            currentZoom = Number.parseInt(e.target.value)
            applyZoom()
        })

        // Zoom buttons
        zoomInBtn.addEventListener("click", () => {
            currentZoom = Math.min(200, currentZoom + 10)
            zoomSlider.value = currentZoom
            applyZoom()
        })

        zoomOutBtn.addEventListener("click", () => {
            currentZoom = Math.max(50, currentZoom - 10)
            zoomSlider.value = currentZoom
            applyZoom()
        })

        resetZoomBtn.addEventListener("click", () => {
            currentZoom = 100
            zoomSlider.value = currentZoom
            applyZoom()
            // Reset scroll position
            boardViewport.scrollLeft = 0
            boardViewport.scrollTop = 0
        })

        // Mouse wheel zoom
        boardViewport.addEventListener("wheel", (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault()
                const delta = e.deltaY > 0 ? -10 : 10
                currentZoom = Math.max(50, Math.min(200, currentZoom + delta))
                zoomSlider.value = currentZoom
                applyZoom()
            }
        })

        // Pan functionality
        boardViewport.addEventListener("mousedown", startPan)
        boardViewport.addEventListener("mousemove", doPan)
        boardViewport.addEventListener("mouseup", endPan)
        boardViewport.addEventListener("mouseleave", endPan)

        // Touch events for mobile
        boardViewport.addEventListener("touchstart", startPanTouch, { passive: false })
        boardViewport.addEventListener("touchmove", doPanTouch, { passive: false })
        boardViewport.addEventListener("touchend", endPan)

        // Show/hide pan indicator
        boardViewport.addEventListener("mouseenter", () => {
            if (currentZoom > 100) {
                panIndicator.style.opacity = "1"
            }
        })

        boardViewport.addEventListener("mouseleave", () => {
            panIndicator.style.opacity = "0"
        })
    }

    function applyZoom() {
        const scale = currentZoom / 100
        boardWrapper.style.transform = `scale(${scale})`
        zoomPercentage.textContent = `${currentZoom}%`

        // Show/hide pan indicator based on zoom
        if (currentZoom > 100) {
            panIndicator.style.display = "block"
        } else {
            panIndicator.style.display = "none"
        }

        // Update zoom button states
        zoomOutBtn.disabled = currentZoom <= 50
        zoomInBtn.disabled = currentZoom >= 200
    }

    function startPan(e) {
        if (currentZoom <= 100) return
        isPanning = true
        boardViewport.style.cursor = "grabbing"
        startX = e.pageX - boardViewport.offsetLeft
        startY = e.pageY - boardViewport.offsetTop
        scrollLeft = boardViewport.scrollLeft
        scrollTop = boardViewport.scrollTop
        e.preventDefault()
    }

    function startPanTouch(e) {
        if (currentZoom <= 100 || e.touches.length !== 1) return
        isPanning = true
        const touch = e.touches[0]
        startX = touch.pageX - boardViewport.offsetLeft
        startY = touch.pageY - boardViewport.offsetTop
        scrollLeft = boardViewport.scrollLeft
        scrollTop = boardViewport.scrollTop
        e.preventDefault()
    }

    function doPan(e) {
        if (!isPanning || currentZoom <= 100) return
        e.preventDefault()
        const x = e.pageX - boardViewport.offsetLeft
        const y = e.pageY - boardViewport.offsetTop
        const walkX = (x - startX) * 2
        const walkY = (y - startY) * 2
        boardViewport.scrollLeft = scrollLeft - walkX
        boardViewport.scrollTop = scrollTop - walkY
    }

    function doPanTouch(e) {
        if (!isPanning || currentZoom <= 100 || e.touches.length !== 1) return
        e.preventDefault()
        const touch = e.touches[0]
        const x = touch.pageX - boardViewport.offsetLeft
        const y = touch.pageY - boardViewport.offsetTop
        const walkX = (x - startX) * 2
        const walkY = (y - startY) * 2
        boardViewport.scrollLeft = scrollLeft - walkX
        boardViewport.scrollTop = scrollTop - walkY
    }

    function endPan() {
        isPanning = false
        boardViewport.style.cursor = currentZoom > 100 ? "grab" : "default"
    }

    // Helper functions
    function initBootstrapTooltips() {
        const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
        const tooltipList = [...tooltipTriggerList].map((tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl))
    }

    function initTimer(timestamp_in_sec) {
        stopTimer()

        maxTimestampMs = timestamp_in_sec * 1000
        initialTimerDuration = (maxTimestampMs - Date.now()) / 1000

        timerTask = setInterval(() => {
            const newTime = maxTimestampMs - Date.now()
            const remainingSeconds = Math.max(0, newTime / 1000)

            updateTimerDisplay(remainingSeconds)

            if (newTime <= 0) {
                clearInterval(timerTask)
                socket.emit("timeout")
            }
        }, 100)
    }

    function updateTimerDisplay(remainingSeconds) {
        const displayTime = remainingSeconds.toFixed(1)

        // Update both timer displays
        if (timerElement) {
            timerElement.innerText = displayTime
        }
        if (mobileTimerElement) {
            mobileTimerElement.innerText = displayTime
        }



        // Update circular progress
        if (timerProgressCircle && initialTimerDuration > 0) {
            const progress = remainingSeconds / initialTimerDuration
            timerProgressCircle.style.strokeDashoffset = progress

            // Change color based on remaining time
            if (progress > 0.5) {
                timerProgressCircle.style.stroke = "#28a745" // Green
            } else if (progress > 0.25) {
                timerProgressCircle.style.stroke = "#ffc107" // Yellow
            } else {
                timerProgressCircle.style.stroke = "#dc3545" // Red
            }
        }

        // Update mobile progress bar
        if (mobileTimerProgress && initialTimerDuration > 0) {
            const progress = (remainingSeconds / initialTimerDuration) * 100
            mobileTimerProgress.style.width = `${progress}%`

            // Change color based on remaining time
            if (progress > 50) {
                mobileTimerProgress.style.backgroundColor = "#28a745"
            } else if (progress > 25) {
                mobileTimerProgress.style.backgroundColor = "#ffc107"
            } else {
                mobileTimerProgress.style.backgroundColor = "#dc3545"
            }
        }
    }

    function stopTimer() {
        if (timerTask) {
            clearInterval(timerTask)
        }
    }

    function setCurrentPlayer(currentPlayer) {
        const currentUser = playersContainer.getAttribute("data-current-user")
        currentPlayerElement.innerText = currentPlayer

        if (currentPlayer == currentUser) {
            currentPlayerElement.classList.add("bg-success")
        } else {
            currentPlayerElement.classList.remove("bg-success")
        }

        updateCurrentPlayerHighlight(currentPlayer)
    }

    function updateCurrentPlayerHighlight(currentPlayer) {
        document.querySelectorAll(".player-score-card").forEach((card) => {
            card.classList.remove("current-player-highlight")
        })

        const currentPlayerCard = document.getElementById(`item-${currentPlayer}`)
        if (currentPlayerCard) {
            currentPlayerCard.classList.add("current-player-highlight")
        }
    }

    function updatePlayModeSwitch(status, enabled) {
        playModeSwitch.disabled = !enabled
        playModeSwitch.checked = status

        playModeLabel.innerHTML = status
            ? `
        <span class="badge bg-success">Playing</span>
        `
            : `
        <span class="badge bg-secondary">Spectating</span>
        `
    }

    function updatePlayerModeStatus(player, status) {
        const playerStatusElement = document.getElementById(`status-${player}`)

        if (status) {
            playerStatusElement.classList.add("text-success")
            playerStatusElement.classList.remove("text-danger")
            playerStatusElement.setAttribute("data-bs-title", "Status: Playing")
        } else {
            playerStatusElement.classList.add("text-danger")
            playerStatusElement.classList.remove("text-success")
            playerStatusElement.setAttribute("data-bs-title", "Status: Spectating")
        }

        initBootstrapTooltips()
    }

    function animateScoreChange(element, oldScore, newScore) {
        let currentScore = oldScore
        const increment = 1
        const duration = 500
        const steps = Math.abs(newScore - oldScore)
        const stepDuration = duration / Math.max(steps, 1)

        if (currentScore === newScore) return

        const timer = setInterval(() => {
            currentScore += increment
            element.innerText = currentScore

            if (currentScore == newScore) {
                clearInterval(timer)
            }
        }, stepDuration)
    }

    function checkAvailableActivePlayers() {
        let counter = 0
        let isAvailable = false
        for (const playerElement of playersContainer.children) {
            const [playerStatusElement] = playerElement.getElementsByClassName("player-status")
            if (playerElement.classList.contains("text-danger") || playerStatusElement.classList.contains("text-danger")) {
                continue
            }

            counter++
            if (counter >= 2) {
                isAvailable = true
                break
            }
        }

        return isAvailable
    }

    function createFloatingPoints(element, points) {
        const pointsIndicator = document.createElement("div")
        pointsIndicator.className = "floating-points"
        pointsIndicator.innerText = `+${points}`

        const rect = element.getBoundingClientRect()
        pointsIndicator.style.cssText = `
            position: fixed;
            left: ${rect.left}px;
            top: ${rect.top}px;
            color: #28a745;
            font-weight: bold;
            font-size: 1.5rem;
            pointer-events: none;
            z-index: 1000;
            animation: floatUp 2s ease-out forwards;
        `

        document.body.appendChild(pointsIndicator)

        setTimeout(() => {
            if (pointsIndicator.parentNode) {
                pointsIndicator.remove()
            }
        }, 2000)
    }

    function createCelebrationEffect() {
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                createParticle()
            }, i * 100)
        }
    }

    function createParticle() {
        const particle = document.createElement("div")
        particle.className = "celebration-particle"
        particle.style.cssText = `
            position: fixed;
            width: 10px;
            height: 10px;
            background: ${getRandomColor()};
            border-radius: 50%;
            left: ${Math.random() * window.innerWidth}px;
            top: ${window.innerHeight}px;
            pointer-events: none;
            z-index: 1000;
            animation: particleFloat 3s ease-out forwards;
        `

        document.body.appendChild(particle)

        setTimeout(() => {
            if (particle.parentNode) {
                particle.remove()
            }
        }, 3000)
    }

    function getRandomColor() {
        const colors = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#f1c40f"]
        return colors[Math.floor(Math.random() * colors.length)]
    }

    // Enhanced CSS styles
    const style = document.createElement("style")
    style.textContent = `
        /* Enhanced Game Header */
        .game-header {
            background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,249,250,0.95));
            border-radius: 15px;
            padding: 1.5rem;
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
        }

        .current-player-card, .char-selector, .play-mode-switch, .room-info, .timer-display-card {
            background: rgba(255,255,255,0.8);
            border-radius: 12px;
            padding: 1rem;
            text-align: center;
            transition: all 0.3s ease;
        }

        .current-player-card:hover, .char-selector:hover, .play-mode-switch:hover, .room-info:hover, .timer-display-card:hover {
            background: rgba(255,255,255,0.95);
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }

        /* Enhanced Timer Design */
        .timer-display-card {
            position: relative;
        }

        .timer-container {
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .timer-circle {
            position: relative;
            width: 80px;
            height: 80px;
        }

        .timer-svg {
            width: 100%;
            height: 100%;
            transform: rotate(-90deg);
        }

        .timer-track {
            fill: none;
            stroke: #e9ecef;
            stroke-width: 6;
        }

        .timer-progress {
            fill: none;
            stroke: #28a745;
            stroke-width: 6;
            stroke-linecap: round;
            stroke-dasharray: 1;
            stroke-dashoffset: 0;
            transition: stroke-dashoffset 0.1s ease, stroke 0.3s ease;
        }

        .timer-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
        }

        .timer-value {
            font-size: 1.2rem;
            font-weight: bold;
            color: #495057;
            display: block;
            line-height: 1;
        }

        .timer-unit {
            font-size: 0.7rem;
            color: #6c757d;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* Mobile Timer Bar */
        .mobile-timer-bar {
            background: rgba(255,255,255,0.95);
            border-radius: 12px;
            padding: 1rem;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            backdrop-filter: blur(10px);
        }

        .mobile-timer-container {
            position: relative;
            background: #e9ecef;
            border-radius: 20px;
            height: 40px;
            overflow: hidden;
        }

        .mobile-timer-progress {
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            background: #28a745;
            border-radius: 20px;
            transition: width 0.1s ease, background-color 0.3s ease;
        }

        .mobile-timer-content {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #495057;
            font-weight: bold;
            z-index: 2;
            text-shadow: 0 1px 2px rgba(255,255,255,0.8);
        }

        .mobile-timer-value {
            font-size: 1.1rem;
        }

        .mobile-timer-unit {
            font-size: 0.9rem;
            margin-left: 0.25rem;
        }

        /* Board Controls */
        .board-controls {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
            background: rgba(255,255,255,0.95);
            border-radius: 12px;
            padding: 1rem;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            backdrop-filter: blur(10px);
        }

        .zoom-controls {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .zoom-slider-container {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .zoom-slider {
            width: 150px;
            height: 6px;
            border-radius: 3px;
            background: #e9ecef;
            outline: none;
            -webkit-appearance: none;
        }

        .zoom-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #007bff;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(0,123,255,0.3);
            transition: all 0.2s ease;
        }

        .zoom-slider::-webkit-slider-thumb:hover {
            background: #0056b3;
            transform: scale(1.1);
        }

        .zoom-slider::-moz-range-thumb {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #007bff;
            cursor: pointer;
            border: none;
            box-shadow: 0 2px 6px rgba(0,123,255,0.3);
        }

        .zoom-percentage {
            font-weight: bold;
            color: #495057;
            min-width: 45px;
            text-align: center;
        }

        .board-instructions {
            text-align: center;
        }

        /* Enhanced Game Board with Zoom and Pan */
        .game-board-container {
            display: flex;
            justify-content: center;
            margin: 2rem 0;
            position: relative;
        }

        .game-board-viewport {
            width: 100%;
            max-width: 48rem;
            height: 100%;
            overflow: auto;
            border-radius: 20px;
            box-shadow: 0 12px 35px rgba(0,0,0,0.15);
            background: rgba(255,255,255,0.95);
            backdrop-filter: blur(10px);
            border: 2px solid rgba(255,255,255,0.3);
            cursor: default;
            position: relative;
        }

        .game-board-viewport::-webkit-scrollbar {
            width: 12px;
            height: 12px;
        }

        .game-board-viewport::-webkit-scrollbar-track {
            background: rgba(0,0,0,0.1);
            border-radius: 6px;
        }

        .game-board-viewport::-webkit-scrollbar-thumb {
            background: rgba(0,123,255,0.6);
            border-radius: 6px;
            transition: background 0.3s ease;
        }

        .game-board-viewport::-webkit-scrollbar-thumb:hover {
            background: rgba(0,123,255,0.8);
        }

        .game-board-wrapper {
            display: flex;
            align-items: center;
            min-height: 100%;
            padding: 2rem;
            transform-origin: 0% 0%;
            transition: transform 0.3s ease;
        }

        .game-board {
            display: inline-block;
            border-radius: 15px;
            box-shadow: inset 0 4px 8px rgba(0,0,0,0.1);
            background: #fff;
        }

        .board-row {
            display: flex;
        }

        /* Enhanced Board Cells */
        .board-cell {
            width: 45px;
            height: 45px;
            border: 2px solid #dee2e6;
            background: #fff;
            font-weight: bold;
            font-size: 16px;
            transition: all 0.2s ease;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            color: #495057;
        }

        .board-cell:hover:not(:disabled) {
            border-color: #007bff;
            transform: scale(1.05);
            z-index: 10;
            box-shadow: 0 4px 12px rgba(0,123,255,0.3);
        }

        .board-cell:active:not(:disabled) {
            transform: scale(0.95);
        }

        .board-cell.cell-scored {
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
            border-color: #28a745;
            font-weight: 900;
        }

        .board-cell.played {
            background: #e9ecef;
            color: #3F454BFF;
            cursor: not-allowed;
            opacity: 0.8;
        }

        .board-cell.playing {
            background: #e3f2fd;
            border-color: #2196f3;
            animation: pulse 0.3s ease;
        }

        /* Pan Indicator */
        .pan-indicator {
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-size: 0.8rem;
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
            z-index: 10;
            display: none;
        }

        .pan-indicator i {
            margin-right: 0.5rem;
        }

        /* Mobile Responsive Board */
        @media (max-width: 768px) {
            .game-board-wrapper {
                padding: 1rem;
            }

            .board-cell:hover:not(:disabled) {
                transform: scale(1.1);
            }

            .zoom-controls {
                flex-wrap: wrap;
                gap: 0.5rem;
            }

            .zoom-slider {
                width: 120px;
            }

            .board-controls {
                padding: 0.75rem;
            }
        }

        @media (max-width: 480px) {
            .zoom-slider {
                width: 100px;
            }
        }

        /* Enhanced Game Info Cards */
        .players-scores-card, .game-status-card {
            background: rgba(255,255,255,0.95);
            border-radius: 15px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
            border: none;
            backdrop-filter: blur(10px);
            overflow: hidden;
        }

        .players-scores-card .card-header, .game-status-card .card-header {
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            border-bottom: 2px solid #dee2e6;
            padding: 1.25rem 1.5rem;
        }

        .players-scores-card .card-body, .game-status-card .card-body {
            padding: 1.5rem;
        }

        .player-score-card {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(255,255,255,0.8);
            border-radius: 12px;
            padding: 1rem;
            margin-bottom: 0.75rem;
            border-left: 4px solid #007bff;
            transition: all 0.3s ease;
        }

        .player-score-card:hover {
            background: rgba(255,255,255,1);
            transform: translateX(5px);
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }

        .player-score-card.current-player-highlight {
            border-left-color: #ffc107;
            background: rgba(255,193,7,0.1);
            transform: scale(1.02);
        }

        .player-score-card.text-danger {
            opacity: 0.6;
            border-left-color: #dc3545;
        }

        .score-number {
            font-size: 1.5rem;
            font-weight: bold;
            color: #007bff;
        }

        .status-item {
            background: rgba(248,249,250,0.5);
            border-radius: 10px;
            padding: 0.75rem;
            transition: all 0.3s ease;
        }

        .status-item:hover {
            background: rgba(248,249,250,0.8);
        }

        .status-label {
            font-weight: 500;
            color: #495057;
        }

        /* Enhanced Animations */
        @keyframes cellClick {
            0% { transform: scale(1); }
            50% { transform: scale(0.9); box-shadow: 0 0 20px rgba(0,123,255,0.5); }
            100% { transform: scale(1); }
        }

        @keyframes scoreAnimation {
            0% { 
                transform: scale(1); 
                background: linear-gradient(135deg, #28a745, #20c997);
                box-shadow: 0 0 0 rgba(40,167,69,0.5);
            }
            50% { 
                transform: scale(1.15); 
                background: linear-gradient(135deg, #20c997, #17a2b8);
                box-shadow: 0 0 20px rgba(40,167,69,0.8);
            }
            100% { 
                transform: scale(1); 
                background: linear-gradient(135deg, #28a745, #20c997);
                box-shadow: 0 0 0 rgba(40,167,69,0.5);
            }
        }

        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(33,150,243,0.7); }
            70% { box-shadow: 0 0 0 10px rgba(33,150,243,0); }
            100% { box-shadow: 0 0 0 0 rgba(33,150,243,0); }
        }

        @keyframes floatUp {
            0% { 
                transform: translateY(0) scale(1); 
                opacity: 1; 
            }
            100% { 
                transform: translateY(-60px) scale(1.3); 
                opacity: 0; 
            }
        }

        @keyframes particleFloat {
            0% { 
                transform: translateY(0) rotate(0deg); 
                opacity: 1; 
            }
            100% { 
                transform: translateY(-100vh) rotate(360deg); 
                opacity: 0; 
            }
        }

        /* Responsive Design */
        @media (max-width: 992px) {
            .game-header {
                padding: 1rem;
            }

            .current-player-card, .char-selector, .play-mode-switch, .room-info, .timer-display-card {
                margin-bottom: 1rem;
                padding: 0.75rem;
            }

            .timer-circle {
                width: 60px;
                height: 60px;
            }

            .timer-value {
                font-size: 1rem;
            }
        }

        @media (max-width: 576px) {
            .game-header .row > div {
                margin-bottom: 0.75rem;
            }

            .players-scores-card .card-body, .game-status-card .card-body {
                padding: 1rem;
            }

            .player-score-card {
                padding: 0.75rem;
                flex-direction: column;
                text-align: center;
                gap: 0.5rem;
            }
        }
    `
    document.head.appendChild(style)

    // Initialize current player highlight
    const initialCurrentPlayer = currentPlayerElement.innerText
    if (initialCurrentPlayer) {
        updateCurrentPlayerHighlight(initialCurrentPlayer)
    }
})
