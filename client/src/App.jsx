import { useState, useEffect } from 'react'
import './App.css'

const API_BASE_URL = 'http://localhost:8000/api'

function App() {
  const [folders, setFolders] = useState([])
  const [currentFolderId, setCurrentFolderId] = useState('default')
  const [isLoading, setIsLoading] = useState(true)
  const [newItem, setNewItem] = useState('')
  const [newQuantity, setNewQuantity] = useState('1')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('fontSize')
    return saved || 'medium'
  })
  const [apiResults, setApiResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [editingFolderId, setEditingFolderId] = useState(null)
  const [editingFolderName, setEditingFolderName] = useState('')

  // Get current folder's items
  const currentFolder = folders.find(f => f.id === currentFolderId) || folders[0]
  const items = currentFolder?.items || []

  // Fetch folders from API on mount
  useEffect(() => {
    fetchFolders()
  }, [])

  // Save state to server before page unload/refresh
  useEffect(() => {
    const saveStateBeforeUnload = async () => {
      if (folders.length > 0) {
        try {
          // Use sendBeacon for reliable sending during page unload
          const data = JSON.stringify({
            folders: folders,
            currentFolderId: currentFolderId
          })
          
          if (navigator.sendBeacon) {
            navigator.sendBeacon(
              `${API_BASE_URL}/folders/save`,
              new Blob([data], { type: 'application/json' })
            )
          } else {
            // Fallback for browsers without sendBeacon
            await fetch(`${API_BASE_URL}/folders/save`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: data,
              keepalive: true
            })
          }
        } catch (error) {
          console.error('Error saving state before unload:', error)
        }
      }
    }

    // Save on visibility change (tab switch, minimize, etc.)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveStateBeforeUnload()
      }
    }

    // Save before page unload
    window.addEventListener('beforeunload', saveStateBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', saveStateBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [folders, currentFolderId])

  const fetchFolders = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_BASE_URL}/folders`)
      if (response.ok) {
        const data = await response.json()
        setFolders(data.folders || [])
        if (data.currentFolderId) {
          setCurrentFolderId(data.currentFolderId)
        }
      } else {
        console.error('Failed to fetch folders')
      }
    } catch (error) {
      console.error('Error fetching folders:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Save font size to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('fontSize', fontSize)
  }, [fontSize])

  // Update items in current folder
  const updateItems = async (newItems) => {
    try {
      const response = await fetch(`${API_BASE_URL}/folders/${currentFolderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: newItems }),
      })

      if (response.ok) {
        const updatedFolder = await response.json()
        setFolders(folders.map(folder => 
          folder.id === currentFolderId ? updatedFolder : folder
        ))
      } else {
        console.error('Failed to update items')
      }
    } catch (error) {
      console.error('Error updating items:', error)
    }
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

  const createFolder = async () => {
    if (newFolderName.trim()) {
      try {
        const response = await fetch(`${API_BASE_URL}/folders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: newFolderName.trim() }),
        })

        if (response.ok) {
          const newFolder = await response.json()
          setFolders([...folders, newFolder])
          setNewFolderName('')
        } else {
          const error = await response.json()
          alert(error.error || 'Failed to create folder')
        }
      } catch (error) {
        console.error('Error creating folder:', error)
        alert('Failed to create folder')
      }
    }
  }

  const deleteFolder = async (folderId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/folders/${folderId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const data = await response.json()
        setFolders(folders.filter(f => f.id !== folderId))
        if (data.currentFolderId) {
          setCurrentFolderId(data.currentFolderId)
        }
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete folder')
      }
    } catch (error) {
      console.error('Error deleting folder:', error)
      alert('Failed to delete folder')
    }
  }

  const switchFolder = async (folderId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/folders/current/${folderId}`, {
        method: 'PUT',
      })

      if (response.ok) {
        setCurrentFolderId(folderId)
        setSearchQuery('') // Clear search when switching folders
      } else {
        console.error('Failed to switch folder')
      }
    } catch (error) {
      console.error('Error switching folder:', error)
    }
  }

  const startRenameFolder = (folderId, currentName) => {
    setEditingFolderId(folderId)
    setEditingFolderName(currentName)
  }

  const cancelRenameFolder = () => {
    setEditingFolderId(null)
    setEditingFolderName('')
  }

  const saveRenameFolder = async (folderId) => {
    if (editingFolderName.trim()) {
      try {
        const response = await fetch(`${API_BASE_URL}/folders/${folderId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: editingFolderName.trim() }),
        })

        if (response.ok) {
          const updatedFolder = await response.json()
          setFolders(folders.map(folder => 
            folder.id === folderId ? updatedFolder : folder
          ))
          setEditingFolderId(null)
          setEditingFolderName('')
        } else {
          const error = await response.json()
          alert(error.error || 'Failed to rename folder')
        }
      } catch (error) {
        console.error('Error renaming folder:', error)
        alert('Failed to rename folder')
      }
    }
  }

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addItem()
    }
  }

  if (isLoading) {
    return (
      <div className={`app ${darkMode ? 'dark-mode' : ''} font-size-${fontSize}`}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`app ${darkMode ? 'dark-mode' : ''} font-size-${fontSize}`}>
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
            <div className="setting-item">
              <label>
                <span className="mode-label">Font Size:</span>
              </label>
              <div className="font-size-options">
                <button
                  className={`font-size-button ${fontSize === 'small' ? 'active' : ''}`}
                  onClick={() => setFontSize('small')}
                >
                  Small
                </button>
                <button
                  className={`font-size-button ${fontSize === 'medium' ? 'active' : ''}`}
                  onClick={() => setFontSize('medium')}
                >
                  Medium
                </button>
                <button
                  className={`font-size-button ${fontSize === 'large' ? 'active' : ''}`}
                  onClick={() => setFontSize('large')}
                >
                  Large
                </button>
              </div>
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
                  {editingFolderId === folder.id ? (
                    <div className="folder-rename-input">
                      <input
                        type="text"
                        value={editingFolderName}
                        onChange={(e) => setEditingFolderName(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            saveRenameFolder(folder.id)
                          } else if (e.key === 'Escape') {
                            cancelRenameFolder()
                          }
                        }}
                        onBlur={() => saveRenameFolder(folder.id)}
                        className="rename-input"
                        autoFocus
                      />
                      <button
                        className="save-rename-button"
                        onClick={() => saveRenameFolder(folder.id)}
                        aria-label="Save rename"
                      >
                        ✓
                      </button>
                      <button
                        className="cancel-rename-button"
                        onClick={cancelRenameFolder}
                        aria-label="Cancel rename"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <div
                        className="folder-name"
                        onClick={() => switchFolder(folder.id)}
                      >
                        📁 {folder.name}
                        <span className="folder-item-count">({folder.items.length})</span>
                      </div>
                      <div className="folder-actions">
                        <button
                          className="rename-folder-button"
                          onClick={(e) => {
                            e.stopPropagation()
                            startRenameFolder(folder.id, folder.name)
                          }}
                          aria-label="Rename folder"
                        >
                          ✏️
                        </button>
                        {folders.length > 1 && (
                          <button
                            className="delete-folder-button"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteFolder(folder.id)
                            }}
                            aria-label="Delete folder"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </>
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