import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [items, setItems] = useState([])
  const [newItem, setNewItem] = useState('')
  const [newQuantity, setNewQuantity] = useState('1')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [apiResults, setApiResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)

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
      setItems([
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
    setItems(items.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ))
  }

  const deleteItem = (id) => {
    setItems(items.filter(item => item.id !== id))
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
        <h1>Grocery Shopping List</h1>
        <div className="header-controls">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-bar"
            />
          </div>
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
          
          {/* Statistics */}
          <div className="statistics">
            <h3>Statistics</h3>
            <p>Total Items: {items.length}</p>
            <p>Completed: {items.filter(item => item.completed).length}</p>
            <p>Remaining: {items.filter(item => !item.completed).length}</p>
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