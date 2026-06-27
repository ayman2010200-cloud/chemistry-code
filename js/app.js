/* ============================================
   CHEMISTRY CODE - SHARED JAVASCRIPT
   Prof. Ayman Mansour
   ============================================ */

// ===== USER DATABASE (localStorage) =====
const DB = {
    getUsers() {
        return JSON.parse(localStorage.getItem('chemcode_users') || '[]');
    },
    saveUsers(users) {
        localStorage.setItem('chemcode_users', JSON.stringify(users));
    },
    getCurrentUser() {
        const email = localStorage.getItem('chemcode_current_user');
        if (!email) return null;
        return this.getUsers().find(u => u.email === email) || null;
    },
    setCurrentUser(email) {
        localStorage.setItem('chemcode_current_user', email);
    },
    logout() {
        localStorage.removeItem('chemcode_current_user');
    },
    register(name, email, password, grade) {
        const users = this.getUsers();
        if (users.find(u => u.email === email)) {
            return { success: false, message: 'البريد الإلكتروني مسجل بالفعل!' };
        }
        users.push({
            name, email, password, grade,
            plan: 'free',
            joinDate: new Date().toISOString(),
            lessonsWatched: 0,
            quizzesDone: 0
        });
        this.saveUsers(users);
        this.setCurrentUser(email);
        return { success: true };
    },
    login(email, password) {
        const users = this.getUsers();
        const user = users.find(u => u.email === email && u.password === password);
        if (!user) {
            return { success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة!' };
        }
        this.setCurrentUser(email);
        return { success: true, user };
    },
    updatePlan(email, plan) {
        const users = this.getUsers();
        const user = users.find(u => u.email === email);
        if (user) {
            user.plan = plan;
            this.saveUsers(users);
        }
    },
    updateUser(email, data) {
        const users = this.getUsers();
        const user = users.find(u => u.email === email);
        if (user) {
            Object.assign(user, data);
            this.saveUsers(users);
        }
    }
};

// ===== NAVBAR SCROLL =====
window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    const scrollTopBtn = document.getElementById('scrollTop');

    if (navbar) {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    }
    if (scrollTopBtn) {
        scrollTopBtn.classList.toggle('visible', window.scrollY > 500);
    }
});

// ===== MOBILE MENU =====
function toggleMenu() {
    document.getElementById('navLinks').classList.toggle('active');
}

// Close menu on link click
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            const navLinks = document.getElementById('navLinks');
            if (navLinks) navLinks.classList.remove('active');
        });
    });

    // Update navigation based on login state
    updateNavAuth();

    // Scroll animations
    initScrollAnimations();
});

// ===== UPDATE NAVBAR AUTH STATE =====
function updateNavAuth() {
    const navRight = document.getElementById('navRight');
    if (!navRight) return;

    const user = DB.getCurrentUser();

    if (user) {
        const initial = user.name.charAt(0);
        navRight.innerHTML = `
            <a href="dashboard.html" class="nav-user">
                <div class="avatar">${initial}</div>
                <span>${user.name.split(' ')[0]}</span>
            </a>
            <button class="btn btn-logout btn-small" onclick="handleLogout()">خروج</button>
        `;
    } else {
        navRight.innerHTML = `
            <a href="login.html"><button class="btn btn-outline btn-small btn-login">دخول</button></a>
            <a href="register.html"><button class="btn btn-primary btn-small">حساب جديد</button></a>
        `;
    }
}

// ===== LOGOUT =====
function handleLogout() {
    DB.logout();
    showToast('تم تسجيل الخروج بنجاح', 'info');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'success') {
    // Remove existing toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// ===== SCROLL ANIMATIONS =====
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.feature-card, .lesson-card, .price-card, .testimonial-card, .card, .contact-info-card, .payment-method').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.6s ease';
        observer.observe(el);
    });
}

// ===== CHECK AUTH (protect pages) =====
function requireAuth() {
    const user = DB.getCurrentUser();
    if (!user) {
        showToast('يجب تسجيل الدخول أولاً', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return null;
    }
    return user;
}

// ===== CHECK PLAN ACCESS =====
function requirePlan(requiredPlan) {
    const user = DB.getCurrentUser();
    if (!user) return false;

    const planLevels = { free: 0, monthly: 1, vip: 2 };
    return planLevels[user.plan] >= planLevels[requiredPlan];
}

// ===== PARTICLES HTML =====
function getParticlesHTML() {
    return `<div class="particles">
        <div class="particle"></div><div class="particle"></div>
        <div class="particle"></div><div class="particle"></div>
        <div class="particle"></div><div class="particle"></div>
        <div class="particle"></div><div class="particle"></div>
    </div>`;
}