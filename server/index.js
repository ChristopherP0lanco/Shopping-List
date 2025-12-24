const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 8000;
const DATA_FILE = path.join(__dirname, 'data', 'folders.json');

// Middleware
app.use(cors());
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Server is running! Use /api/folders to access the API.' });
});

// Ensure data directory exists
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
  const defaultData = {
    folders: [{ id: 'default', name: 'My List', items: [] }],
    currentFolderId: 'default'
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
}

// Helper function to read data
const readData = () => {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading data file:', error);
    return { folders: [{ id: 'default', name: 'My List', items: [] }], currentFolderId: 'default' };
  }
};

// Helper function to write data
const writeData = (data) => {
  try {
    // Ensure data structure is valid
    if (!data.folders || !Array.isArray(data.folders)) {
      data.folders = data.folders || [{ id: 'default', name: 'My List', items: [] }];
    }
    if (!data.currentFolderId) {
      data.currentFolderId = data.folders[0]?.id || 'default';
    }
    
    // Write file synchronously to ensure data is saved immediately
    const fileContent = JSON.stringify(data, null, 2);
    fs.writeFileSync(DATA_FILE, fileContent, { encoding: 'utf8', flag: 'w' });
    
    return true;
  } catch (error) {
    console.error('Error writing data file:', error);
    return false;
  }
};

// Routes

// GET all folders
app.get('/api/folders', (req, res) => {
  try {
    const data = readData();
    // Ensure data integrity and save if needed
    if (!data.folders || data.folders.length === 0) {
      data.folders = [{ id: 'default', name: 'My List', items: [] }];
      data.currentFolderId = 'default';
      writeData(data);
    }
    res.json({ folders: data.folders, currentFolderId: data.currentFolderId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

// GET single folder by ID
app.get('/api/folders/:id', (req, res) => {
  try {
    const data = readData();
    const folder = data.folders.find(f => f.id === req.params.id);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    res.json(folder);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch folder' });
  }
});

// POST create new folder
app.post('/api/folders', (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const data = readData();
    const newFolder = {
      id: Date.now().toString(),
      name: name.trim(),
      items: []
    };

    data.folders.push(newFolder);
    
    if (writeData(data)) {
      res.status(201).json(newFolder);
    } else {
      res.status(500).json({ error: 'Failed to create folder' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// PUT update folder (rename)
app.put('/api/folders/:id', (req, res) => {
  try {
    const { name, items } = req.body;
    const data = readData();
    const folderIndex = data.folders.findIndex(f => f.id === req.params.id);

    if (folderIndex === -1) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Update folder name if provided
    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ error: 'Folder name cannot be empty' });
      }
      data.folders[folderIndex].name = name.trim();
    }

    // Update folder items if provided
    if (items !== undefined) {
      data.folders[folderIndex].items = items;
    }

    if (writeData(data)) {
      res.json(data.folders[folderIndex]);
    } else {
      res.status(500).json({ error: 'Failed to update folder' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update folder' });
  }
});

// DELETE folder
app.delete('/api/folders/:id', (req, res) => {
  try {
    const data = readData();
    
    if (data.folders.length === 1) {
      return res.status(400).json({ error: 'Cannot delete the last folder' });
    }

    const folderIndex = data.folders.findIndex(f => f.id === req.params.id);
    if (folderIndex === -1) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // If deleting current folder, switch to another one
    if (data.currentFolderId === req.params.id) {
      const otherFolder = data.folders.find(f => f.id !== req.params.id);
      if (otherFolder) {
        data.currentFolderId = otherFolder.id;
      } else {
        data.currentFolderId = data.folders[0].id;
      }
    }

    data.folders.splice(folderIndex, 1);

    if (writeData(data)) {
      res.json({ message: 'Folder deleted successfully', currentFolderId: data.currentFolderId });
    } else {
      res.status(500).json({ error: 'Failed to delete folder' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// PUT update current folder ID
app.put('/api/folders/current/:id', (req, res) => {
  try {
    const data = readData();
    const folder = data.folders.find(f => f.id === req.params.id);
    
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    data.currentFolderId = req.params.id;

    if (writeData(data)) {
      res.json({ currentFolderId: data.currentFolderId });
    } else {
      res.status(500).json({ error: 'Failed to update current folder' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update current folder' });
  }
});

// POST save entire state (useful for page refresh/close)
app.post('/api/folders/save', (req, res) => {
  try {
    const { folders, currentFolderId } = req.body;
    
    if (!folders || !Array.isArray(folders)) {
      return res.status(400).json({ error: 'Invalid folders data' });
    }

    if (folders.length === 0) {
      return res.status(400).json({ error: 'Cannot save empty folders list' });
    }

    const data = {
      folders: folders,
      currentFolderId: currentFolderId || folders[0].id
    };

    // Validate currentFolderId exists in folders
    if (!data.folders.find(f => f.id === data.currentFolderId)) {
      data.currentFolderId = data.folders[0].id;
    }

    if (writeData(data)) {
      res.json({ message: 'State saved successfully', folders: data.folders, currentFolderId: data.currentFolderId });
    } else {
      res.status(500).json({ error: 'Failed to save state' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to save state' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

