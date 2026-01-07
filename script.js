// ==================== Mobile Menu Toggle ====================
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navMenu = document.getElementById('navMenu');

mobileMenuToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');

    // Animate hamburger to X
    const spans = mobileMenuToggle.querySelectorAll('span');
    if (navMenu.classList.contains('active')) {
        spans[0].style.transform = 'rotate(45deg) translate(6px, 6px)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'rotate(-45deg) translate(6px, -6px)';
    } else {
        spans[0].style.transform = '';
        spans[1].style.opacity = '1';
        spans[2].style.transform = '';
    }
});

// Close mobile menu when clicking on a nav link
const navLinks = document.querySelectorAll('.nav-link');
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        const spans = mobileMenuToggle.querySelectorAll('span');
        spans[0].style.transform = '';
        spans[1].style.opacity = '1';
        spans[2].style.transform = '';
    });
});

// ==================== Navbar Scroll Effect ====================
const navbar = document.getElementById('navbar');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }

    lastScroll = currentScroll;
});

// ==================== Smooth Scrolling for Anchor Links ====================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const navHeight = navbar.offsetHeight;
            const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight;

            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ==================== Contact Form Handling with Supabase ====================
const contactForm = document.getElementById('contactForm');

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validate reCAPTCHA
    const recaptchaResponse = grecaptcha.getResponse();
    if (!recaptchaResponse) {
        alert('Please complete the reCAPTCHA verification.');
        return;
    }

    // Get form data
    const formData = new FormData(contactForm);
    const data = Object.fromEntries(formData);

    // Show loading state
    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;

    try {
        // Initialize Supabase client
        const supabase = window.supabase.createClient(
            HW_SUPABASE_CONFIG.url,
            HW_SUPABASE_CONFIG.anonKey
        );

        // Prepare message data
        const messageData = {
            name: data.name,
            email: data.email,
            phone: data.phone || null,
            service: data.service || null,
            message: data.message,
            created_at: new Date().toISOString()
        };

        // Insert into Supabase
        const { error } = await supabase
            .from(HW_MESSAGES_TABLE)
            .insert([messageData]);

        if (error) {
            throw error;
        }

        alert('Thank you for your inquiry! We have received your message and will contact you soon.');
        contactForm.reset();
        grecaptcha.reset();

    } catch (error) {
        console.error('Form submission error:', error);
        alert('Sorry, there was an error sending your message. Please try again or contact us directly at info@haywilson.com');
    } finally {
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
    });
}

// ==================== Intersection Observer for Animations ====================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe service cards and expertise items
document.querySelectorAll('.service-card, .expertise-item, .contact-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    observer.observe(el);
});

// ==================== Active Nav Link on Scroll ====================
const sections = document.querySelectorAll('section[id]');

function highlightNavOnScroll() {
    const scrollPosition = window.pageYOffset + navbar.offsetHeight + 50;

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute('id');

        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            // Remove active class from all links
            navLinks.forEach(link => {
                link.style.color = '';
            });

            // Add active styling to current link
            const activeLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);
            if (activeLink) {
                activeLink.style.color = 'var(--primary-color)';
            }
        }
    });
}

window.addEventListener('scroll', highlightNavOnScroll);

// ==================== Form Validation Enhancement ====================
const inputs = document.querySelectorAll('input[required], textarea[required]');

inputs.forEach(input => {
    input.addEventListener('blur', () => {
        if (!input.value.trim()) {
            input.style.borderColor = '#ef4444';
        } else {
            input.style.borderColor = 'var(--border-color)';
        }
    });

    input.addEventListener('input', () => {
        if (input.value.trim()) {
            input.style.borderColor = '#10b981';
        }
    });
});

// Email validation
const emailInput = document.getElementById('email');
if (emailInput) {
    emailInput.addEventListener('blur', () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailInput.value && !emailRegex.test(emailInput.value)) {
            emailInput.style.borderColor = '#ef4444';
        } else if (emailInput.value) {
            emailInput.style.borderColor = '#10b981';
        }
    });
}

// ==================== Blur Text Reveal with Animation ====================
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('blur-text') && !e.target.classList.contains('revealed')) {
        const element = e.target;

        // Add revealing class for loading animation
        element.classList.add('revealing');

        // Simulate 1-second loading
        setTimeout(() => {
            element.classList.remove('revealing');
            element.classList.add('revealed');

            // Execute the onclick if it exists
            const onclickAttr = element.getAttribute('onclick');
            if (onclickAttr && onclickAttr.includes('this.innerHTML')) {
                // Extract and execute the innerHTML change
                const match = onclickAttr.match(/this\.innerHTML = '(.+?)'/);
                if (match) {
                    element.innerHTML = match[1].replace(/\\'/g, "'");
                }
            }
        }, 1000);

        // Prevent default onclick from firing immediately
        e.stopPropagation();
        e.preventDefault();
    }
});

// ==================== FAQ Accordion Functionality ====================
function initFAQ() {
    const faqQuestions = document.querySelectorAll('.faq-question');

    faqQuestions.forEach((question) => {
        question.addEventListener('click', function(e) {
            const faqItem = this.parentElement;
            const isActive = faqItem.classList.contains('active');

            // Close all other FAQ items
            document.querySelectorAll('.faq-item').forEach(item => {
                if (item !== faqItem) {
                    item.classList.remove('active');
                }
            });

            // Toggle current FAQ item
            if (isActive) {
                faqItem.classList.remove('active');
            } else {
                faqItem.classList.add('active');
            }
        });
    });
}

// ==================== Initialize ====================
document.addEventListener('DOMContentLoaded', () => {
    // Add smooth fade-in for hero content
    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
        heroContent.style.opacity = '0';
        heroContent.style.transform = 'translateY(30px)';

        setTimeout(() => {
            heroContent.style.transition = 'opacity 1s ease-out, transform 1s ease-out';
            heroContent.style.opacity = '1';
            heroContent.style.transform = 'translateY(0)';
        }, 200);
    }

    // Initialize FAQ accordion
    initFAQ();
});

// Also initialize immediately in case DOM is already loaded
if (document.readyState === 'loading') {
    // DOM is still loading, wait for DOMContentLoaded
} else {
    // DOM is already loaded, initialize immediately
    initFAQ();
}

// ==================== Performance: Lazy Load Images ====================
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            }
        });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}
