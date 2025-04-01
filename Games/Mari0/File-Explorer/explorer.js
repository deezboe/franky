// Initialize the database
let db;
const dbName = "FileExplorerDB";
const storeName = "files";
const dbVersion = 1;

// Current path (like a directory structure)
let currentPath = [];

document.addEventListener('DOMContentLoaded', () => {
    // Open or create the database
    const request = indexedDB.open(dbName, dbVersion);
    
    request.onupgradeneeded = (event) => {
        db = event.target.result;
        if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
            store.createIndex('path', 'path', { unique: false });
            store.createIndex('name', 'name', { unique: false });
            store.createIndex('isDirectory', 'isDirectory', { unique: false });
            
            // Add root directory
            const transaction = event.target.transaction;
            transaction.objectStore(storeName).add({
                name: 'root',
                path: [],
                isDirectory: true,
                content: '',
                date: new Date()
            });
        }
    };
    
    request.onsuccess = (event) => {
        db = event.target.result;
        loadFiles(currentPath);
    };
    
    request.onerror = (event) => {
        console.error("Database error:", event.target.error);
    };
    
    // Event listeners
    document.getElementById('addFile').addEventListener('click', addFile);
    document.getElementById('addFolder').addEventListener('click', addFolder);
    document.getElementById('deleteItem').addEventListener('click', deleteItem);
});

function loadFiles(path) {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index('path');
    const request = index.getAll(IDBKeyRange.only(path));
    
    request.onsuccess = () => {
        const files = request.result;
        displayFiles(files);
    };
    
    request.onerror = () => {
        console.error("Error loading files");
    };
}

function displayFiles(files) {
    const explorer = document.getElementById('file-explorer');
    explorer.innerHTML = '';
    
    // Display path navigation
    const pathNav = document.createElement('div');
    let pathHTML = '<span class="path-item" data-path="[]">root</span>';
    
    currentPath.forEach((dir, index) => {
        const pathToHere = currentPath.slice(0, index + 1);
        pathHTML += ` / <span class="path-item" data-path="${JSON.stringify(pathToHere)}">${dir}</span>`;
    });
    
    pathNav.innerHTML = pathHTML;
    explorer.appendChild(pathNav);
    
    // Add click handlers for path navigation
    document.querySelectorAll('.path-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const path = JSON.parse(e.target.getAttribute('data-path'));
            currentPath = path;
            loadFiles(currentPath);
        });
    });
    
    // Display files and directories
    files.forEach(file => {
        if (file.path.join('/') === currentPath.join('/')) {
            const fileItem = document.createElement('div');
            fileItem.className = `file-item ${file.isDirectory ? 'directory' : 'file'}`;
            fileItem.textContent = file.name + (file.isDirectory ? '/' : '');
            fileItem.setAttribute('data-id', file.id);
            
            if (file.isDirectory) {
                fileItem.addEventListener('click', () => {
                    currentPath = [...file.path, file.name];
                    loadFiles(currentPath);
                });
            } else {
                fileItem.addEventListener('click', () => {
                    displayFileContent(file);
                });
            }
            
            explorer.appendChild(fileItem);
        }
    });
}

function displayFileContent(file) {
    const contentDiv = document.getElementById('file-content');
    contentDiv.innerHTML = `
        <h3>${file.name}</h3>
        <p>${file.content}</p>
        <p><small>Last modified: ${new Date(file.date).toLocaleString()}</small></p>
    `;
    
    // Update the form fields for editing
    document.getElementById('fileName').value = file.name;
    document.getElementById('fileContent').value = file.content;
    document.getElementById('deleteItem').setAttribute('data-id', file.id);
}

function addFile() {
    const name = document.getElementById('fileName').value.trim();
    const content = document.getElementById('fileContent').value;
    
    if (!name) {
        alert('Please enter a file name');
        return;
    }
    
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    
    store.add({
        name: name,
        path: [...currentPath],
        isDirectory: false,
        content: content,
        date: new Date()
    });
    
    transaction.oncomplete = () => {
        document.getElementById('fileName').value = '';
        document.getElementById('fileContent').value = '';
        loadFiles(currentPath);
    };
}

function addFolder() {
    const name = document.getElementById('fileName').value.trim();
    
    if (!name) {
        alert('Please enter a folder name');
        return;
    }
    
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    
    store.add({
        name: name,
        path: [...currentPath],
        isDirectory: true,
        content: '',
        date: new Date()
    });
    
    transaction.oncomplete = () => {
        document.getElementById('fileName').value = '';
        document.getElementById('fileContent').value = '';
        loadFiles(currentPath);
    };
}

function deleteItem() {
    const id = parseInt(document.getElementById('deleteItem').getAttribute('data-id'));
    
    if (!id) {
        alert('No item selected to delete');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this item?')) {
        return;
    }
    
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    
    // First check if it's a directory and has contents
    const getRequest = store.get(id);
    
    getRequest.onsuccess = () => {
        const item = getRequest.result;
        
        if (item.isDirectory) {
            // Check if directory is empty
            const index = store.index('path');
            const pathToCheck = [...item.path, item.name];
            const checkRequest = index.getAll(IDBKeyRange.only(pathToCheck));
            
            checkRequest.onsuccess = () => {
                if (checkRequest.result.length > 0) {
                    alert('Cannot delete non-empty directory');
                } else {
                    store.delete(id);
                }
            };
        } else {
            store.delete(id);
        }
    };
    
    transaction.oncomplete = () => {
        document.getElementById('fileName').value = '';
        document.getElementById('fileContent').value = '';
        document.getElementById('deleteItem').removeAttribute('data-id');
        loadFiles(currentPath);
    };
}
