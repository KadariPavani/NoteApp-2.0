# Notes App - Full Stack Project

A comprehensive note-taking application with user authentication, real-time editing, and auto-save functionality.

## Features

- **User Authentication**: Login/Signup with JWT tokens
- **CRUD Operations**: Create, Read, Update, Delete notes
- **Real-time Auto-save**: Notes are automatically saved as you type
- **Search Functionality**: Search through your notes
- **Responsive Design**: Works on desktop and mobile
- **Keyboard Shortcuts**: Ctrl+S to save, Ctrl+N for new note
- **Toast Notifications**: User feedback for all actions

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Authentication**: JWT tokens with bcrypt password hashing

## Prerequisites

- Python 3.8+
- MongoDB (local installation or MongoDB Atlas)
- Node.js (optional, for serving static files)

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd notes-app
```

### 2. Backend Setup

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. MongoDB Setup

#### Option A: Local MongoDB
1. Install MongoDB from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Start MongoDB service
3. The app will connect to `mongodb://localhost:27017` by default

#### Option B: MongoDB Atlas (Cloud)
1. Create account at [mongodb.com](https://www.mongodb.com/cloud/atlas)
2. Create a cluster and get connection string
3. Update `MONGODB_URL` in `main.py` with your connection string

### 4. Frontend Setup

Create a `static` directory and place your frontend files:

```bash
mkdir static
# Copy the following files to static/:
# - index.html
# - styles.css
# - script.js
```

### 5. Configuration

Update the configuration in `main.py`:

```python
# Change these values for production
SECRET_KEY = "your-secret-key-change-this-in-production"
MONGODB_URL = "mongodb://localhost:27017"  # Or your MongoDB Atlas URL
DATABASE_NAME = "notes_app"
```

### 6. Run the Application

```bash
# Start the FastAPI server
python main.py

# Or use uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The application will be available at `http://localhost:8000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Notes
- `GET /api/notes` - Get all notes for authenticated user
- `POST /api/notes` - Create new note
- `GET /api/notes/{note_id}` - Get specific note
- `PUT /api/notes/{note_id}` - Update note
- `DELETE /api/notes/{note_id}` - Delete note

## Project Structure

```
notes-app/
├── main.py              # FastAPI backend
├── requirements.txt     # Python dependencies
├── static/             # Frontend files
│   ├── index.html      # Main HTML file
│   ├── styles.css      # Styling
│   └── script.js       # JavaScript logic
└── README.md           # This file
```

## Usage

1. **Register/Login**: Create an account or login with existing credentials
2. **Create Notes**: Click "New Note" to create a new note
3. **Edit Notes**: Click on any note in the sidebar to edit it
4. **Auto-save**: Notes are automatically saved as you type (1-second delay)
5. **Search**: Use the search bar to find notes by title or content
6. **Delete**: Click the "Delete" button to remove a note
7. **Keyboard Shortcuts**:
   - `Ctrl+S`: Manual save
   - `Ctrl+N`: Create new note
   - `Escape`: Clear search

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- CORS protection
- Input validation
- User-specific data isolation

## Development

### Adding New Features

1. **Backend**: Add new endpoints in `main.py`
2. **Frontend**: Update the JavaScript in `script.js`
3. **Database**: MongoDB collections are created automatically

### Testing

```bash
# Test the API endpoints
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "email": "test@example.com", "password": "password123"}'
```

## Deployment

### Production Considerations

1. **Environment Variables**: Move sensitive config to environment variables
2. **Database**: Use MongoDB Atlas for production
3. **Security**: 
   - Change `SECRET_KEY`
   - Enable HTTPS
   - Configure proper CORS origins
4. **Performance**: Consider adding caching and database indexing

### Docker Deployment (Optional)

```dockerfile
# Dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For issues and questions:
1. Check the documentation
2. Search existing issues
3. Create a new issue with detailed description

---

**Happy note-taking! 📝**