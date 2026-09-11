# 🚀 Backend Requirements for Real-Time Collaborative Editor

## Overview
This document outlines the backend requirements needed to support the real-time collaborative text editor frontend. The frontend has been fully implemented with Socket.IO client, operational transformation, and collaborative features.

## 🏗️ Architecture Requirements

### 1. **Socket.IO Server Setup**
Your backend developer needs to implement a Socket.IO server running on **port 3001** (separate from the REST API on port 3000).

#### Required Dependencies:
```bash
npm install socket.io
```

#### Basic Setup:
```javascript
const io = require('socket.io')(3001, {
  cors: {
    origin: ["http://localhost:5173", "https://your-frontend-domain.com"],
    methods: ["GET", "POST"]
  }
});
```

---

## 🔌 Socket.IO Events to Implement

### **Client → Server Events**

#### 1. `join-document`
**Purpose**: User joins a document room for collaboration
```javascript
// Event data structure
{
  documentId: "document_id_here",
  userId: "user_id_or_socket_id", 
  timestamp: 1234567890
}

// Implementation needed
io.on('connection', (socket) => {
  socket.on('join-document', (data) => {
    // Join the document room
    socket.join(`doc:${data.documentId}`);
    
    // Store user info
    socket.userId = data.userId;
    socket.documentId = data.documentId;
    
    // Notify others that user joined
    socket.to(`doc:${data.documentId}`).emit('user-joined', {
      userId: data.userId,
      socketId: socket.id,
      timestamp: Date.now()
    });
    
    // Send current active users list
    const activeUsers = getUsersInDocument(data.documentId);
    socket.emit('active-users', { users: activeUsers });
  });
});
```

#### 2. `leave-document`
**Purpose**: User leaves a document room
```javascript
socket.on('leave-document', (data) => {
  socket.leave(`doc:${data.documentId}`);
  
  // Notify others that user left
  socket.to(`doc:${data.documentId}`).emit('user-left', {
    userId: socket.userId,
    socketId: socket.id,
    timestamp: Date.now()
  });
});
```

#### 3. `document-operation`
**Purpose**: Real-time document editing operations
```javascript
// Event data structure
{
  documentId: "document_id",
  operation: {
    type: "insert_text" | "remove_text" | "insert_node" | "remove_node",
    path: [0, 0], // Slate.js path array
    offset: 5,    // For text operations
    text: "hello", // For text operations
    node: {...},   // For node operations
    timestamp: 1234567890
  },
  userId: "user_id",
  timestamp: 1234567890
}

socket.on('document-operation', async (data) => {
  try {
    // 1. Validate the operation
    if (!isValidOperation(data.operation)) {
      socket.emit('operation-error', { error: 'Invalid operation' });
      return;
    }
    
    // 2. Apply operational transformation if needed
    const transformedOp = await applyOperationalTransform(
      data.documentId, 
      data.operation
    );
    
    // 3. Save to database
    await saveOperation(data.documentId, transformedOp);
    
    // 4. Broadcast to all other users in the document
    socket.to(`doc:${data.documentId}`).emit('document-operation', {
      ...data,
      operation: transformedOp
    });
    
    // 5. Update document content in database
    await updateDocumentContent(data.documentId, transformedOp);
    
  } catch (error) {
    socket.emit('operation-error', { 
      error: 'Failed to process operation',
      details: error.message 
    });
  }
});
```

#### 4. `selection-change`
**Purpose**: User cursor/selection changes
```javascript
// Event data structure
{
  documentId: "document_id",
  selection: {
    anchor: { path: [0, 0], offset: 5 },
    focus: { path: [0, 0], offset: 10 }
  },
  userId: "user_id",
  timestamp: 1234567890
}

socket.on('selection-change', (data) => {
  // Broadcast selection to other users
  socket.to(`doc:${data.documentId}`).emit('selection-change', data);
});
```

#### 5. `cursor-change`
**Purpose**: User cursor position for visual indicators
```javascript
// Event data structure  
{
  documentId: "document_id",
  cursor: {
    path: [0, 0],
    offset: 5,
    x: 100,    // Optional: pixel coordinates
    y: 200     // Optional: pixel coordinates
  },
  userId: "user_id", 
  timestamp: 1234567890
}

socket.on('cursor-change', (data) => {
  // Broadcast cursor position to other users
  socket.to(`doc:${data.documentId}`).emit('cursor-change', data);
});
```

### **Server → Client Events**

#### 1. `user-joined`
Notify when a user joins the document
```javascript
{
  userId: "user_id",
  socketId: "socket_id",
  name: "User Name", // Optional
  timestamp: 1234567890
}
```

#### 2. `user-left`
Notify when a user leaves the document
```javascript
{
  userId: "user_id", 
  socketId: "socket_id",
  timestamp: 1234567890
}
```

#### 3. `document-operation`
Forward operations to all collaborative users
```javascript
{
  documentId: "document_id",
  operation: { /* operation object */ },
  userId: "user_id",
  timestamp: 1234567890
}
```

#### 4. `active-users`
Send list of currently active users
```javascript
{
  users: [
    {
      userId: "user_id_1",
      socketId: "socket_id_1", 
      name: "User Name",
      joinedAt: 1234567890
    }
  ]
}
```

#### 5. `document-updated`
Notify when document is saved to database
```javascript
{
  documentId: "document_id",
  updatedAt: 1234567890,
  version: 123
}
```

---

## 💾 Database Schema Extensions

### **Documents Collection** (extend existing)
```javascript
{
  _id: ObjectId,
  title: String,
  content: String, // JSON string of Slate.js content
  createdAt: Date,
  updatedAt: Date,
  
  // New fields for collaboration
  version: Number,           // Document version for conflict resolution
  activeUsers: [String],     // Array of currently active user IDs
  lastOperation: Date,       // Timestamp of last operation
  operationLog: [Operation]  // Recent operations for conflict resolution
}
```

### **Operations Collection** (new)
```javascript
{
  _id: ObjectId,
  documentId: ObjectId,      // Reference to document
  operation: {
    type: String,            // insert_text, remove_text, etc.
    path: [Number],          // Slate.js path
    offset: Number,          // For text operations  
    text: String,            // For text operations
    node: Object,            // For node operations
    timestamp: Date
  },
  userId: String,            // User who made the operation
  version: Number,           // Document version when operation was made
  appliedAt: Date,
  transformedFrom: ObjectId  // If this op was transformed from another
}
```

### **ActiveSessions Collection** (new)
```javascript
{
  _id: ObjectId,
  documentId: ObjectId,
  userId: String,
  socketId: String,
  joinedAt: Date,
  lastActivity: Date,
  selection: Object,         // Current user selection
  cursor: Object            // Current cursor position
}
```

---

## 🔧 Required Backend Functions

### 1. **User Management**
```javascript
// Get all active users in a document
function getUsersInDocument(documentId) {
  // Return array of active users
}

// Add user to document session
function addUserToDocument(documentId, userId, socketId) {
  // Add to ActiveSessions collection
}

// Remove user from document session  
function removeUserFromDocument(documentId, userId, socketId) {
  // Remove from ActiveSessions collection
}
```

### 2. **Operation Handling**
```javascript
// Validate operation structure
function isValidOperation(operation) {
  // Check if operation has required fields
  // Validate operation type
  // Validate paths and offsets
}

// Apply operational transformation
async function applyOperationalTransform(documentId, operation) {
  // Get recent operations from database
  // Transform the operation against concurrent operations
  // Return transformed operation
}

// Save operation to database
async function saveOperation(documentId, operation) {
  // Save to Operations collection
  // Update document version
}

// Update document content
async function updateDocumentContent(documentId, operation) {
  // Apply operation to document content
  // Save updated content to Documents collection
}
```

### 3. **Conflict Resolution**
```javascript
// Handle operation conflicts
async function resolveConflicts(documentId, operations) {
  // Sort operations by timestamp
  // Apply operational transformation
  // Return resolved operations
}
```

---

## 🌐 CORS Configuration
Make sure to configure CORS for both HTTP and Socket.IO:

```javascript
// For Express.js REST API
const cors = require('cors');
app.use(cors({
  origin: ["http://localhost:5173", "https://your-frontend-domain.com"],
  credentials: true
}));

// For Socket.IO
const io = require('socket.io')(3001, {
  cors: {
    origin: ["http://localhost:5173", "https://your-frontend-domain.com"],
    methods: ["GET", "POST"],
    credentials: true
  }
});
```

---

## 🚀 Deployment Considerations

### **Environment Variables**
```bash
# Add to server/.env
WEBSOCKET_PORT=3001
CORS_ORIGINS=http://localhost:5173,https://your-frontend-domain.com
```

### **Process Management**
- Run Socket.IO server as separate process from REST API
- Consider using PM2 for process management
- Implement health checks for both servers

### **Scaling**
For production scaling, consider:
- Redis adapter for Socket.IO clustering
- Message queues for operation processing
- Database connection pooling
- Load balancing configuration

---

## 📋 Testing Checklist

### **Basic Functionality**
- [ ] Users can join/leave documents
- [ ] Real-time text operations sync across clients
- [ ] User presence indicators work
- [ ] Connection recovery after disconnect
- [ ] Operations persist to database

### **Collaboration Features**
- [ ] Multiple users can edit simultaneously
- [ ] No data loss during concurrent edits
- [ ] Proper operational transformation
- [ ] Cursor/selection synchronization
- [ ] User list updates in real-time

### **Error Handling**
- [ ] Invalid operations are rejected
- [ ] Network disconnection recovery
- [ ] Database connection failures handled
- [ ] Malformed data validation
- [ ] Rate limiting for operations

---

## 🔍 Optional Enhancements

### **Advanced Features**
1. **Document Locking**: Prevent editing of specific sections
2. **Comments System**: Add collaborative comments
3. **Version History**: Track document versions and changes
4. **Permissions**: User roles and editing permissions
5. **Analytics**: Track user activity and document statistics

### **Performance Optimizations**
1. **Operation Batching**: Group operations for efficiency
2. **Selective Sync**: Only sync relevant document sections
3. **Compression**: Compress large operations
4. **Caching**: Cache frequently accessed documents

---

## 📞 Support

The frontend is fully implemented and ready to work with the backend once these requirements are met. All Socket.IO event handlers, operational transformation, and UI components are complete.

**Frontend is expecting:**
- Socket.IO server on `http://localhost:3001`
- All the events listed above to be implemented
- Proper CORS configuration
- Database persistence for operations

Contact the frontend team if you need clarification on any event structures or data formats!