# Shopping List Server

Express server for managing shopping list folders.

## Installation

```bash
npm install
```

## Running the Server

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

The server will run on `http://localhost:8000`

## API Endpoints

### GET /api/folders
Get all folders and current folder ID

**Response:**
```json
{
  "folders": [
    {
      "id": "default",
      "name": "My List",
      "items": []
    }
  ],
  "currentFolderId": "default"
}
```

### GET /api/folders/:id
Get a specific folder by ID

### POST /api/folders
Create a new folder

**Request Body:**
```json
{
  "name": "Folder Name"
}
```

### PUT /api/folders/:id
Update a folder (rename or update items)

**Request Body:**
```json
{
  "name": "New Name"  // optional
  "items": [...]      // optional
}
```

### DELETE /api/folders/:id
Delete a folder

### PUT /api/folders/current/:id
Set the current active folder

## Data Storage

Folders are stored in `data/folders.json` file.


