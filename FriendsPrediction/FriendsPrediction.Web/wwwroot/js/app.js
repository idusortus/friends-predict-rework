// Friends Prediction App
const App = {
    users: [],
    events: [],
    trades: [],
    currentUser: null,

    async init() {
        this.setupTabNavigation();
        this.setupModalHandlers();
        this.setupEventHandlers();
        await this.loadData();
    },

    // ========== DATA LOADING ==========

    async loadData() {
        try {
            await Promise.all([
                this.loadUsers(),
                this.loadEvents(),
                this.loadTrades()
            ]);
        } catch (error) {
            console.error('Failed to load data:', error);
            this.showError('Failed to connect to API');
        }
    },

    async loadUsers() {
        const response = await fetch(`${CONFIG.API_URL}/api/users`);
        this.users = await response.json();
        this.renderUsers();
    },

    async loadEvents() {
        const response = await fetch(`${CONFIG.API_URL}/api/events`);
        this.events = await response.json();
        this.renderEvents();
    },

    async loadTrades() {
        const response = await fetch(`${CONFIG.API_URL}/api/trades`);
        this.trades = await response.json();
        this.renderTrades();
    },

    // ========== RENDERING ==========

    renderUsers() {
        const container = document.getElementById('users-list');
        if (this.users.length === 0) {
            container.innerHTML = '<p class="empty-state">No players yet. Add one to get started!</p>';
            return;
        }
        container.innerHTML = this.users.map(user => `
            <div class="card user-card">
                <h3>${this.escapeHtml(user.displayName)}</h3>
                <div class="user-balance">
                    <span class="label">Balance:</span>
                    <span class="value">$${user.balance.toFixed(2)}</span>
                </div>
                <div class="user-joined">
                    Joined ${new Date(user.createdAt).toLocaleDateString()}
                </div>
            </div>
        `).join('');
    },

    renderEvents() {
        const container = document.getElementById('events-list');
        if (this.events.length === 0) {
            container.innerHTML = '<p class="empty-state">No events yet. Create one to start betting!</p>';
            return;
        }
        container.innerHTML = this.events.map(event => `
            <div class="card event-card ${event.status}">
                <div class="event-status-badge ${event.status}">${event.status}</div>
                <h3>${this.escapeHtml(event.title)}</h3>
                <p class="event-description">${this.escapeHtml(event.description || '')}</p>
                ${event.status === 'resolved' 
                    ? `<div class="event-outcome">Outcome: <strong>${event.outcome ? 'YES' : 'NO'}</strong></div>`
                    : `<div class="event-actions">
                        <button class="btn btn-success" onclick="App.showBetModal('${event.id}', true)">Bet YES</button>
                        <button class="btn btn-danger" onclick="App.showBetModal('${event.id}', false)">Bet NO</button>
                        <button class="btn btn-secondary" onclick="App.showResolveModal('${event.id}')">Resolve</button>
                    </div>`
                }
                <div class="event-meta">
                    Created ${new Date(event.createdAt).toLocaleDateString()}
                </div>
            </div>
        `).join('');
    },

    renderTrades() {
        const container = document.getElementById('trades-list');
        if (this.trades.length === 0) {
            container.innerHTML = '<p class="empty-state">No trades yet.</p>';
            return;
        }
        container.innerHTML = this.trades.map(trade => {
            const user = this.users.find(u => u.id === trade.userId);
            const event = this.events.find(e => e.id === trade.eventId);
            return `
                <div class="trade-item">
                    <span class="trade-user">${user ? this.escapeHtml(user.displayName) : 'Unknown'}</span>
                    bet <span class="trade-amount">$${trade.amount.toFixed(2)}</span>
                    on <span class="trade-prediction ${trade.prediction ? 'yes' : 'no'}">${trade.prediction ? 'YES' : 'NO'}</span>
                    for "${event ? this.escapeHtml(event.title) : 'Unknown event'}"
                    <span class="trade-time">${this.timeAgo(trade.createdAt)}</span>
                </div>
            `;
        }).join('');
    },

    // ========== MODAL HANDLERS ==========

    showModal(title, content) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-content').innerHTML = content;
        document.getElementById('modal-overlay').classList.remove('hidden');
    },

    hideModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
    },

    showCreateUserModal() {
        this.showModal('Add New Player', `
            <form id="create-user-form">
                <div class="form-group">
                    <label for="user-name">Display Name</label>
                    <input type="text" id="user-name" required placeholder="Enter name">
                </div>
                <button type="submit" class="btn btn-primary">Add Player</button>
            </form>
        `);
        document.getElementById('create-user-form').addEventListener('submit', (e) => this.handleCreateUser(e));
    },

    showCreateEventModal() {
        this.showModal('Create Prediction Event', `
            <form id="create-event-form">
                <div class="form-group">
                    <label for="event-title">Title (the prediction)</label>
                    <input type="text" id="event-title" required placeholder="e.g., Will it rain tomorrow?">
                </div>
                <div class="form-group">
                    <label for="event-description">Description (optional)</label>
                    <textarea id="event-description" placeholder="Add any details..."></textarea>
                </div>
                <div class="form-group">
                    <label for="event-creator">Created By</label>
                    <select id="event-creator" required>
                        <option value="">Select a player...</option>
                        ${this.users.map(u => `<option value="${u.id}">${this.escapeHtml(u.displayName)}</option>`).join('')}
                    </select>
                </div>
                <button type="submit" class="btn btn-primary">Create Event</button>
            </form>
        `);
        document.getElementById('create-event-form').addEventListener('submit', (e) => this.handleCreateEvent(e));
    },

    showBetModal(eventId, prediction) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        this.showModal(`Bet ${prediction ? 'YES' : 'NO'} on "${event.title}"`, `
            <form id="place-bet-form">
                <input type="hidden" id="bet-event-id" value="${eventId}">
                <input type="hidden" id="bet-prediction" value="${prediction}">
                <div class="form-group">
                    <label for="bet-user">Player</label>
                    <select id="bet-user" required>
                        <option value="">Select who's betting...</option>
                        ${this.users.map(u => `<option value="${u.id}">${this.escapeHtml(u.displayName)} ($${u.balance.toFixed(2)})</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="bet-amount">Amount</label>
                    <input type="number" id="bet-amount" required min="1" step="0.01" placeholder="10.00">
                </div>
                <button type="submit" class="btn ${prediction ? 'btn-success' : 'btn-danger'}">
                    Place Bet
                </button>
            </form>
        `);
        document.getElementById('place-bet-form').addEventListener('submit', (e) => this.handlePlaceBet(e));
    },

    showResolveModal(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        this.showModal(`Resolve: "${event.title}"`, `
            <p>What was the outcome?</p>
            <div class="resolve-buttons">
                <button class="btn btn-success btn-large" onclick="App.handleResolve('${eventId}', true)">
                    YES happened
                </button>
                <button class="btn btn-danger btn-large" onclick="App.handleResolve('${eventId}', false)">
                    NO - it didn't happen
                </button>
            </div>
        `);
    },

    // ========== API HANDLERS ==========

    async handleCreateUser(e) {
        e.preventDefault();
        const name = document.getElementById('user-name').value.trim();
        if (!name) return;

        try {
            const response = await fetch(`${CONFIG.API_URL}/api/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ displayName: name })
            });
            if (!response.ok) throw new Error('Failed to create user');
            
            this.hideModal();
            await this.loadUsers();
        } catch (error) {
            alert('Failed to add player: ' + error.message);
        }
    },

    async handleCreateEvent(e) {
        e.preventDefault();
        const title = document.getElementById('event-title').value.trim();
        const description = document.getElementById('event-description').value.trim();
        const createdById = document.getElementById('event-creator').value;

        if (!title || !createdById) return;

        try {
            const response = await fetch(`${CONFIG.API_URL}/api/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description, createdById })
            });
            if (!response.ok) throw new Error('Failed to create event');
            
            this.hideModal();
            await this.loadEvents();
        } catch (error) {
            alert('Failed to create event: ' + error.message);
        }
    },

    async handlePlaceBet(e) {
        e.preventDefault();
        const eventId = document.getElementById('bet-event-id').value;
        const userId = document.getElementById('bet-user').value;
        const prediction = document.getElementById('bet-prediction').value === 'true';
        const amount = parseFloat(document.getElementById('bet-amount').value);

        if (!eventId || !userId || isNaN(amount)) return;

        try {
            const response = await fetch(`${CONFIG.API_URL}/api/trades`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId, userId, prediction, amount })
            });
            
            if (!response.ok) {
                const error = await response.text();
                throw new Error(error);
            }
            
            this.hideModal();
            await this.loadData();
        } catch (error) {
            alert('Failed to place bet: ' + error.message);
        }
    },

    async handleResolve(eventId, outcome) {
        try {
            const response = await fetch(`${CONFIG.API_URL}/api/events/${eventId}/resolve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ outcome })
            });
            
            if (!response.ok) throw new Error('Failed to resolve event');
            
            this.hideModal();
            await this.loadData();
        } catch (error) {
            alert('Failed to resolve event: ' + error.message);
        }
    },

    // ========== UI SETUP ==========

    setupTabNavigation() {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                tab.classList.add('active');
                document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
            });
        });
    },

    setupModalHandlers() {
        document.querySelector('.modal-close').addEventListener('click', () => this.hideModal());
        document.getElementById('modal-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'modal-overlay') this.hideModal();
        });
    },

    setupEventHandlers() {
        document.getElementById('create-user-btn').addEventListener('click', () => this.showCreateUserModal());
        document.getElementById('create-event-btn').addEventListener('click', () => this.showCreateEventModal());
    },

    // ========== UTILITIES ==========

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    timeAgo(dateString) {
        const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
        const intervals = [
            { label: 'year', seconds: 31536000 },
            { label: 'month', seconds: 2592000 },
            { label: 'day', seconds: 86400 },
            { label: 'hour', seconds: 3600 },
            { label: 'minute', seconds: 60 }
        ];
        for (const interval of intervals) {
            const count = Math.floor(seconds / interval.seconds);
            if (count >= 1) return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
        }
        return 'just now';
    },

    showError(message) {
        const container = document.getElementById('events-list');
        container.innerHTML = `<div class="error-message">${message}</div>`;
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
