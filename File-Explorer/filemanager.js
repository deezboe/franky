// In the componentDidMount or initialization section
componentDidMount() {
    var e = this;
    h.configure({
        fs: "AsyncMirror",
        options: {
            sync: { fs: "InMemory" },
            async: { fs: "IndexedDB", options: { storeName: "file_sandbox" } }
        }
    }, function(t) {
        if (t) throw t;
        
        // Add IndexedDB polyfill if needed
        if (!window.indexedDB.databases) {
            window.indexedDB.databases = function() {
                return new Promise((resolve) => {
                    var req = window.indexedDB.open("dummy");
                    req.onsuccess = function() {
                        req.result.close();
                        resolve(
                            Array.from(window.indexedDB.databases || []).map(db => ({
                                name: db.name,
                                version: db.version
                            }))
                        );
                    };
                    req.onerror = function() {
                        resolve([]);
                    };
                });
            };
        }
        
        e.setState({ isReady: true });
        window.fs = window.require("fs");
    });
}
