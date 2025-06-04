// Room JavaScript
document.addEventListener("DOMContentLoaded", () => {
    const inputPlayers = document.getElementById("input-players")
    const playersContainer = document.getElementById("players")
    let basePlayers = []

    // Socket.IO connection
    const socket = io("/room")

    socket.on("connect", () => {
        console.log("Connected to room")
        showConnectionStatus("Connected", "success")
    })

    socket.on("disconnect", () => {
        console.log("Disconnected from room")
        showConnectionStatus("Disconnected", "danger")
    })

    socket.on("user_init", (data) => {
        playersContainer.innerHTML = ""
        basePlayers = data.players

        data.players.forEach((username) => {
            addPlayerToList(username, {
                isCurrentUser: username === playersContainer.getAttribute('data-current-user'),
                isHost: username === playersContainer.getAttribute('data-host'),
            })
        })

        updatePlayersInput()
    })

    socket.on("user_join", (data) => {
        addPlayerToList(data.username, {
            isHost: data.username === playersContainer.getAttribute('data-host'),
        })
        basePlayers.push(data.username)
        updatePlayersInput()
        showNotification(`${data.username} joined the room`, "success")
    })

    socket.on("user_leave", (data) => {
        const playerElement = document.querySelector(`[data-player="${data.username}"]`)
        if (playerElement) {
            playerElement.remove()
        }

        const index = basePlayers.indexOf(data.username)
        if (index > -1) {
            basePlayers.splice(index, 1)
        }
        updatePlayersInput()
        showNotification(`${data.username} left the room`, "warning")
    })

    socket.on("game_start", (data) => {
        showNotification('The game is starting....', "success")

        const roomSection = document.getElementsByClassName('room-section');
        if (roomSection.length < 1) return
        window.location.href = roomSection[0].getAttribute('data-game-url')
    })

    function addPlayerToList(username, options = {}) {
        const playerDiv = document.createElement("div")
        playerDiv.className = "player-item"
        playerDiv.setAttribute("data-player", username)

        let badges = ""
        if (options.isCurrentUser) {
            badges += ' <span class="badge bg-primary ms-2">You</span>'
        }
        if (options.isHost) {
            badges += ' <span class="badge bg-success ms-2">Host</span>'
        }

        playerDiv.innerHTML = `
              <div class="d-flex align-items-center">
                  <i class="fas fa-user-circle me-2 text-primary"></i>
                  <span class="fw-semibold">${username}</span>
                  ${badges}
              </div>
          `

        playersContainer.appendChild(playerDiv)
    }

    function updatePlayersInput() {
        inputPlayers.value = JSON.stringify(basePlayers)
    }

    function showConnectionStatus(message, type) {
        // You can implement a connection status indicator here
        console.log(`Connection status: ${message}`)
    }

    function showNotification(message, type) {
        // Create a temporary notification
        const notification = document.createElement("div")
        notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`
        notification.style.cssText = "top: 20px; right: 20px; z-index: 1050; min-width: 300px;"
        notification.innerHTML = `
              <i class="fas fa-info-circle me-2"></i>
              ${message}
              <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
          `

        document.body.appendChild(notification)

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove()
            }
        }, 3000)
    }
})
