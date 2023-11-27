let form = document.getElementById('join-form');

form.addEventListener('submit', (event) => {
    event.preventDefault();
    let inviteCode = event.target.invite_link.value;
    window.location = `index.html?room=${inviteCode}`
})
