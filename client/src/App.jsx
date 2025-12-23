import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [folders, setFolders] = useState(() => {
    const saved = localStorage.getItem('shoppingFolders')
    if (saved) {
      return JSON.parse(saved)
    }
    return [{ id: 'default', name: 'My List', items: [] }]
  })
  const [currentFolderId, setCurrentFolderId] = useState(() => {
    const saved = localStorage.getItem('currentFolderId')
    return saved || 'default'
  })
  const [newItem, setNewItem] = useState('')
  const [newQuantity, setNewQuantity] = useState('1')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [apiResults, setApiResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  // Get current folder's items
  const currentFolder = folders.find(f => f.id === currentFolderId) || folders[0]
  const items = currentFolder?.items || []

  // Save folders to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('shoppingFolders', JSON.stringify(folders))
    localStorage.setItem('currentFolderId', currentFolderId)
  }, [folders, currentFolderId])

  // Update items in current folder
  const updateItems = (newItems) => {
    setFolders(folders.map(folder => 
      folder.id === currentFolderId 
        ? { ...folder, items: newItems }
        : folder
    ))
  }

  const searchOpenFoodFacts = async (query) => {
    if (query.trim().length < 2) {
      setApiResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=5`
      )
      const data = await response.json()
      
      if (data.products && data.products.length > 0) {
        setApiResults(data.products.map(product => ({
          id: product.code || product.id,
          name: product.product_name || product.product_name_en || 'Unknown',
          brand: product.brands || '',
          image: product.image_url || product.image_front_url || '',
          quantity: product.quantity || '',
        })))
      } else {
        setApiResults([])
      }
    } catch (error) {
      console.error('Error searching OpenFoodFacts:', error)
      setApiResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const addItem = () => {
    if (newItem.trim()) {
      updateItems([
        ...items,
        {
          id: Date.now(),
          name: newItem.trim(),
          quantity: newQuantity,
          completed: false,
        },
      ])
      setNewItem('')
      setNewQuantity('1')
    }
  }

  const toggleComplete = (id) => {
    updateItems(items.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ))
  }

  const deleteItem = (id) => {
    updateItems(items.filter(item => item.id !== id))
  }

  const createFolder = () => {
    if (newFolderName.trim()) {
      const newFolder = {
        id: Date.now().toString(),
        name: newFolderName.trim(),
        items: []
      }
      setFolders([...folders, newFolder])
      setNewFolderName('')
    }
  }

  const deleteFolder = (folderId) => {
    if (folders.length === 1) {
      alert('You must have at least one folder!')
      return
    }
    if (currentFolderId === folderId) {
      // Switch to another folder before deleting
      const otherFolder = folders.find(f => f.id !== folderId)
      if (otherFolder) {
        setCurrentFolderId(otherFolder.id)
      }
    }
    setFolders(folders.filter(f => f.id !== folderId))
  }

  const switchFolder = (folderId) => {
    setCurrentFolderId(folderId)
    setSearchQuery('') // Clear search when switching folders
  }

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addItem()
    }
  }

  return (
    <div className={`app ${darkMode ? 'dark-mode' : ''}`}>
      {/* Header with Search and Profile */}
      <header className="header">
        <div>
          <h1>Grocery Shopping List</h1>
          {currentFolder && (
            <p className="current-folder-name">{currentFolder.name}</p>
          )}
        </div>
        <div className="header-controls">
          <button 
            className="profile-button"
            onClick={() => setShowSettings(!showSettings)}
            aria-label="Settings"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="settings-panel">
          <div className="settings-content">
            <h2>Settings & Customization</h2>
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={darkMode}
                  onChange={(e) => setDarkMode(e.target.checked)}
                />
                <span className="mode-label">
                  {darkMode ? 'Dark Mode' : 'Light Mode'}
                </span>
              </label>
            </div>
            <button onClick={() => setShowSettings(false)} className="close-settings">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Two-Column Layout */}
      <div className="main-container">
        {/* Left Column - Add Items */}
        <div className="left-column">
          <div className="add-item-section">
            <h2>Add New Item</h2>
            <div className="form-group">
              <label>Item Name</label>
              <input
                type="text"
                value={newItem}
                onChange={(e) => {
                  setNewItem(e.target.value)
                  searchOpenFoodFacts(e.target.value)
                }}
                onKeyPress={handleKeyPress}
                placeholder="Search for products..."
                className="input-field"
              />
              {/* API Results Dropdown */}
              {newItem && apiResults.length > 0 && (
                <div className="api-results-dropdown">
                  {apiResults.map((product) => (
                    <div
                      key={product.id}
                      className="api-result-item"
                      onClick={() => {
                        setNewItem(product.name)
                        setApiResults([])
                      }}
                    >
                      {product.image && (
                        <img 
                          src={product.image} 
                          alt={product.name}
                          className="product-image"
                          style={{ width: '50px', height: '50px', objectFit: 'cover', marginRight: '10px' }}
                        />
                      )}
                      <div className="product-info">
                        <div className="product-name">{product.name}</div>
                        {product.brand && <div className="product-brand">Brand: {product.brand}</div>}
                        {product.quantity && <div className="product-quantity">Size: {product.quantity}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {isSearching && <div style={{ marginTop: '5px', fontSize: '0.9rem', color: '#666' }}>Searching...</div>}
            </div>
            <div className="form-group">
              <label>Quantity</label>
              <input
                type="text"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                placeholder="1"
                className="input-field"
              />
            </div>
            <button onClick={addItem} className="add-button">
              + Add Item
            </button>
          </div>
          
          {/* Folders Section */}
          <div className="folders-section">
            <h3>My Lists</h3>
            <div className="folders-list">
              {folders.map(folder => (
                <div
                  key={folder.id}
                  className={`folder-item ${currentFolderId === folder.id ? 'active' : ''}`}
                >
                  <div
                    className="folder-name"
                    onClick={() => switchFolder(folder.id)}
                  >
                    📁 {folder.name}
                    <span className="folder-item-count">({folder.items.length})</span>
                  </div>
                  {folders.length > 1 && (
                    <button
                      className="delete-folder-button"
                      onClick={() => deleteFolder(folder.id)}
                      aria-label="Delete folder"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="create-folder">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    createFolder()
                  }
                }}
                placeholder="New list name..."
                className="folder-input"
              />
              <button onClick={createFolder} className="create-folder-button">
                + Create List
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Shopping List */}
        <div className="right-column">
          <h2>Shopping List</h2>
          {filteredItems.length === 0 ? (
            <div className="empty-state">
              {searchQuery ? (
                <p>No items match your search.</p>
              ) : (
                <p>Your shopping list is empty. Add items to get started!</p>
              )}
            </div>
          ) : (
            <div className="items-list">
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  className={`item-card ${item.completed ? 'completed' : ''}`}
                >
                  <div className="item-content">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => toggleComplete(item.id)}
                      className="item-checkbox"
                    />
                    <div className="item-details">
                      <span className="item-name">{item.name}</span>
                      <div className="item-meta">
                        <span className="item-quantity">Qty: {item.quantity}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="delete-button"
                    aria-label="Delete item"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App