// Join Room JavaScript
document.addEventListener("DOMContentLoaded", () => {
    const joinForm = document.getElementById("joinForm")
    const btnJoin = document.getElementById("btn-join")
    const codeInput = document.getElementById("code")

    // Add input validation
    codeInput.addEventListener("input", function () {
        const code = this.value
        if (code && code.length > 0) {
            btnJoin.disabled = false
            btnJoin.classList.remove("disabled")
        } else {
            btnJoin.disabled = true
            btnJoin.classList.add("disabled")
        }
    })

    // Handle form submission
    joinForm.addEventListener("submit", (e) => {
        e.preventDefault()
        const code = codeInput.value

        if (code && code.length > 0) {
            // Add loading state
            btnJoin.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Joining...'
            btnJoin.disabled = true

            // Simulate loading delay for better UX
            setTimeout(() => {
                window.location.href = `/rooms/${code}`
            }, 500)
        }
    })

    // Auto-focus on code input
    codeInput.focus()

    // Add enter key support
    codeInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            joinForm.dispatchEvent(new Event("submit"))
        }
    })
})
