// Фоновые частицы
for (let i = 0; i < 20; i++) {
    const particle = document.createElement('div');
    particle.style.position = 'fixed';
    particle.style.width = Math.random() * 20 + 10 + 'px';
    particle.style.height = particle.style.width;
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = Math.random() * 100 + '%';
    particle.style.background = 'rgba(255,255,255,0.3)';
    particle.style.borderRadius = '50%';
    particle.style.animation = 'float 15s infinite';
    document.body.appendChild(particle);
}

const overlay = document.getElementById('overlay');

document.querySelectorAll('.game-card').forEach(card => {

    const button = card.querySelector('.play-button');
    const loading = card.querySelector('.loading');
    const error = card.querySelector('.error');
    const retryBtn = card.querySelector('.retry-btn');
    const gameUrl = card.dataset.url;

    button.addEventListener('click', () => {

        overlay.classList.add('active');
        card.classList.add('active');

        button.style.display = 'none';
        loading.classList.add('active');

        setTimeout(() => {

            if (!gameUrl) {
                loading.classList.remove('active');
                error.classList.add('active');
                overlay.classList.remove('active');
            } else {
                window.location.href = gameUrl;
            }

        }, 2000);
    });

    retryBtn.addEventListener('click', () => {
        error.classList.remove('active');
        overlay.classList.remove('active');
        card.classList.remove('active');
        button.style.display = 'block';
    });

});
