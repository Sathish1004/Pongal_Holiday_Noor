# Chat System Rules - One Task One Chat

## Core Principle
**ONE TASK = ONE CHAT**
- Each task has exactly ONE chat identified by its unique `taskId`
- Admin and Employee see the SAME chat for the same task
- No separate chats, no filtering, no isolation by user

## Task Isolation Per Project

### How Tasks Are Created
When a project (site) is created:
1. Predefined phases are cloned from `task_templates`
2. Predefined tasks are cloned for each phase
3. Each task gets a unique `id` (auto-increment)
4. Tasks are linked to: `site_id` + `phase_id` + unique `task_id`

### Task Identity
```sql
tasks table:
- id (PRIMARY KEY, AUTO_INCREMENT) ← UNIQUE PER TASK
- site_id (project identifier)
- phase_id (stage identifier within project)
- name (task name, can be duplicate across projects)
```

**Example:**
- Project A → "Excavation" task → `task_id = 1`
- Project B → "Excavation" task → `task_id = 2`
- These are DIFFERENT tasks with DIFFERENT chats

## Chat Loading Rules

### Frontend (StageProgressScreen.tsx)
```typescript
// CORRECT: Load by taskId
navigation.navigate('StageProgress', { taskId: task.id })

// WRONG: Never load by name, stage, or user
❌ { taskName: 'Excavation' }
❌ { phaseName: 'Foundation' }
❌ { employeeId: user.id }
```

### Backend (taskController.js)
```javascript
// Messages are fetched by task_id ONLY
SELECT * FROM task_messages WHERE task_id = ?
```

## Message Visibility Rules

### NO FILTERING
- ✅ All users see ALL messages for a given task
- ✅ Employee sends message → Admin sees it
- ✅ Admin sends message → Employee sees it
- ✅ System messages → Everyone sees them
- ❌ NO filtering by sender_id
- ❌ NO filtering by user role
- ❌ NO separate admin/employee views

### Implementation
```typescript
// StageProgressScreen.tsx - Lines 446-453
const taskMessages = response.data.messages || [];
const stageMessages = response.data.stage_messages || [];

// Combine and sort - NO FILTERING
const combinedMessages = [...taskMessages, ...stageMessages].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
);

setMessages(combinedMessages);
```

## Workflow

### Employee Flow
1. Employee Dashboard → Shows assigned tasks
2. Click task → Opens `StageProgress` with `taskId`
3. Chat loads messages for that `taskId`
4. Employee can:
   - Send messages
   - Upload images/voice notes
   - Update progress
   - Mark as complete

### Admin Flow
1. Admin Dashboard → Project → Phase → Task
2. Click task → Opens `StageProgress` with SAME `taskId`
3. Chat loads SAME messages as employee sees
4. Admin can:
   - View all messages
   - Approve/Reject task
   - Send feedback

## Task Completion Workflow

### Employee Marks Complete
```javascript
// taskController.js - completeTask()
1. Update task status → 'waiting_for_approval'
2. Set progress → 100
3. Record completed_by → employeeId
4. Add system message to chat:
   "Work completed - Ready for admin approval"
5. Notify admin
```

### Admin Approves
```javascript
// taskController.js - approveTask()
1. Update task status → 'completed'
2. Record approved_by → adminId
3. Add system message to chat:
   "✅ Good work! Task approved and completed by admin."
4. Notify employee
```

### Admin Rejects
```javascript
// taskController.js - rejectTask()
1. Update task status → 'in_progress'
2. Reset progress → 99
3. Clear completed_by and completed_at
4. Add system message with reason to chat
5. Notify employee
```

## Database Schema

### Tasks Table
```sql
CREATE TABLE tasks (
    id INT PRIMARY KEY AUTO_INCREMENT,  -- Unique task identifier
    site_id INT,                         -- Project identifier
    phase_id INT,                        -- Stage identifier
    name VARCHAR(255),                   -- Task name (can duplicate)
    status VARCHAR(50),
    progress INT DEFAULT 0,
    completed_by INT,
    completed_at DATETIME,
    approved_by INT,
    approved_at DATETIME,
    FOREIGN KEY (site_id) REFERENCES sites(id),
    FOREIGN KEY (phase_id) REFERENCES phases(id)
);
```

### Task Messages Table
```sql
CREATE TABLE task_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    task_id INT NOT NULL,                -- Links to tasks.id
    sender_id INT,                       -- Employee or admin ID
    type VARCHAR(20),                    -- 'text', 'image', 'audio', 'system'
    content TEXT,
    media_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);
```

## Strictly Blocked Behaviors

❌ **Shared chat between projects**
- Same task name in different projects must have different chats

❌ **Shared chat between tasks**
- Each task has its own isolated chat

❌ **Phase-level chat**
- Only task-level chats exist

❌ **Project-level chat**
- No global project chat

❌ **Chat switching based on user role**
- Admin and employee see the same chat

❌ **Chat identified by task name**
- Chat is identified by unique `task_id` only

## Acceptance Criteria

✅ Same task name across projects → Different task IDs → Different chats
✅ Admin and employee see identical chat for same task
✅ No cross-project chat leakage
✅ No cross-task chat leakage
✅ Chat history persists and never resets
✅ System messages appear in the same chat
✅ Approval/rejection recorded in task chat

## Key Files

### Frontend
- `StageProgressScreen.tsx` - Main chat interface
- `EmployeeTasksScreen.tsx` - Employee task list
- `AdminDashboardScreen.tsx` - Admin project management

### Backend
- `taskController.js` - Task operations and messages
- `siteController.js` - Project and phase management

## Testing Checklist

- [ ] Create two projects with same task names
- [ ] Verify different task IDs
- [ ] Send message as employee in Project A
- [ ] Verify admin sees message in Project A
- [ ] Verify message does NOT appear in Project B
- [ ] Mark task complete as employee
- [ ] Verify admin sees completion message
- [ ] Approve task as admin
- [ ] Verify employee sees approval message
- [ ] Reopen task - verify chat history persists
