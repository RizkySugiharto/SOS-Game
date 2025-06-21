import { addNotification } from "./notification.js"

// Room JavaScript - Enhanced Version
document.addEventListener("DOMContentLoaded", () => {
    const inputPlayers = document.getElementById("input-players")
    const playersContainer = document.getElementById("players")
    const playerCountBadge = document.getElementById("player-count")
    const btnStart = document.getElementById("btn-start")
    const gameStatus = document.getElementById("gameStatus")
    const hostControls = document.getElementById("hostControls")
    const roomCodeElement = document.querySelector(".room-code-display>.badge")

    // Timer controls
    const enableTimerSwitch = document.getElementById("enableTimer")
    const timerDurationSlider = document.getElementById("timerDuration")
    const timerValue = document.getElementById("timerValue")
    const resetTimerOnScoreSwitch = document.getElementById("resetTimerOnScore")
    const timerDurationGroup = document.getElementById("timerDurationGroup")
    const resetTimerGroup = document.getElementById("resetTimerGroup")
    const timerPreview = document.getElementById("timerPreview")
    const previewTime = document.getElementById("previewTime")
    const resetInfo = document.getElementById("resetInfo")

    // Hidden form inputs
    const inputTimerEnabled = document.getElementById("input-timer-enabled")
    const inputTimerDuration = document.getElementById("input-timer-duration")
    const inputResetTimerOnScore = document.getElementById("input-reset-timer-on-score")

    // Host controls
    const disbandBtn = document.getElementById("disbandBtn")
    const roomSettingsBtn = document.getElementById("roomSettingsBtn")
    const copyRoomCodeBtn = document.getElementById("copyRoomCodeBtn")

    // Get user data from HTML attributes
    const currentUser = playersContainer.getAttribute("data-current-user")
    const host = playersContainer.getAttribute("data-host")

    let basePlayers = []
    const isHost = currentUser === host

    // Socket.IO connection
    const socket = io("/room")

    // Socket event handlers
    socket.on("connect", () => {
        console.log("Connected to room")
        showConnectionStatus("Connected", "success")
        addNotification("Connected to room", "success")
    })

    socket.on("disconnect", () => {
        console.log("Disconnected from room")
        showConnectionStatus("Disconnected", "danger")
        addNotification("Connection lost", "danger")
    })

    socket.on("self_init", (data) => {
        playersContainer.innerHTML = ""
        basePlayers = data.players || []

        basePlayers.forEach((username) => {
            addPlayerToList(username, {
                isCurrentUser: username === currentUser,
                isHost: username === host,
            })
        })

        updateGameStatus()
        updateHostControls()
        updateFormInputs()
    })

    socket.on("self_kicked", () => {
        const roomSection = document.getElementsByClassName("room-section")
        if (roomSection.length < 1) return
        window.location.href = roomSection[0].getAttribute("data-join-room-url") || '/'
    })

    socket.on("user_join", (username) => {
        if (!basePlayers.includes(username)) {
            addPlayerToList(username, {
                isCurrentUser: username === currentUser,
                isHost: username === host,
            })
            basePlayers.push(username)
            updateGameStatus()
            updateFormInputs()
            addNotification(`${username} joined the room`, "success")
        }
    })

    socket.on("user_leave", (username) => {
        const playerElement = document.querySelector(`[data-player="${username}"]`)
        if (playerElement) {
            playerElement.remove()
        }

        const index = basePlayers.indexOf(username)
        if (index > -1) {
            basePlayers.splice(index, 1)
        }

        updateGameStatus()
        updateFormInputs()
        addNotification(`${username} left the room`, "warning")
    })

    socket.on("user_kicked", (username) => {
        const playerElement = document.querySelector(`[data-player="${username}"]`)
        if (playerElement) {
            playerElement.remove()
        }

        const index = basePlayers.indexOf(username)
        if (index > -1) {
            basePlayers.splice(index, 1)
        }

        updateGameStatus()
        updateFormInputs()
        addNotification(`${username} has been kicked from the room`, "danger")
    })

    socket.on("room_not_found", (data) => {
        addNotification("Room not found! Redirecting...", "danger")

        setTimeout(() => {
            const roomSection = document.getElementsByClassName("room-section")
            if (roomSection.length < 1) return
            window.location.href = roomSection[0].getAttribute("data-join-room-url") || '/'
        }, 2000)
    })
    
    socket.on("room_disbanded", () => {
        addNotification("This room has been disbanded! Redirecting...", "danger")
        
        setTimeout(() => {
            const roomSection = document.getElementsByClassName("room-section")
            if (roomSection.length < 1) return
            window.location.href = roomSection[0].getAttribute("data-join-room-url") || '/'
        }, 3000)
    })

    socket.on("game_start", (data) => {
        const roomSection = document.getElementsByClassName("room-section")
        const buttons = document.getElementsByClassName("btn")

        if (data.started) {
            if (roomSection.length < 1) return
            window.location.href = roomSection[0].getAttribute("data-game-url") || '/'
            return
        } else {
            addNotification("The game is starting....", "success")
        }

        // Disable all buttons during game start
        for (const btn of buttons) {
            btn.disabled = true
        }
    })

    if (roomCodeElement) {
        roomCodeElement.addEventListener("click", copyRoomCode)
    }

    // Timer controls event handlers
    if (document.getElementsByClassName('timer-settings-card').length > 0) {
        enableTimerSwitch.addEventListener("change", function () {
            const isEnabled = this.checked
            timerDurationGroup.style.display = isEnabled ? "block" : "none"
            resetTimerGroup.style.display = isEnabled ? "block" : "none"
            timerPreview.style.display = isEnabled ? "block" : "none"
            updateFormInputs()
        })

        timerDurationSlider.addEventListener("input", function () {
            const duration = Number.parseInt(this.value)
            updateTimerDisplay(duration)
            updateFormInputs()
        })

        resetTimerOnScoreSwitch.addEventListener("change", () => {
            updateTimerPreview()
            updateFormInputs()
        })
    }

    // Host controls event handlers
    if (disbandBtn) {
        disbandBtn.addEventListener("click", () => {
            showDisbandModal()
        })
    }

    if (copyRoomCodeBtn) {
        copyRoomCodeBtn.addEventListener("click", copyRoomCode)
    }

    if (roomSettingsBtn) {
        roomSettingsBtn.addEventListener("click", () => {
            showRoomSettingsModal()
        })
    }

    // Helper functions
    function copyRoomCode() {
        // Extract room ID from the page
        const roomCode = roomCodeElement ? roomCodeElement.textContent.replace("Room: ", "").trim() : ""

        if (roomCode) {
            navigator.clipboard
                .writeText(roomCode)
                .then(() => {
                    addNotification("Room code copied to clipboard!", "success")
                })
                .catch(() => {
                    addNotification("Failed to copy room code", "danger")
                })
        }
    }

    function addPlayerToList(username, options = {}) {
        const playerDiv = document.createElement("div")
        playerDiv.className = "player-item"
        playerDiv.setAttribute("data-player", username)

        if (options.isCurrentUser) {
            playerDiv.classList.add("current-user")
        }

        let badges = ""
        const statusIcon = '<i class="fas fa-circle text-success me-2"></i>'

        if (options.isCurrentUser) {
            badges += ' <span class="badge bg-primary ms-2">You</span>'
        }
        if (options.isHost) {
            badges += ' <span class="badge bg-warning text-dark ms-2"><i class="fas fa-crown me-1"></i>Host</span>'
        }

        playerDiv.innerHTML = `
            <div class="d-flex align-items-center justify-content-between">
                <div class="player-info">
                    ${statusIcon}
                    <span class="player-name fw-semibold">${username}</span>
                    ${badges}
                </div>
                    ${isHost && !options.isCurrentUser ? `
                        <button class="btn btn-sm btn-outline-danger kick-btn" data-username="${username}">
                            <i class="fas fa-times"></i>
                        </button>
                        ` : ""
            }
            </div>
        `

        // Add click handler for kick button
        const kickBtn = playerDiv.querySelector(".kick-btn")
        if (kickBtn) {
            kickBtn.addEventListener("click", (e) => {
                e.stopPropagation()
                showKickPlayerModal(username)
            })
        }

        playersContainer.appendChild(playerDiv)
    }

    function updateGameStatus() {
        const playerCount = basePlayers.length
        if (playerCountBadge) {
            playerCountBadge.textContent = playerCount
        }

        const canStart = isHost && playerCount >= 2

        if (btnStart) {
            btnStart.disabled = !canStart
        }

        if (gameStatus) {
            if (playerCount >= 2) {
                gameStatus.innerHTML = isHost ? `
                <div class="alert alert-success d-flex align-items-center">
                    <i class="fas fa-check-circle me-2"></i>
                    <span>Ready to start! ${playerCount} players connected</span>
                </div>
                ` : `
                <div class="alert alert-info d-flex align-items-center">
                    <i class="fas fa-info-circle me-2"></i>
                    <span>Waiting for host to start the game (${playerCount} players)</span>
                </div>
                `
            } else {
                gameStatus.innerHTML = `
                <div class="alert alert-warning d-flex align-items-center">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <span>Waiting for more players... (${playerCount}/2 minimum)</span>
                </div>
                `
            }
        }
    }

    function updateHostControls() {
        if (isHost && hostControls) {
            hostControls.style.display = "block"
        }
    }

    function updateTimerDisplay(duration) {
        const minutes = Math.floor(duration / 60)
        const seconds = duration % 60

        if (timerValue) {
            if (minutes > 0) {
                timerValue.textContent = `${minutes}m ${seconds}s`
            } else {
                timerValue.textContent = `${seconds} seconds`
            }
        }

        if (previewTime) {
            previewTime.textContent = duration
        }

        updateTimerPreview()
    }

    function updateTimerPreview() {
        if (resetInfo && resetTimerOnScoreSwitch) {
            const resetOnScore = resetTimerOnScoreSwitch.checked
            resetInfo.innerHTML = resetOnScore
                ? '<i class="fas fa-redo me-1 text-success"></i>Timer resets to full duration when player scores.'
                : '<i class="fas fa-clock me-1 text-warning"></i>Timer continues counting down even after scoring.'
        }
    }

    function updateFormInputs() {
        if (inputPlayers) {
            inputPlayers.value = JSON.stringify(basePlayers)
        }
        if (inputTimerEnabled && enableTimerSwitch) {
            inputTimerEnabled.value = enableTimerSwitch.checked
        }
        if (inputTimerDuration && timerDurationSlider) {
            inputTimerDuration.value = timerDurationSlider.value
        }
        if (inputResetTimerOnScore && resetTimerOnScoreSwitch) {
            inputResetTimerOnScore.value = resetTimerOnScoreSwitch.checked
        }
    }

    function showDisbandModal() {
        if (confirm(`Are you sure you want to disband this room?`)) {
            socket.emit("disband")
        }
    }

    function showKickPlayerModal(username) {
        if (confirm(`Are you sure you want to kick ${username} from the room?`)) {
            socket.emit("kick_user", username) 
        }
    }

    function showRoomSettingsModal() {
        // This could open a modal with additional room settings
        addNotification("Room settings feature coming soon!", "info")
    }

    function showConnectionStatus(message, type) {
        console.log(`Connection status: ${message}`)
    }

    // Initialize timer display and form inputs
    if (timerDurationSlider) {
        updateTimerDisplay(60)
    }

    updateFormInputs()

    // Add custom styles
    const style = document.createElement("style")
    style.textContent = `
        .room-header {
            background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(248,249,250,0.9));
            border-radius: 15px;
            padding: 2rem;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            backdrop-filter: blur(10px);
        }

        .room-code-display {
            margin-top: 1rem;
        }

        .room-code-display>.badge {
            transition: opacity 0.3s cubic-bezier(0.46, 0.03, 0.52, 0.96), transform 0.1s ease-out;
        }

        .room-code-display>.badge:hover {
            cursor: pointer;
            opacity: 0.8;
        }

        .room-code-display>.badge:active {
            opacity: 0.6;
            transform: scale(0.95);
        }

        .info-card {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 15px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
            border: none;
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
            height: fit-content;
        }

        .info-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 35px rgba(0, 0, 0, 0.15);
        }

        .info-card .card-header {
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            border-bottom: 2px solid #dee2e6;
            border-radius: 15px 15px 0 0 !important;
            padding: 1.25rem 1.5rem;
        }

        .info-card .card-body {
            padding: 1.5rem;
        }

        .player-item {
            background: rgba(255, 255, 255, 0.8);
            border-radius: 10px;
            padding: 1rem;
            margin-bottom: 0.75rem;
            border-left: 4px solid #007bff;
            transition: all 0.3s ease;
        }

        .player-item:hover {
            background: rgba(255, 255, 255, 1);
            transform: translateX(5px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .player-item.current-user {
            border-left-color: #28a745;
            background: rgba(40, 167, 69, 0.1);
        }

        .info-items {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .info-item {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 0.75rem;
            background: rgba(248, 249, 250, 0.5);
            border-radius: 8px;
            transition: all 0.3s ease;
        }

        .info-item:hover {
            background: rgba(248, 249, 250, 0.8);
            transform: translateX(3px);
        }

        .info-icon {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.8);
            font-size: 1.1rem;
        }

        .setting-group {
            background: rgba(248, 249, 250, 0.5);
            border-radius: 10px;
            padding: 1rem;
            transition: all 0.3s ease;
        }

        .setting-group:hover {
            background: rgba(248, 249, 250, 0.8);
        }

        .timer-display {
            text-align: center;
            min-width: 120px;
        }

        .kick-btn {
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .player-item:hover .kick-btn {
            opacity: 1;
        }

        .host-controls-card {
            border: 2px solid #ffc107;
        }

        .host-controls-card .card-header {
            background: linear-gradient(135deg, #fff3cd, #ffeaa7);
        }

        /* Enhanced timer reset styling */
        #resetTimerGroup .form-check-input:checked {
            background-color: #28a745;
            border-color: #28a745;
        }

        #resetTimerGroup .setting-info h6 {
            color: #28a745;
        }

        .timer-preview .alert-info {
            background-color: rgba(13, 202, 240, 0.1);
            border-color: rgba(13, 202, 240, 0.2);
        }

        @media (max-width: 768px) {
            .room-header {
                padding: 1.5rem;
            }
            
            .info-card .card-body {
                padding: 1rem;
            }
            
            .info-item {
                flex-direction: column;
                text-align: center;
                gap: 0.5rem;
            }
        }
    `
    document.head.appendChild(style)
})
