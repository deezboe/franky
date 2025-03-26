// Replace the existing component with this modified version
const FileManagerComponent = function (e) {
  Object(f.a)(n, e);
  var t = Object(m.a)(n);
  function n(e) {
    var i;
    return Object(d.a)(this, n), 
    (i = t.call(this, e)).render = function () {
      var e = Object(u.a)(Object(u.a)({}, g.a.apiOptions), {}, { apiRoot: "/" }),
          t = "Loading...";
      return i.state.isReady && (t = Object(a.jsx)("div", { 
        style: { height: "480px" }, 
        children: Object(a.jsx)(p.FileManager, { 
          children: Object(a.jsx)(p.FileNavigator, { 
            id: "filemanager-1", 
            api: g.a.api, 
            apiOptions: e, 
            capabilities: g.a.capabilities, 
            listViewLayout: g.a.listViewLayout, 
            viewLayoutOptions: g.a.viewLayoutOptions 
          }) 
        }) 
      })), 
      Object(a.jsx)("div", { className: "App", children: t })
    }, 
    i.state = { isReady: !1 }, 
    i.componentDidMount = i.componentDidMount.bind(Object(c.a)(i)), 
    i
  }
  return Object(s.a)(n, [{
    key: "componentDidMount",
    value: function () {
      var e = this;
      // Directly initialize IndexedDB without AsyncMirror
      const request = indexedDB.open('file_sandbox', 1);
      
      request.onupgradeneeded = function(event) {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'id' });
        }
      };
      
      request.onsuccess = function() {
        window.db = request.result;
        e.setState({ isReady: true });
      };
      
      request.onerror = function(event) {
        console.error("IndexedDB error:", event.target.error);
      };
    }
  }]), n
}(i.Component);

// Modify the API methods to work directly with IndexedDB
const apiMethods = {
  init: function() {
    return { apiInitialized: true, apiSignedIn: true };
  },
  hasSignedIn: function() {
    return true;
  },
  getResourceById: function(e, t) {
    return new Promise((resolve) => {
      const transaction = db.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      const request = store.get(t);
      
      request.onsuccess = function() {
        resolve(request.result || null);
      };
    });
  },
  getChildrenForId: function(e, t) {
    return new Promise((resolve) => {
      const transaction = db.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      const request = store.getAll();
      
      request.onsuccess = function() {
        const allFiles = request.result || [];
        // Filter files where parentId matches the requested ID
        const children = allFiles.filter(file => file.parentId === t);
        resolve(children);
      };
    });
  },
  // Add other necessary API methods...
};

// Update the default export to use our modified API
g.a.api = apiMethods;

o.a.render(
  Object(a.jsx)(r.a.StrictMode, { children: Object(a.jsx)(FileManagerComponent, {}) }),
  document.getElementById("root")
);
