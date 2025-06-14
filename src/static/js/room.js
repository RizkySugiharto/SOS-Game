import { addNotification } from "./notification.js";

// Room JavaScript
document.addEventListener("DOMContentLoaded", () => {
    const inputPlayers = document.getElementById("input-players")
    const playersContainer = document.getElementById("players")
    const buttonStart = document.getElementById("btn-start")
    const currentUser = playersContainer.getAttribute('data-current-user')
    const host = playersContainer.getAttribute('data-host')
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
                isCurrentUser: username === currentUser,
                isHost: username === host,
            })
        })

        updateButtonStartStatus()
        updatePlayersInput()
    })

    socket.on("user_join", (data) => {
        addPlayerToList(data.username, {
            isCurrentUser: data.username === playersContainer.getAttribute('data-current-user'),
            isHost: data.username === playersContainer.getAttribute('data-host'),
        })

        basePlayers.push(data.username)

        updateButtonStartStatus()
        updatePlayersInput()
        addNotification(`${data.username} joined the room`, "success")
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

        updateButtonStartStatus()
        updatePlayersInput()
        addNotification(`${data.username} left the room`, "warning")
    })

    socket.on("room_not_found", (data) => {
        addNotification("Room not found! Redirecting...", "danger")

        setTimeout(() => {
            const roomSection = document.getElementsByClassName('room-section')
            if (roomSection.length < 1) return
            window.location.href = roomSection[0].getAttribute('data-join-room-url')
        }, 2000)
    })

    socket.on("game_start", (data) => {

        const roomSection = document.getElementsByClassName('room-section')
        const buttons = document.getElementsByClassName('btn')

        if (data.started) {
            if (roomSection.length < 1) return
            window.location.href = roomSection[0].getAttribute('data-game-url')

            return
        } else {
            addNotification('The game is starting....', "success")
        }

        for (const btn of buttons) {
            btn.disabled = true
        }
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

    function updateButtonStartStatus() {
        buttonStart.disabled = currentUser != host || basePlayers.length < 2
    }

    function showConnectionStatus(message, type) {
        // You can implement a connection status indicator here
        console.log(`Connection status: ${message}`)
    }
})
