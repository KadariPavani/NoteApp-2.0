// API Configuration
const API_BASE_URL = 'http://localhost:8000';

// State Management
let currentUser = null;
let notes = [];
let currentNote = null;
let authToken = localStorage.getItem('authToken');
let isLogin = true;
let isEditMode = false;

// DOM Elements
const authSection = document.getElementById('auth-section');
const notesSection = document.getElementById('notes-section');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authButton = document.getElementById('auth-button');
const authSwitchText = document.getElementById('auth-switch-text');
const authSwitchLink = document.getElementById('auth-switch-link');
const emailGroup = document.getElementById('email-group');
const notesList = document.getElementById('notes-list');
const noteTitle = document.getElementById('note-title');
const noteContent = document.getElementById('note-content');
const noteEditorContainer = document.getElementById('note-editor-container');
const emptyEditor = document.getElementById('empty-editor');
const searchInput = document.getElementById('search-input');
const loadingOverlay = document.getElementById('loading-overlay');
const toastContainer = document.getElementById('toast-container');
const usernameDisplay = document.getElementById('username-display');
const editNoteBtn = document.getElementById('edit-note-btn');

// Event Listeners
document.addEventListener('DOMContentLoaded', initialize);
authForm.addEventListener('submit', handleAuth);
authSwitchLink.addEventListener('click', toggleAuthMode);
document.getElementById('new-note-btn').addEventListener('click', createNewNote);
document.getElementById('logout-btn').addEventListener('click', logout);
document.getElementById('save-note-btn').addEventListener('click', saveNote);
document.getElementById('delete-note-btn').addEventListener('click', deleteNote);
editNoteBtn.addEventListener('click', toggleEditMode);
searchInput.addEventListener('input', searchNotes);

// Initialize App
async function initialize() {
    if (authToken) {
        try {
            const user = await getCurrentUser();
            if (user) {
                currentUser = user;
                usernameDisplay.textContent = user.username;
                showNotesSection();
                await loadNotes();
            } else {
                logout();
            }
        } catch (error) {
            console.error('Initialization error:', error);
            logout();
        }
    } else {
        showAuthSection();
    }
}

// Get Current User
async function getCurrentUser() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/me`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
            },
        });
        if (response.ok) {
            return await response.json();
        }
        return null;
    } catch (error) {
        console.error('Error fetching user:', error);
        return null;
    }
}

// Show/Hide Sections
function showAuthSection() {
    authSection.style.display = 'flex';
    notesSection.style.display = 'none';
}

function showNotesSection() {
    authSection.style.display = 'none';
    notesSection.style.display = 'block';
}

// Toggle Auth Mode
function toggleAuthMode(e) {
    e.preventDefault();
    isLogin = !isLogin;
    
    if (isLogin) {
        authTitle.textContent = 'Login';
        authButton.textContent = 'Login';
        authSwitchText.textContent = "Don't have an account?";
        authSwitchLink.textContent = 'Sign up';
        emailGroup.style.display = 'none';
        document.getElementById('username').placeholder = 'Username or Email';
        document.getElementById('email').removeAttribute('required');
    } else {
        authTitle.textContent = 'Sign Up';
        authButton.textContent = 'Sign Up';
        authSwitchText.textContent = 'Already have an account?';
        authSwitchLink.textContent = 'Login';
        emailGroup.style.display = 'block';
        document.getElementById('username').placeholder = 'Username';
        document.getElementById('email').setAttribute('required', 'true');
    }
    
    authForm.reset();
}

// Handle Authentication
async function handleAuth(e) {
    e.preventDefault();
    
    const formData = new FormData(authForm);
    const username = formData.get('username');
    const password = formData.get('password');
    const email = formData.get('email');
    
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin ? { username, password } : { username, email, password };
    
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.access_token;
            localStorage.setItem('authToken', authToken);
            currentUser = { username: data.username || username };
            usernameDisplay.textContent = currentUser.username;
            showToast(isLogin ? 'Login successful!' : 'Registration successful!', 'success');
            showNotesSection();
            await loadNotes();
        } else {
            showToast(data.detail || 'Authentication failed', 'error');
        }
    } catch (error) {
        console.error('Authentication error:', error);
        showToast('Network error. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

// Logout
function logout() {
    authToken = null;
    localStorage.removeItem('authToken');
    notes = [];
    currentNote = null;
    currentUser = null;
    isEditMode = false;
    showAuthSection();
    authForm.reset();
    clearEditor();
    showToast('Logged out successfully', 'success');
}

// Load Notes
async function loadNotes() {
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/api/notes`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
            },
        });
        
        if (response.ok) {
            notes = await response.json();
            renderNotes();
        } else if (response.status === 401) {
            logout();
        } else {
            showToast('Failed to load notes', 'error');
        }
    } catch (error) {
        console.error('Error loading notes:', error);
        showToast('Network error while loading notes', 'error');
    } finally {
        hideLoading();
    }
}

// Render Notes
function renderNotes(filteredNotes = null) {
    const notesToRender = filteredNotes || notes;
    notesList.innerHTML = '';
    
    if (notesToRender.length === 0) {
        notesList.innerHTML = '<div class="note-item">No notes found</div>';
        return;
    }
    
    notesToRender.forEach(note => {
        const noteItem = document.createElement('div');
        noteItem.className = 'note-item';
        noteItem.dataset.noteId = note.id;
        
        const createdDate = new Date(note.created_at).toLocaleDateString();
        const updatedDate = new Date(note.updated_at).toLocaleDateString();
        const displayDate = createdDate === updatedDate ? `Created: ${createdDate}` : `Updated: ${updatedDate}`;
        
        noteItem.innerHTML = `
            <h3>${note.title || 'Untitled'}</h3>
            <p>${note.content.substring(0, 100)}${note.content.length > 100 ? '...' : ''}</p>
            <div class="note-date">${displayDate}</div>
        `;
        
        noteItem.addEventListener('click', () => openNote(note));
        notesList.appendChild(noteItem);
    });
}

// Open Note
function openNote(note) {
    currentNote = note;
    isEditMode = false;
    noteTitle.value = note.title || '';
    noteContent.value = note.content || '';
    noteTitle.setAttribute('readonly', 'true');
    noteContent.setAttribute('readonly', 'true');
    editNoteBtn.textContent = 'Edit';
    document.getElementById('save-note-btn').setAttribute('disabled', 'true');
    document.getElementById('delete-note-btn').setAttribute('disabled', 'true');
    
    document.querySelectorAll('.note-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeItem = document.querySelector(`[data-note-id="${note.id}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    showEditor();
}

// Toggle Edit Mode
function toggleEditMode() {
    isEditMode = !isEditMode;
    if (isEditMode) {
        noteTitle.removeAttribute('readonly');
        noteContent.removeAttribute('readonly');
        editNoteBtn.textContent = 'Cancel';
        document.getElementById('save-note-btn').removeAttribute('disabled');
        document.getElementById('delete-note-btn').removeAttribute('disabled');
        noteTitle.focus();
    } else {
        noteTitle.setAttribute('readonly', 'true');
        noteContent.setAttribute('readonly', 'true');
        editNoteBtn.textContent = 'Edit';
        document.getElementById('save-note-btn').setAttribute('disabled', 'true');
        document.getElementById('delete-note-btn').setAttribute('disabled', 'true');
        // Restore original note values
        noteTitle.value = currentNote.title || '';
        noteContent.value = currentNote.content || '';
    }
}

// Create New Note
async function createNewNote() {
    const newNote = {
        title: 'New Note',
        content: ''
    };
    
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/api/notes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify(newNote),
        });
        
        if (response.ok) {
            const createdNote = await response.json();
            notes.unshift(createdNote);
            renderNotes();
            openNote(createdNote);
            toggleEditMode(); // Enable edit mode for new note
            showToast('New note created', 'success');
            noteTitle.focus();
        } else if (response.status === 401) {
            logout();
        } else {
            const errorData = await response.json();
            showToast(errorData.detail || 'Failed to create note', 'error');
        }
    } catch (error) {
        console.error('Error creating note:', error);
        showToast('Network error while creating note', 'error');
    } finally {
        hideLoading();
    }
}

// Save Note
async function saveNote() {
    if (!currentNote || !isEditMode) return;
    
    const updatedNote = {
        title: noteTitle.value.trim(),
        content: noteContent.value
    };
    
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/api/notes/${currentNote.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify(updatedNote),
        });
        
        if (response.ok) {
            const savedNote = await response.json();
            const noteIndex = notes.findIndex(n => n.id === currentNote.id);
            if (noteIndex !== -1) {
                notes[noteIndex] = savedNote;
            }
            currentNote = savedNote;
            renderNotes();
            openNote(savedNote);
            toggleEditMode(); // Exit edit mode after saving
            showToast('Note saved successfully', 'success');
        } else if (response.status === 401) {
            logout();
        } else {
            showToast('Failed to save note', 'error');
        }
    } catch (error) {
        console.error('Error saving note:', error);
        showToast('Network error while saving note', 'error');
    } finally {
        hideLoading();
    }
}

// Delete Note
async function deleteNote() {
    if (!currentNote || !isEditMode) return;
    
    if (!confirm('Are you sure you want to delete this note?')) {
        return;
    }
    
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/api/notes/${currentNote.id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`,
            },
        });
        
        if (response.ok) {
            notes = notes.filter(note => note.id !== currentNote.id);
            renderNotes();
            clearEditor();
            showToast('Note deleted successfully', 'success');
        } else if (response.status === 401) {
            logout();
        } else {
            showToast('Failed to delete note', 'error');
        }
    } catch (error) {
        console.error('Error deleting note:', error);
        showToast('Network error while deleting note', 'error');
    } finally {
        hideLoading();
    }
}

// Search Notes
function searchNotes() {
    const searchTerm = searchInput.value.toLowerCase();
    
    if (!searchTerm) {
        renderNotes();
        return;
    }
    
    const filteredNotes = notes.filter(note => 
        note.title.toLowerCase().includes(searchTerm) || 
        note.content.toLowerCase().includes(searchTerm)
    );
    
    renderNotes(filteredNotes);
}

// Show/Hide Editor
function showEditor() {
    noteEditorContainer.style.display = 'flex';
    emptyEditor.style.display = 'none';
}

function clearEditor() {
    currentNote = null;
    isEditMode = false;
    noteTitle.value = '';
    noteContent.value = '';
    noteTitle.setAttribute('readonly', 'true');
    noteContent.setAttribute('readonly', 'true');
    editNoteBtn.textContent = 'Edit';
    document.getElementById('save-note-btn').setAttribute('disabled', 'true');
    document.getElementById('delete-note-btn').setAttribute('disabled', 'true');
    noteEditorContainer.style.display = 'none';
    emptyEditor.style.display = 'flex';
    
    document.querySelectorAll('.note-item').forEach(item => {
        item.classList.remove('active');
    });
}

// Loading Overlay
function showLoading() {
    loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    loadingOverlay.style.display = 'none';
}

// Toast Messages
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (currentNote && isEditMode) {
            saveNote();
        }
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        if (authToken) {
            createNewNote();
        }
    }
    
    if (e.key === 'Escape') {
        if (searchInput.value) {
            searchInput.value = '';
            searchNotes();
        } else if (isEditMode) {
            toggleEditMode();
        }
    }
});

// Handle connection errors
window.addEventListener('online', () => {
    showToast('Connection restored', 'success');
});

window.addEventListener('offline', () => {
    showToast('Connection lost', 'warning');
});