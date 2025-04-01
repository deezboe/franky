document.addEventListener('DOMContentLoaded', function() {
    const databaseSelect = document.getElementById('databaseSelect');
    const storeSelect = document.getElementById('storeSelect');
    const refreshDbs = document.getElementById('refreshDbs');
    const fileContents = document.getElementById('fileContents');
    
    // Refresh database list
    refreshDbs.addEventListener('click', refreshDatabases);
    
    // When database selection changes, load its object stores
    databaseSelect.addEventListener('change', function() {
        const dbName = this.value;
        if (dbName) {
            loadObjectStores(dbName);
        }
    });
    
    // When object store selection changes, load its contents
    storeSelect.addEventListener('change', function() {
        const dbName = databaseSelect.value;
        const storeName = this.value;
        if (dbName && storeName) {
            loadStoreContents(dbName, storeName);
        }
    });
    
    // Initial load
    refreshDatabases();
    
    // Function to refresh the list of databases
    function refreshDatabases() {
        return new Promise((resolve) => {
            // This is a hack since there's no direct API to list all databases
            // In a real app, you might want to maintain your own registry
            const request = indexedDB.databases();
            
            request.then(databases => {
                databaseSelect.innerHTML = '';
                databaseSelect.appendChild(new Option('Select database', ''));
                
                databases.forEach(db => {
                    if (db.name) {
                        databaseSelect.appendChild(new Option(db.name, db.name));
                    }
                });
                
                resolve();
            }).catch(error => {
                console.error('Error listing databases:', error);
                fileContents.innerHTML = `<p>Error: ${error.message}</p>`;
                resolve();
            });
        });
    }
    
    // Function to load object stores for a selected database
    function loadObjectStores(dbName) {
        return new Promise((resolve) => {
            const request = indexedDB.open(dbName);
            
            request.onerror = (event) => {
                console.error('Error opening database:', event.target.error);
                fileContents.innerHTML = `<p>Error: ${event.target.error.message}</p>`;
                resolve();
            };
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                const storeNames = db.objectStoreNames;
                
                storeSelect.innerHTML = '';
                storeSelect.appendChild(new Option('Select object store', ''));
                
                for (let i = 0; i < storeNames.length; i++) {
                    storeSelect.appendChild(new Option(storeNames[i], storeNames[i]));
                }
                
                db.close();
                resolve();
            };
        });
    }
    
    // Function to load contents of an object store
    function loadStoreContents(dbName, storeName) {
        const request = indexedDB.open(dbName);
        
        request.onerror = (event) => {
            console.error('Error opening database:', event.target.error);
            fileContents.innerHTML = `<p>Error: ${event.target.error.message}</p>`;
        };
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const getAllRequest = store.getAll();
            
            getAllRequest.onerror = (event) => {
                console.error('Error reading store:', event.target.error);
                fileContents.innerHTML = `<p>Error: ${event.target.error.message}</p>`;
                db.close();
            };
            
            getAllRequest.onsuccess = (event) => {
                const items = event.target.result;
                
                if (items.length === 0) {
                    fileContents.innerHTML = '<p>No items found in this store.</p>';
                } else {
                    // Create a table to display the data
                    let html = '<table><thead><tr>';
                    
                    // Add headers (assuming all items have same structure)
                    if (items.length > 0) {
                        const firstItem = items[0];
                        for (const key in firstItem) {
                            html += `<th>${key}</th>`;
                        }
                        html += '</tr></thead><tbody>';
                        
                        // Add rows
                        items.forEach(item => {
                            html += '<tr>';
                            for (const key in firstItem) {
                                let value = item[key];
                                if (typeof value === 'object') {
                                    value = JSON.stringify(value);
                                }
                                html += `<td>${value}</td>`;
                            }
                            html += '</tr>';
                        });
                        
                        html += '</tbody></table>';
                    }
                    
                    fileContents.innerHTML = html;
                }
                
                db.close();
            };
        };
    }
});
