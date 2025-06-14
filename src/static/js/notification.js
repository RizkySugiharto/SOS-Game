const notificationsContainer = document.getElementById('notifications-container');

export function addNotification(message, type) {
    const notification = document.createElement("div")
    notification.className = `alert alert-${type} alert-dismissible fade show m-0 shadow-lg`
    notification.style.cssText = "pointer-events: all;"
    notification.innerHTML = `
    <i class="fas fa-info-circle me-2"></i>
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `

    notificationsContainer.appendChild(notification)

    // Auto-remove after 4 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove()
        }
    }, 4000)
}