// Index / Home Page JavaScript
document.addEventListener("DOMContentLoaded", () => {
    const formCreateRoom = document.getElementById('form-create-room')
    const actionButtons = document.getElementsByClassName('action-btn')

    formCreateRoom.addEventListener('submit', () => {
        for (const btnAction of actionButtons) {
            btnAction.disabled = true
        }
    })
})