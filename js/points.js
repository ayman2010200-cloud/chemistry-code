/* ============================================
   CHEMISTRY CODE - POINTS & ACHIEVEMENTS SYSTEM
   ============================================ */

const PointsSystem = {
    // Points values
    POINTS: {
        WATCH_LESSON: 10,
        COMPLETE_LESSON: 25,
        QUIZ_CORRECT: 5,
        QUIZ_PERFECT: 50,
        FIRST_LOGIN_TODAY: 5,
        STREAK_7_DAYS: 100,
        CERTIFICATE_EARNED: 200
    },

    // Badges/Achievements
    BADGES: [
        { id: 'first_lesson', name: 'البداية 🚀', desc: 'شاهد أول درس', points: 50, icon: '🚀' },
        { id: 'five_lessons', name: 'متعلم نشط 📚', desc: 'أكمل 5 دروس', points: 100, icon: '📚' },
        { id: 'first_quiz', name: 'المُختبِر 📝', desc: 'أكمل أول اختبار', points: 50, icon: '📝' },
        { id: 'perfect_quiz', name: 'عبقري! 🧠', desc: 'درجة كاملة في اختبار', points: 150, icon: '🧠' },
        { id: 'streak_7', name: 'ملتزم 🔥', desc: '7 أيام متتالية', points: 200, icon: '🔥' },
        { id: 'points_500', name: 'نجم صاعد ⭐', desc: 'اجمع 500 نقطة', points: 100, icon: '⭐' },
        { id: 'points_1000', name: 'بطل الكيمياء 🏆', desc: 'اجمع 1000 نقطة', points: 200, icon: '🏆' },
        { id: 'first_certificate', name: 'معتمد 🎓', desc: 'احصل على أول شهادة', points: 300, icon: '🎓' }
    ],

    // Get user points data
    getUserPoints(email) {
        const data = JSON.parse(localStorage.getItem('chemcode_points') || '{}');
        if (!data[email]) {
            data[email] = {
                points: 0,
                totalEarned: 0,
                lessonsWatched: [],
                lessonsCompleted: [],
                quizzesDone: [],
                badges: [],
                streak: 0,
                lastLogin: null,
                certificates: []
            };
            this.savePointsData(data);
        }
        return data[email];
    },

    // Save points data
    savePointsData(data) {
        localStorage.setItem('chemcode_points', JSON.stringify(data));
    },

    // Add points
    addPoints(email, amount, reason) {
        const data = JSON.parse(localStorage.getItem('chemcode_points') || '{}');
        if (!data[email]) data[email] = { points: 0, totalEarned: 0, badges: [], lessonsWatched: [], lessonsCompleted: [], quizzesDone: [], streak: 0, lastLogin: null, certificates: [] };
        
        data[email].points += amount;
        data[email].totalEarned += amount;
        this.savePointsData(data);

        // Show notification
        this.showPointsNotification(amount, reason);

        // Check for new badges
        this.checkBadges(email);

        return data[email].points;
    },

    // Watch lesson
    watchLesson(email, lessonId) {
        const data = JSON.parse(localStorage.getItem('chemcode_points') || '{}');
        if (!data[email]) return;

        if (!data[email].lessonsWatched.includes(lessonId)) {
            data[email].lessonsWatched.push(lessonId);
            this.savePointsData(data);
            this.addPoints(email, this.POINTS.WATCH_LESSON, 'مشاهدة درس');

            // Check first lesson badge
            if (data[email].lessonsWatched.length === 1) {
                this.awardBadge(email, 'first_lesson');
            }
        }
    },

    // Complete lesson
    completeLesson(email, lessonId) {
        const data = JSON.parse(localStorage.getItem('chemcode_points') || '{}');
        if (!data[email]) return;

        if (!data[email].lessonsCompleted.includes(lessonId)) {
            data[email].lessonsCompleted.push(lessonId);
            this.savePointsData(data);
            this.addPoints(email, this.POINTS.COMPLETE_LESSON, 'إكمال درس');

            // Check 5 lessons badge
            if (data[email].lessonsCompleted.length === 5) {
                this.awardBadge(email, 'five_lessons');
            }
        }
    },

    // Complete quiz
    completeQuiz(email, quizId, score, total) {
        const data = JSON.parse(localStorage.getItem('chemcode_points') || '{}');
        if (!data[email]) return;

        const quizData = { id: quizId, score, total, date: new Date().toISOString() };
        data[email].quizzesDone.push(quizData);
        this.savePointsData(data);

        // Points for correct answers
        this.addPoints(email, score * this.POINTS.QUIZ_CORRECT, `${score} إجابات صحيحة`);

        // First quiz badge
        if (data[email].quizzesDone.length === 1) {
            this.awardBadge(email, 'first_quiz');
        }

        // Perfect score badge
        if (score === total) {
            this.addPoints(email, this.POINTS.QUIZ_PERFECT, 'درجة كاملة! 🎉');
            this.awardBadge(email, 'perfect_quiz');
        }

        return { score, total, percentage: Math.round((score/total)*100) };
    },

    // Check and update streak
    checkStreak(email) {
        const data = JSON.parse(localStorage.getItem('chemcode_points') || '{}');
        if (!data[email]) return;

        const today = new Date().toDateString();
        const lastLogin = data[email].lastLogin;

        if (lastLogin !== today) {
            const yesterday = new Date(Date.now() - 86400000).toDateString();
            
            if (lastLogin === yesterday) {
                data[email].streak++;
                if (data[email].streak === 7) {
                    this.awardBadge(email, 'streak_7');
                    this.addPoints(email, this.POINTS.STREAK_7_DAYS, '7 أيام متتالية! 🔥');
                }
            } else if (lastLogin !== today) {
                data[email].streak = 1;
            }

            data[email].lastLogin = today;
            this.addPoints(email, this.POINTS.FIRST_LOGIN_TODAY, 'تسجيل دخول يومي');
            this.savePointsData(data);
        }

        return data[email].streak;
    },

    // Award badge
    awardBadge(email, badgeId) {
        const data = JSON.parse(localStorage.getItem('chemcode_points') || '{}');
        if (!data[email]) return;

        if (!data[email].badges.includes(badgeId)) {
            data[email].badges.push(badgeId);
            this.savePointsData(data);

            const badge = this.BADGES.find(b => b.id === badgeId);
            if (badge) {
                this.addPoints(email, badge.points, `شارة جديدة: ${badge.name}`);
                this.showBadgeNotification(badge);
            }
        }
    },

    // Check all badges
    checkBadges(email) {
        const userData = this.getUserPoints(email);

        // Points milestones
        if (userData.totalEarned >= 500 && !userData.badges.includes('points_500')) {
            this.awardBadge(email, 'points_500');
        }
        if (userData.totalEarned >= 1000 && !userData.badges.includes('points_1000')) {
            this.awardBadge(email, 'points_1000');
        }
    },

    // Show points notification
    showPointsNotification(points, reason) {
        const notif = document.createElement('div');
        notif.className = 'points-notification';
        notif.innerHTML = `<span class="points-icon">⭐</span> +${points} نقطة <small>${reason}</small>`;
        document.body.appendChild(notif);
        
        setTimeout(() => notif.classList.add('show'), 100);
        setTimeout(() => {
            notif.classList.remove('show');
            setTimeout(() => notif.remove(), 300);
        }, 3000);
    },

    // Show badge notification
    showBadgeNotification(badge) {
        const notif = document.createElement('div');
        notif.className = 'badge-notification';
        notif.innerHTML = `
            <div class="badge-icon">${badge.icon}</div>
            <div class="badge-info">
                <strong>🎉 شارة جديدة!</strong>
                <span>${badge.name}</span>
            </div>
        `;
        document.body.appendChild(notif);
        
        setTimeout(() => notif.classList.add('show'), 100);
        setTimeout(() => {
            notif.classList.remove('show');
            setTimeout(() => notif.remove(), 300);
        }, 4000);
    },

    // Get leaderboard
    getLeaderboard(limit = 10) {
        const data = JSON.parse(localStorage.getItem('chemcode_points') || '{}');
        const users = JSON.parse(localStorage.getItem('chemcode_users') || '[]');

        const leaderboard = users.map(user => ({
            name: user.name,
            email: user.email,
            points: data[user.email]?.totalEarned || 0,
            badges: data[user.email]?.badges?.length || 0
        })).sort((a, b) => b.points - a.points);

        return leaderboard.slice(0, limit);
    },

    // Get user rank
    getUserRank(email) {
        const leaderboard = this.getLeaderboard(1000);
        const index = leaderboard.findIndex(u => u.email === email);
        return index + 1;
    }
};

// Add styles for notifications
const pointsStyles = document.createElement('style');
pointsStyles.textContent = `
    .points-notification {
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%) translateY(-20px);
        background: linear-gradient(135deg, #20E2D7, #00b4d8);
        color: #0a0e1a;
        padding: 12px 25px;
        border-radius: 50px;
        font-weight: 700;
        font-size: 0.95rem;
        z-index: 10000;
        opacity: 0;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 5px 30px rgba(32,226,215,0.4);
    }
    .points-notification.show {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
    }
    .points-notification .points-icon { font-size: 1.2rem; }
    .points-notification small { opacity: 0.8; font-weight: 400; }

    .badge-notification {
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%) translateY(-20px) scale(0.9);
        background: linear-gradient(135deg, #FF6B35, #ff8c61);
        color: white;
        padding: 20px 30px;
        border-radius: 20px;
        z-index: 10000;
        opacity: 0;
        transition: all 0.4s ease;
        display: flex;
        align-items: center;
        gap: 15px;
        box-shadow: 0 10px 40px rgba(255,107,53,0.4);
    }
    .badge-notification.show {
        opacity: 1;
        transform: translateX(-50%) translateY(0) scale(1);
    }
    .badge-notification .badge-icon { font-size: 2.5rem; }
    .badge-notification .badge-info { text-align: right; }
    .badge-notification .badge-info strong { display: block; font-size: 1rem; }
    .badge-notification .badge-info span { font-size: 1.1rem; }
`;
document.head.appendChild(pointsStyles);