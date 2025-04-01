document.addEventListener('DOMContentLoaded', function() {
    const databaseTree = document.getElementById('databaseTree');
    const fileList = document.getElementById('fileList');
    const breadcrumbs = document.getElementById('breadcrumbs');
    const previewContent = document.getElementById('previewContent');
    const refreshBtn = document.getElementById('refreshBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    
    let currentPath = [];
    let selectedItem = null;
    
    // Initialize the explorer
    refreshBtn.addEventListener('click', refreshDatabases);
    deleteBtn.addEventListener('click', deleteSelectedItem);
    
    // Initial load
    refreshDatabases();
    
    // Function to refresh the list of databases
    async function refreshDatabases() {
        try {
            // Get list of databases (note: this API isn't available in all browsers)
            const databases = await indexedDB.databases();
            
            // Clear current tree
            databaseTree.innerHTML = '';
            
            // Add each database to the tree
            databases.forEach(db => {
                if (db.name) {
                    const dbElement = createDatabaseElement(db.name);
                    databaseTree.appendChild(dbElement);
                }
            });
            
            // If no databases found
            if (databaseTree.children.length === 0) {
                databaseTree.innerHTML = '<div style="color: var(--secondary-text); padding: 8px;">No databases found</div>';
            }
            
            // Reset view
            currentPath = [];
            updateBreadcrumbs();
            fileList.innerHTML = '<div style="color: var(--secondary-text); padding: 16px; text-align: center;">Select a database from the sidebar</div>';
            previewContent.textContent = 'Select an item to preview';
            
        } catch (error) {
            console.error('Error listing databases:', error);
            showError('Failed to list databases. Make sure you\'re using a supported browser.');
        }
    }
    
    // Create a database tree item
    function createDatabaseElement(dbName) {
        const element = document.createElement('div');
        element.className = 'file-item';
        element.innerHTML = `
            <span class="file-icon material-icons database-icon">storage</span>
            <span class="file-name">${dbName}</span>
        `;
        
        element.addEventListener('click', () => {
            openDatabase(dbName);
        });
        
        return element;
    }
    
    // Open a database and show its object stores
    async function openDatabase(dbName) {
        try {
            currentPath = ['IndexedDB', dbName];
            updateBreadcrumbs();
            
            // Open the database (just to get structure, we'll close it immediately)
            const request = indexedDB.open(dbName);
            
            request.onerror = (event) => {
                throw event.target.error;
            };
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                
                // Clear file list
                fileList.innerHTML = '';
                
                // Add each object store
                for (let i = 0; i < db.objectStoreNames.length; i++) {
                    const storeName = db.objectStoreNames[i];
                    const storeElement = createStoreElement(dbName, storeName);
                    fileList.appendChild(storeElement);
                }
                
                if (db.objectStoreNames.length === 0) {
                    fileList.innerHTML = '<div style="color: var(--secondary-text); padding: 16px; text-align: center;">No object stores in this database</div>';
                }
                
                db.close();
            };
            
        } catch (error) {
            console.error('Error opening database:', error);
            showError(`Failed to open database: ${error.message}`);
        }
    }
    
    // Create an object store element
    function createStoreElement(dbName, storeName) {
        const element = document.createElement('div');
        element.className = 'file-item';
        element.innerHTML = `
            <span class="file-icon material-icons store-icon">folder</span>
            <span class="file-name">${storeName}</span>
            <span class="file-meta">Object Store</span>
        `;
        
        element.addEventListener('click', () => {
            openObjectStore(dbName, storeName);
        });
        
        return element;
    }
    
    // Open an object store and show its contents
    async function openObjectStore(dbName, storeName) {
        try {
            currentPath = ['IndexedDB', dbName, storeName];
            updateBreadcrumbs();
            
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
                    const items = event.target.result;
                    
                    // Clear file list
                    fileList.innerHTML = '';
                    
                    if (items.length === 0) {
                        fileList.innerHTML = '<div style="color: var(--secondary-text); padding: 16px; text-align: center;">No items in this object store</div>';
                    } else {
                        // Add each item
                        items.forEach((item, index) => {
                            const itemElement = createObjectElement(dbName, storeName, item, index);
                            fileList.appendChild(itemElement);
                        });
                    }
                    
                    db.close();
                };
            };
            
        } catch (error) {
            console.error('Error opening object store:', error);
            showError(`Failed to open object store: ${error.message}`);
        }
    }
    
    // Create an object element
    function createObjectElement(dbName, storeName, item, index) {
        const element = document.createElement('div');
        element.className = 'file-item';
        
        // Try to get a meaningful name or ID for the object
        let displayName = `Item ${index + 1}`;
        if (item.id !== undefined) displayName = `ID: ${item.id}`;
        else if (item.name !== undefined) displayName = item.name;
        else if (item.key !== undefined) displayName = `Key: ${item.key}`;
        
        element.innerHTML = `
            <span class="file-icon material-icons object-icon">insert_drive_file</span>
            <span class="file-name">${displayName}</span>
            <span class="file-meta">${typeof item}</span>
        `;
        
        element.addEventListener('click', () => {
            selectItem(element, { dbName, storeName, item });
            previewObject(item);
        });
        
        return element;
    }
    
    // Select an item in the file list
    function selectItem(element, itemData) {
        // Deselect previous item
        const previouslySelected = document.querySelector('.file-item.selected');
        if (previouslySelected) {
            previouslySelected.classList.remove('selected');
        }
        
        // Select new item
        element.classList.add('selected');
        selectedItem = itemData;
        deleteBtn.disabled = false;
    }
    
    // Preview an object's contents
    function previewObject(obj) {
        try {
            previewContent.textContent = JSON.stringify(obj, null, 2);
        } catch (error) {
            previewContent.textContent = `Unable to display object: ${error.message}`;
        }
    }
    
    // Delete the selected item
    async function deleteSelectedItem() {
        if (!selectedItem) return;
        
        try {
            const { dbName, storeName, item } = selectedItem;
            
            const request = indexedDB.open(dbName);
            
            request.onerror = (event) => {
                throw event.target.error;
            };
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(storeName, 'readwrite');
                const store = transaction.objectStore(storeName);
                
                // Try to delete by key
                let deleteRequest;
                if (item.id !== undefined) {
                    deleteRequest = store.delete(item.id);
                } else if (item.key !== undefined) {
                    deleteRequest = store.delete(item.key);
                } else {
                    // If no obvious key, we can't delete
                    throw new Error('Cannot determine key for deletion');
                }
                
                deleteRequest.onerror = (event) => {
                    throw event.target.error;
                };
                
                deleteRequest.onsuccess = () => {
                    // Refresh the view
                    openObjectStore(dbName, storeName);
                    previewContent.textContent = 'Item deleted successfully';
                    selectedItem = null;
                    deleteBtn.disabled = true;
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
    
    // Update breadcrumbs navigation
    function updateBreadcrumbs() {
        breadcrumbs.innerHTML = '';
        
        currentPath.forEach((part, index) => {
            const isLast = index === currentPath.length - 1;
            const span = document.createElement('span');
            
            if (!isLast) {
                span.style.cursor = 'pointer';
                span.style.color = 'var(--primary-color)';
                span.addEventListener('click', () => {
                    navigateTo(index);
                });
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
    
    // Navigate to a specific point in the path
    function navigateTo(index) {
        const newPath = currentPath.slice(0, index + 1);
        
        if (newPath.length === 1) {
            // Back to root
            fileList.innerHTML = '<div style="color: var(--secondary-text); padding: 16px; text-align: center;">Select a database from the sidebar</div>';
            previewContent.textContent = 'Select an item to preview';
        } else if (newPath.length === 2) {
            // Database level
            openDatabase(newPath[1]);
        } else if (newPath.length === 3) {
            // Object store level
            openObjectStore(newPath[1], newPath[2]);
        }
    }
    
    // Show an error message
    function showError(message) {
        fileList.innerHTML = `<div style="color: #d32f2f; padding: 16px; background: #ffebee; border-radius: 4px;">${message}</div>`;
    }
});
