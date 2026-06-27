/* ============================================
   CHEMISTRY CODE - NOTIFICATIONS SYSTEM
   ============================================ */

const NotificationSystem = {
    // Get user notifications
    getNotifications(email) {
        const data = JSON.parse(localStorage.getItem('chemcode_notifications') || '{}');
        return data[email] || [];
    },

    // Add notification
    addNotification(email, notification) {
        const data = JSON.parse(localStorage.getItem('chemcode_notifications') || '{}');
        if (!data[email]) data[email] = [];

        const notif = {
            id: Date.now().toString(),
            ...notification,
            read: false,
            date: new Date().toISOString()
        };

        data[email].unshift(notif);
        
        // Keep only last 50 notifications
        if (data[email].length > 50) {
            data[email] = data[email].slice(0, 50);
        }

        localStorage.setItem('chemcode_notifications', JSON.stringify(data));
        this.updateBadge(email);
        this.showPushNotification(notif);

        return notif;
    },

    // Mark as read
    markAsRead(email, notifId) {
        const data = JSON.parse(localStorage.getItem('chemcode_notifications') || '{}');
        if (!data[email]) return;

        const notif = data[email].find(n => n.id === notifId);
        if (notif) {
            notif.read = true;
            localStorage.setItem('chemcode_notifications', JSON.stringify(data));
            this.updateBadge(email);
        }
    },

    // Mark all as read
    markAllAsRead(email) {
        const data = JSON.parse(localStorage.getItem('chemcode_notifications') || '{}');
        if (!data[email]) return;

        data[email].forEach(n => n.read = true);
        localStorage.setItem('chemcode_notifications', JSON.stringify(data));
        this.updateBadge(email);
    },

    // Get unread count
    getUnreadCount(email) {
        const notifications = this.getNotifications(email);
        return notifications.filter(n => !n.read).length;
    },

    // Update notification badge
    updateBadge(email) {
        const count = this.getUnreadCount(email);
        const badge = document.getElementById('notifBadge');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    },

    // Show push notification (in-app)
    showPushNotification(notif) {
        const toast = document.createElement('div');
        toast.className = 'push-notification';
        toast.innerHTML = `
            <div class="push-icon">${notif.icon || '🔔'}</div>
            <div class="push-content">
                <strong>${notif.title}</strong>
                <p>${notif.message}</p>
            </div>
            <button class="push-close" onclick="this.parentElement.remove()">✕</button>
        `;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    },

    // Send notification to all users
    broadcastNotification(notification) {
        const users = JSON.parse(localStorage.getItem('chemcode_users') || '[]');
        users.forEach(user => {
            this.addNotification(user.email, notification);
        });
    },

    // Notification types
    Types: {
        newLesson(lessonTitle) {
            return {
                type: 'new_lesson',
                icon: '📚',
                title: 'درس جديد!',
                message: `تم إضافة درس: ${lessonTitle}`,
                link: 'lessons.html'
            };
        },
        quizResult(score, total) {
            return {
                type: 'quiz_result',
                icon: '📝',
                title: 'نتيجة الاختبار',
                message: `حصلت على ${score}/${total} 🎉`,
                link: 'quizzes.html'
            };
        },
        badge(badgeName) {
            return {
                type: 'badge',
                icon: '🏆',
                title: 'شارة جديدة!',
                message: `حصلت على شارة: ${badgeName}`,
                link: 'dashboard.html'
            };
        },
        certificate(lessonTitle) {
            return {
                type: 'certificate',
                icon: '🎓',
                title: 'شهادة جديدة!',
                message: `حصلت على شهادة: ${lessonTitle}`,
                link: 'certificates.html'
            };
        },
        planUpgrade(planName) {
            return {
                type: 'plan',
                icon: '💰',
                title: 'تم ترقية اشتراكك!',
                message: `أنت الآن مشترك في خطة: ${planName}`,
                link: 'dashboard.html'
            };
        },
        welcome() {
            return {
                type: 'welcome',
                icon: '🎉',
                title: 'أهلاً بك!',
                message: 'مرحباً بك في Chemistry Code! ابدأ رحلتك الآن',
                link: 'lessons.html'
            };
        }
    }
};

// Add styles
const notifStyles = document.createElement('style');
notifStyles.textContent = `
    .push-notification {
        position: fixed;
        top: 80px;
        left: 20px;
        background: #1A2238;
        border: 1px solid rgba(32,226,215,0.3);
        border-radius: 15px;
        padding: 15px 20px;
        z-index: 10000;
        opacity: 0;
        transform: translateX(-100%);
        transition: all 0.4s ease;
        display: flex;
        align-items: center;
        gap: 15px;
        max-width: 350px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    }
    .push-notification.show {
        opacity: 1;
        transform: translateX(0);
    }
    .push-notification .push-icon { font-size: 2rem; }
    .push-notification .push-content { flex: 1; }
    .push-notification .push-content strong { display: block; color: #20E2D7; font-size: 0.95rem; }
    .push-notification .push-content p { color: #aaa; font-size: 0.85rem; margin: 0; }
    .push-notification .push-close {
        background: none; border: none; color: #666;
        font-size: 1.2rem; cursor: pointer; padding: 5px;
    }
    .push-notification .push-close:hover { color: #FF6B35; }

    .notif-badge {
        position: absolute;
        top: -5px;
        right: -5px;
        width: 20px;
        height: 20px;
        background: #FF6B35;
        color: white;
        border-radius: 50%;
        font-size: 0.7rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
    }
`;
document.head.appendChild(notifStyles);