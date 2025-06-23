// Celebration JavaScript for Thank You page
document.addEventListener("DOMContentLoaded", () => {
    // Create more confetti elements
    createConfetti()

    // Add celebration sound effect (optional)
    // playVictorySound();

    // Animate the trophy
    animateTrophy()
})

function createConfetti() {
    const confettiContainer = document.querySelector(".confetti-container")
    const colors = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#f1c40f"]

    // Create more confetti pieces
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement("div")
        confetti.className = "confetti"
        confetti.style.left = Math.random() * 100 + "%"
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
        confetti.style.animationDelay = Math.random() * 3 + "s"
        confetti.style.animationDuration = Math.random() * 3 + 2 + "s"
        confettiContainer.appendChild(confetti)
    }

    // Remove confetti after animation
    setTimeout(() => {
        confettiContainer.innerHTML = ""
    }, 6000)
}

function animateTrophy() {
    const trophy = document.querySelector(".celebration-icon i")
    if (trophy) {
        trophy.style.animation = "bounce 2s infinite, glow 2s ease-in-out infinite alternate"
    }
}
