// Game JavaScript
document.addEventListener("DOMContentLoaded", () => {
    const socket = io("/game")
    const surrendedElement = document.getElementById("surrended")
    const currentPlayerElement = document.getElementById("current-player")
    const selectedCharElement = document.getElementById("selected-char")
    const surrenderBtn = document.getElementById("btn-surrend")

    // Socket event handlers
    socket.on("connect", () => {
        console.log("Connected to game")
        showNotification("Connected to game", "success")
    })

    socket.on("disconnect", () => {
        console.log("Disconnected from game")
        showNotification("Disconnected from game", "danger")
    })

    socket.on("user_init", (data) => {
        // Initialize players list if data contains players and scores
        if (data.players && data.scores) {
            const playersContainer = document.getElementById("players")
            if (playersContainer) {
                // Clear existing players
                playersContainer.innerHTML = ""

                // Add each player to the list
                data.players.forEach((username) => {
                    const playerCard = document.createElement("div")
                    playerCard.className = "player-score-card"
                    playerCard.id = `item-${username}`

                    let badges = ""
                    if (username === playersContainer.getAttribute('data-current-user')) {
                        badges += ' <span class="badge bg-primary ms-2">You</span>'
                    }
                    if (username === playersContainer.getAttribute('data-host')) {
                        badges += ' <span class="badge bg-success ms-2">Host</span>'
                    }

                    playerCard.innerHTML = `
              <div class="player-info">
                <span class="player-name">${username}</span>
                ${badges}
              </div>
              <div class="player-score">
                <span id="${username}" class="score-number">${data.scores[username] || 0}</span>
                <small class="text-muted">points</small>
              </div>
            `

                    playersContainer.appendChild(playerCard)
                })
            }
        }

        if (data.players !== undefined && data.num_surrenders !== undefined) {
            surrendedElement.innerText = `${data.num_surrenders} / ${data.players.length}`;
        }

        console.log("Game initialized with players:", data.players)
    })

    socket.on("user_join", (data) => {
        const playerItem = document.getElementById(`item-${data.username}`)
        if (playerItem) {
            playerItem.classList.remove("text-danger")
            showNotification(`${data.username} rejoined the game`, "success")
        }
    })

    socket.on("user_leave", (data) => {
        const playerItem = document.getElementById(`item-${data.username}`)
        if (playerItem) {
            playerItem.classList.add("text-danger")
            showNotification(`${data.username} left the game`, "warning")
        }
    })

    socket.on("user_play", (data) => {
        // Update the board cell
        const cellButton = document.getElementById(`btn-${data.char_index}`)
        if (cellButton) {
            cellButton.innerText = data.char
            cellButton.disabled = true
            cellButton.classList.add("played")

            // Add click animation
            cellButton.style.animation = "cellClick 0.3s ease"
            setTimeout(() => {
                cellButton.style.animation = ""
            }, 300)
        }

        // Highlight scored cells with animation
        if (data.changed_states && data.changed_states.length > 0) {
            data.changed_states.forEach((index, i) => {
                setTimeout(() => {
                    const cell = document.getElementById(`btn-${index}`)
                    if (cell) {
                        cell.classList.add("cell-scored")
                        cell.style.animation = "scoreAnimation 0.5s ease"
                        setTimeout(() => {
                            cell.style.animation = ""
                        }, 500)
                    }
                }, i * 100) // Stagger the animations
            })
        }

        // Update player score with animation
        const scoreElement = document.getElementById(data.username)
        if (scoreElement) {
            const currentScore = Number.parseInt(scoreElement.innerText) || 0
            const newScore = currentScore + (data.added_score || 0)

            // Animate score change
            animateScoreChange(scoreElement, currentScore, newScore)

            // Show points notification if points were scored
            if (data.added_score && data.added_score > 0) {
                showNotification(`${data.username} scored ${data.added_score} points!`, "success")
                createFloatingPoints(scoreElement, data.added_score)
            }
        }

        // Update current player
        if (data.current_player) {
            currentPlayerElement.innerText = data.current_player
            updateCurrentPlayerHighlight(data.current_player)
        }
    })

    socket.on("user_surrend", (data) => {
        if (surrendedElement && data.current !== undefined && data.max !== undefined) {
            surrendedElement.innerText = `${data.current} / ${data.max}`
            showNotification("A player has surrendered", "warning")
        }
    })

    socket.on("game_end", (data) => {
        showNotification("Game ended! Redirecting...", "info")

        // Add celebration effect
        createCelebrationEffect()

        setTimeout(() => {
            const gameSection = document.getElementsByClassName('game-section');
            if (gameSection.length < 1) return
            window.location.href = gameSection[0].getAttribute('data-thank-you-url')
        }, 2000)
    })

    // Game functions
    window.btnPlayClicked = (cellId) => {
        const cellButton = document.getElementById(`btn-${cellId}`)

        // Check if cell is already played
        if (!cellButton || cellButton.innerText.trim() !== "" || cellButton.disabled) {
            showNotification("This cell is already taken!", "warning")
            return
        }

        const selectedChar = selectedCharElement.value

        // Add visual feedback
        cellButton.classList.add("playing")
        cellButton.style.transform = "scale(0.95)"

        // Emit play event
        socket.emit("play", {
            char_index: cellId,
            char: selectedChar,
        })

        // Reset visual feedback after a short delay
        setTimeout(() => {
            cellButton.classList.remove("playing")
            cellButton.style.transform = ""
        }, 200)
    }

    // Surrender functionality
    surrenderBtn.addEventListener("click", function () {
        if (confirm("Are you sure you want to surrender? This action cannot be undone.")) {
            socket.emit("surrend")
            this.disabled = true
            this.innerHTML = '<i class="fas fa-flag me-2"></i>Surrendered'
            this.classList.remove("btn-outline-danger")
            this.classList.add("btn-danger")
            showNotification("You have surrendered", "info")
        }
    })

    // Helper functions
    function updateCurrentPlayerHighlight(currentPlayer) {
        // Remove previous highlights
        document.querySelectorAll(".player-score-card").forEach((card) => {
            card.classList.remove("current-player-highlight")
        })

        // Add highlight to current player
        const currentPlayerCard = document.getElementById(`item-${currentPlayer}`)
        if (currentPlayerCard) {
            currentPlayerCard.classList.add("current-player-highlight")
        }
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

    function createFloatingPoints(element, points) {
        const pointsIndicator = document.createElement("div")
        pointsIndicator.className = "floating-points"
        pointsIndicator.innerText = `+${points}`

        // Position relative to the score element
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
        // Create celebration particles
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

    function showNotification(message, type) {
        const notification = document.createElement("div")
        notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`
        notification.style.cssText = "top: 20px; right: 20px; z-index: 1050; min-width: 300px; max-width: 400px;"
        notification.innerHTML = `
        <i class="fas fa-info-circle me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      `

        document.body.appendChild(notification)

        // Auto-remove after 4 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove()
            }
        }, 4000)
    }

    // Add CSS animations
    const style = document.createElement("style")
    style.textContent = `
      @keyframes cellClick {
        0% { transform: scale(1); }
        50% { transform: scale(0.9); }
        100% { transform: scale(1); }
      }
      
      @keyframes scoreAnimation {
        0% { transform: scale(1); background-color: #28a745; }
        50% { transform: scale(1.1); background-color: #20c997; }
        100% { transform: scale(1); background-color: #28a745; }
      }
      
      @keyframes floatUp {
        0% { 
          transform: translateY(0) scale(1); 
          opacity: 1; 
        }
        100% { 
          transform: translateY(-50px) scale(1.2); 
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
      
      .current-player-highlight {
        border-left-color: #ffc107 !important;
        background: rgba(255, 193, 7, 0.1) !important;
        transform: scale(1.02);
        transition: all 0.3s ease;
      }
      
      .board-cell.playing {
        background: #e3f2fd !important;
        border-color: #2196f3 !important;
      }
      
      .board-cell.played {
        cursor: not-allowed;
        opacity: 0.9;
      }
      
      .board-cell:disabled {
        cursor: not-allowed;
      }
      
      .floating-points {
        text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        font-family: 'Arial Black', sans-serif;
      }
      
      .celebration-particle {
        box-shadow: 0 0 6px rgba(255,255,255,0.8);
      }
    `
    document.head.appendChild(style)

    // Initialize current player highlight
    const initialCurrentPlayer = currentPlayerElement.innerText
    if (initialCurrentPlayer) {
        updateCurrentPlayerHighlight(initialCurrentPlayer)
    }
})
