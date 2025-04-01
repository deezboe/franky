// File: explorer.js - IndexedDB File Explorer Main Script

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const databaseTree = document.getElementById('databaseTree');
    const fileList = document.getElementById('fileList');
    const breadcrumbs = document.getElementById('breadcrumbs');
    const previewContent = document.getElementById('previewContent');
    const refreshBtn = document.getElementById('refreshBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const exportBtn = document.getElementById('exportBtn');
    
    // State variables
    let currentPath = [];
    let selectedItem = null;
    
    // Initialize event listeners
    function initEventListeners() {
        refreshBtn.addEventListener('click', refreshDatabases);
        deleteBtn.addEventListener('click', deleteSelectedItem);
        exportBtn.addEventListener('click', exportSelectedItem);
    }
    
    // Refresh database list
    async function refreshDatabases() {
        try {
            showLoading('Loading databases...');
            
            // Note: indexedDB.databases() may not be available in all browsers
            const databases = await indexedDB.databases();
            
            renderDatabaseTree(databases);
            resetContentView();
            
        } catch (error) {
            console.error('Error listing databases:', error);
            showError('Failed to list databases. Make sure you\'re using a supported browser.');
        }
    }
    
    // Render database tree in sidebar
    function renderDatabaseTree(databases) {
        databaseTree.innerHTML = '';
        
        if (databases.length === 0) {
            databaseTree.innerHTML = '<div class="empty-message">No databases found</div>';
            return;
        }
        
        databases.forEach(db => {
            if (db.name) {
                databaseTree.appendChild(createDatabaseElement(db.name));
            }
        });
    }
    
    // Create database element for sidebar
    function createDatabaseElement(dbName) {
        const element = document.createElement('div');
        element.className = 'file-item';
        element.innerHTML = `
            <span class="file-icon material-icons database-icon">storage</span>
            <span class="file-name">${dbName}</span>
            <span class="file-meta">Database</span>
        `;
        
        element.addEventListener('click', () => openDatabase(dbName));
        return element;
    }
    
    // Open database and show object stores
    function openDatabase(dbName) {
        try {
            currentPath = ['IndexedDB', dbName];
            updateBreadcrumbs();
            showLoading('Loading object stores...');
            
            const request = indexedDB.open(dbName);
            
            request.onerror = (event) => {
                throw event.target.error;
            };
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                renderObjectStores(db);
                db.close();
            };
            
        } catch (error) {
            console.error('Error opening database:', error);
            showError(`Failed to open database: ${error.message}`);
        }
    }
    
    // Render object stores in main view
    function renderObjectStores(db) {
        fileList.innerHTML = '';
        
        if (db.objectStoreNames.length === 0) {
            fileList.innerHTML = '<div class="empty-message">No object stores in this database</div>';
            return;
        }
        
        for (let i = 0; i < db.objectStoreNames.length; i++) {
            const storeName = db.objectStoreNames[i];
            fileList.appendChild(createStoreElement(db.name, storeName));
        }
    }
    
    // Create object store element
    function createStoreElement(dbName, storeName) {
        const element = document.createElement('div');
        element.className = 'file-item';
        element.innerHTML = `
            <span class="file-icon material-icons store-icon">folder</span>
            <span class="file-name">${storeName}</span>
            <span class="file-meta">Object Store</span>
        `;
        
        element.addEventListener('click', () => openObjectStore(dbName, storeName));
        return element;
    }
    
    // Open object store and show contents
    function openObjectStore(dbName, storeName) {
        try {
            currentPath = ['IndexedDB', dbName, storeName];
            updateBreadcrumbs();
            showLoading('Loading items...');
            
            const request = indexedDB.open(dbName);
            
            request.onerror = (event) => {
                throw event.target.error;
            };
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(storeName, 'readonly');
                const store = transaction.objectStore(storeName);
                const getAllRequest = store.getAll();
                
                getAllRequest.onerror = (event) => {
                    throw event.target.error;
                };
                
                getAllRequest.onsuccess = (event) => {
                    renderStoreItems(dbName, storeName, event.target.result);
                    db.close();
                };
            };
            
        } catch (error) {
            console.error('Error opening object store:', error);
            showError(`Failed to open object store: ${error.message}`);
        }
    }
    
    // Render items in an object store
    function renderStoreItems(dbName, storeName, items) {
        fileList.innerHTML = '';
        
        if (items.length === 0) {
            fileList.innerHTML = '<div class="empty-message">No items in this object store</div>';
            return;
        }
        
        items.forEach((item, index) => {
            fileList.appendChild(createObjectElement(dbName, storeName, item, index));
        });
    }
    
    // Create object element
    function createObjectElement(dbName, storeName, item, index) {
        const element = document.createElement('div');
        element.className = 'file-item';
        
        const displayName = getObjectDisplayName(item, index);
        const type = getObjectType(item);
        
        element.innerHTML = `
            <span class="file-icon material-icons object-icon">insert_drive_file</span>
            <span class="file-name">${displayName}</span>
            <span class="file-meta">${type}</span>
        `;
        
        element.addEventListener('click', () => {
            selectItem(element, { dbName, storeName, item });
            previewObject(item);
        });
        
        return element;
    }
    
    // Get display name for an object
    function getObjectDisplayName(item, index) {
        if (item.id !== undefined) return `ID: ${item.id}`;
        if (item.name !== undefined) return item.name;
        if (item.key !== undefined) return `Key: ${item.key}`;
        if (item.title !== undefined) return item.title;
        return `Item ${index + 1}`;
    }
    
    // Get type of object
    function getObjectType(item) {
        if (item instanceof Blob) return 'Blob';
        if (item instanceof ArrayBuffer) return 'ArrayBuffer';
        if (Array.isArray(item)) return 'Array';
        return typeof item;
    }
    
    // Select an item
    function selectItem(element, itemData) {
        document.querySelectorAll('.file-item.selected').forEach(el => {
            el.classList.remove('selected');
        });
        
        element.classList.add('selected');
        selectedItem = itemData;
        deleteBtn.disabled = false;
        exportBtn.disabled = false;
    }
    
    // Preview object content
    function previewObject(obj) {
        try {
            if (obj instanceof Blob) {
                previewContent.textContent = `Blob (${obj.type}, ${formatFileSize(obj.size)})`;
            } else if (obj instanceof ArrayBuffer) {
                previewContent.textContent = `ArrayBuffer (${formatFileSize(obj.byteLength)})`;
            } else {
                previewContent.textContent = JSON.stringify(obj, null, 2);
            }
        } catch (error) {
            previewContent.textContent = `Unable to display object: ${error.message}`;
        }
    }
    
    // Delete selected item
    async function deleteSelectedItem() {
        if (!selectedItem || !confirm('Are you sure you want to delete this item?')) return;
        
        try {
            const { dbName, storeName, item } = selectedItem;
            showLoading('Deleting item...');
            
            const request = indexedDB.open(dbName);
            
            request.onerror = (event) => {
                throw event.target.error;
            };
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(storeName, 'readwrite');
                const store = transaction.objectStore(storeName);
                
                // Determine key for deletion
                const key = item.id !== undefined ? item.id : 
                           item.key !== undefined ? item.key : 
                           null;
                
                if (key === null) {
                    throw new Error('Cannot determine key for deletion');
                }
                
                const deleteRequest = store.delete(key);
                
                deleteRequest.onerror = (event) => {
                    throw event.target.error;
                };
                
                deleteRequest.onsuccess = () => {
                    openObjectStore(dbName, storeName);
                    showMessage('Item deleted successfully');
                    selectedItem = null;
                    deleteBtn.disabled = true;
                    exportBtn.disabled = true;
                };
                
                transaction.oncomplete = () => {
                    db.close();
                };
            };
            
        } catch (error) {
            console.error('Error deleting item:', error);
            showError(`Failed to delete item: ${error.message}`);
        }
    }
    
    // Export selected item
    function exportSelectedItem() {
        if (!selectedItem) return;
        
        try {
            const { item } = selectedItem;
            const data = JSON.stringify(item, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `indexeddb-export-${new Date().toISOString()}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            showMessage('Item exported successfully');
            
        } catch (error) {
            console.error('Error exporting item:', error);
            showError(`Failed to export item: ${error.message}`);
        }
    }
    
    // Update breadcrumbs
    function updateBreadcrumbs() {
        breadcrumbs.innerHTML = '';
        
        currentPath.forEach((part, index) => {
            const isLast = index === currentPath.length - 1;
            const span = document.createElement('span');
            
            if (!isLast) {
                span.style.cursor = 'pointer';
                span.style.color = 'var(--primary-color)';
                span.addEventListener('click', () => navigateTo(index));
            }
            
            span.textContent = part;
            breadcrumbs.appendChild(span);
            
            if (!isLast) {
                const sep = document.createElement('span');
                sep.className = 'breadcrumb-sep';
                sep.textContent = '/';
                breadcrumbs.appendChild(sep);
            }
        });
    }
    
    // Navigate to path index
    function navigateTo(index) {
        const newPath = currentPath.slice(0, index + 1);
        
        if (newPath.length === 1) {
            resetContentView();
        } else if (newPath.length === 2) {
            openDatabase(newPath[1]);
        } else if (newPath.length === 3) {
            openObjectStore(newPath[1], newPath[2]);
        }
    }
    
    // Reset content view
    function resetContentView() {
        currentPath = ['IndexedDB'];
        updateBreadcrumbs();
        fileList.innerHTML = '<div class="empty-message">Select a database from the sidebar</div>';
        previewContent.textContent = 'Select an item to preview';
        selectedItem = null;
        deleteBtn.disabled = true;
        exportBtn.disabled = true;
    }
    
    // Helper function to format file size
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
    }
    
    // Show loading message
    function showLoading(message) {
        fileList.innerHTML = `<div class="loading-message">${message}</div>`;
    }
    
    // Show information message
    function showMessage(message) {
        previewContent.textContent = message;
    }
    
    // Show error message
    function showError(message) {
        fileList.innerHTML = `<div class="error-message">${message}</div>`;
        previewContent.textContent = message;
    }
    
    // Initialize the application
    initEventListeners();
    refreshDatabases();
});
