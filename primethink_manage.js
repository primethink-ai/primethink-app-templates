// PrimeThink Manage JavaScript Library
// This library provides wrappers for Obviously Manage API tools
// Requires primethink.js to be loaded first

(function() {
  'use strict';

  // Wait for pt to be available before initializing
  function waitForPt(maxWaitMs = 10000, intervalMs = 50) {
    return new Promise((resolve, reject) => {
      if (typeof window.pt !== 'undefined') {
        resolve();
        return;
      }
      const startTime = Date.now();
      const interval = setInterval(() => {
        if (typeof window.pt !== 'undefined') {
          clearInterval(interval);
          resolve();
        } else if (Date.now() - startTime >= maxWaitMs) {
          clearInterval(interval);
          reject(new Error('primethink_manage.js: timed out waiting for primethink.js (pt object not found)'));
        }
      }, intervalMs);
    });
  }

  function initialize() {
    // Initialize the ptManage object
    window.ptManage = {

    // ============================================================================
    // INTERNAL HELPER
    // ============================================================================

    /**
     * Internal helper to call a manage tool
     * @private
     */
    _callTool: async function(toolName, args = {}) {
      return await pt.callToolDirect(toolName, args);
    },

    // ============================================================================
    // CONFIGURATION
    // ============================================================================

    /**
     * Get the configured Obviously Manage base URL
     * @returns {Promise<object>} Object containing base_url
     *
     * @example
     * const result = await ptManage.getBaseUrl();
     * console.log(`Manage URL: ${result.base_url}`);
     */
    getBaseUrl: async function() {
      return await this._callTool('manage_get_base_url');
    },

    // ============================================================================
    // ORGANIZATION MANAGEMENT
    // ============================================================================

    /**
     * List all organizations the user has access to
     * @param {object} options - Pagination options
     * @param {number} options.page - Page number (default: 1)
     * @param {number} options.pageSize - Results per page (default: 10)
     * @returns {Promise<object>} Object containing organizations array
     *
     * @example
     * const result = await ptManage.listOrganizations();
     * result.organizations.forEach(org => {
     *   console.log(`${org.title} (${org.code}) - ID: ${org.id}`);
     * });
     */
    listOrganizations: async function(options = {}) {
      const args = {};
      if (options.page !== undefined) args.page = options.page;
      if (options.pageSize !== undefined) args.page_size = options.pageSize;
      return await this._callTool('manage_list_organizations', args);
    },

    /**
     * Set the primary (active) organization for the user
     * @param {number} organizationId - The ID of the organization to set as primary
     * @returns {Promise<object>} The updated organization info
     *
     * @example
     * const result = await ptManage.setPrimaryOrganization(13349);
     * console.log(`Now working in: ${result.title}`);
     */
    setPrimaryOrganization: async function(organizationId) {
      return await this._callTool('manage_set_primary_organization', {
        organization_id: organizationId
      });
    },

    /**
     * Get information about the user's current primary (active) organisation
     * @returns {Promise<object>} Object containing the primary organisation details
     *
     * @example
     * const result = await ptManage.getPrimaryOrganisationInfo();
     * console.log(`Current org: ${result.title} (ID: ${result.id})`);
     */
    getPrimaryOrganisationInfo: async function() {
      return await this._callTool('manage_get_primary_organisation_info');
    },

    // ============================================================================
    // MATTER SEARCH & DETAILS
    // ============================================================================

    /**
     * Search for matters by text query
     * @param {string} query - The search query string
     * @param {object} options - Search options
     * @param {number} options.page - Page number (default: 1)
     * @param {number} options.pageSize - Results per page (default: 10)
     * @param {boolean} options.returnImage - Include image70 field (default: false)
     * @returns {Promise<object>} Object containing matters array
     *
     * @example
     * const result = await ptManage.searchMatters('trademark ACME');
     * result.matters.forEach(matter => {
     *   console.log(`${matter.ref_no}: ${matter.title}`);
     * });
     */
    searchMatters: async function(query, options = {}) {
      return await this._callTool('manage_search_matters_by_text', {
        query: query,
        page: options.page || 1,
        page_size: options.pageSize || 10,
        return_image: options.returnImage || false
      });
    },

    /**
     * Search for a matter by its reference number
     * @param {string} matterRef - The matter reference (e.g., "2260/20003")
     * @param {boolean} returnImage - Include image70 field (default: false)
     * @returns {Promise<object>} Object containing matters array
     *
     * @example
     * const result = await ptManage.searchMatterByReference('2260/20003');
     * if (result.matters.length > 0) {
     *   const matter = result.matters[0];
     *   console.log(`Found: ${matter.title} (ID: ${matter.id})`);
     * }
     */
    searchMatterByReference: async function(matterRef, returnImage = false) {
      return await this._callTool('manage_search_matter_id_by_matter_reference', {
        matter_ref: matterRef,
        return_image: returnImage
      });
    },

    /**
     * Search for matters by a reference number (e.g., trademark number, patent number)
     * @param {string} number - The number to search for
     * @param {object} options - Search options
     * @param {string} options.referenceType - Type of reference number (default: '_unselected' for any).
     *   Common values: 'Application Number', 'Registration Number', 'Publication Number', 'Client Ref'
     * @param {number} options.page - Page number (default: 1)
     * @param {number} options.pageSize - Results per page (default: 10)
     * @param {string} options.ordering - Sort order (default: '-matter__id')
     * @returns {Promise<object>} Object containing matters array
     *
     * @example
     * const result = await ptManage.searchMattersByNumbers('12345', { referenceType: 'Registration Number' });
     * console.log(`Found ${result.matters?.length} matters`);
     */
    searchMattersByNumbers: async function(number, options = {}) {
      const args = { number: number };
      if (options.referenceType !== undefined) args.reference_type = options.referenceType;
      if (options.page !== undefined) args.page = options.page;
      if (options.pageSize !== undefined) args.page_size = options.pageSize;
      if (options.ordering !== undefined) args.ordering = options.ordering;
      return await this._callTool('manage_search_matters_by_numbers', args);
    },

    /**
     * Get detailed information about a specific matter
     * @param {number} matterId - The matter ID
     * @returns {Promise<object>} Object containing matter details
     *
     * @example
     * const result = await ptManage.getMatterDetails(73597);
     * console.log(`Matter: ${result.matter.title}`);
     * console.log(`Status: ${result.matter.status.value}`);
     * console.log(`Type: ${result.matter.type.value}`);
     */
    getMatterDetails: async function(matterId) {
      return await this._callTool('manage_get_matter_details', {
        matter_id: matterId
      });
    },

    /**
     * Get contact relations for a matter
     * @param {number} matterId - The matter ID
     * @returns {Promise<object>} Object containing contact relations
     *
     * @example
     * const result = await ptManage.getContactRelations(73597);
     * result.contact_relations.forEach(rel => {
     *   console.log(`${rel.relation}: ${rel.contact}`);
     * });
     */
    getContactRelations: async function(matterId) {
      return await this._callTool('manage_get_contact_relations', {
        matter_id: matterId
      });
    },

    /**
     * Search within a specific matter
     * @param {number} matterId - The matter ID
     * @param {string} query - The search query
     * @returns {Promise<object>} Search results within the matter
     *
     * @example
     * const result = await ptManage.searchInMatter(73597, 'invoice');
     * console.log(result);
     */
    searchInMatter: async function(matterId, query) {
      return await this._callTool('manage_search_in_matter', {
        matter_id: matterId,
        query: query
      });
    },

    // ============================================================================
    // MATTER FILES & DOCUMENTS
    // ============================================================================

    /**
     * List files in a matter
     * @param {number} matterId - The matter ID
     * @param {object} options - List options
     * @param {number} options.folderId - Optional folder ID to list
     * @param {number} options.page - Page number (default: 1)
     * @param {number} options.pageSize - Results per page (default: 20)
     * @returns {Promise<object>} Object containing files array
     *
     * @example
     * const result = await ptManage.listMatterFiles(73597);
     * result.files.forEach(file => {
     *   console.log(`${file.name} (${file.size} bytes)`);
     * });
     */
    listMatterFiles: async function(matterId, options = {}) {
      return await this._callTool('manage_list_matter_files', {
        matter_id: matterId,
        folder_id: options.folderId,
        page: options.page || 1,
        page_size: options.pageSize || 20
      });
    },

    /**
     * Upload an existing document from the system to a matter in Manage
     * @param {number} documentId - The PrimeThink document ID to upload
     * @param {number} matterId - The matter ID
     * @param {object} options - Upload options
     * @param {string} options.name - Custom name for the document in Manage (optional)
     * @param {number} options.parentId - Target folder ID in Manage (optional)
     * @returns {Promise<object>} Upload result
     *
     * @example
     * const result = await ptManage.uploadDocument(12345, 73597, { parentId: 456 });
     * console.log(`Uploaded: ${result.name}`);
     */
    uploadDocument: async function(documentId, matterId, options = {}) {
      return await this._callTool('manage_upload_document', {
        document_id: documentId,
        matter_id: matterId,
        name: options.name,
        parent_id: options.parentId
      });
    },

    /**
     * Create a new document in a matter by converting text content to a file format
     * @param {number} matterId - The matter ID
     * @param {string} name - Name of the document including extension (e.g., 'report.docx')
     * @param {string} content - The text content to convert into the document
     * @param {object} options - Creation options
     * @param {string} options.format - Document format: 'TXT', 'DOCX', 'PDF', 'MD', 'HTML' (default: 'DOCX')
     * @param {number} options.parentId - Target folder ID in Manage (optional)
     * @returns {Promise<object>} Created document info
     *
     * @example
     * const result = await ptManage.createDocument(73597, 'meeting_notes.docx',
     *   'Meeting notes from today...', { format: 'DOCX' });
     * console.log(`Created: ${result.name}`);
     */
    createDocument: async function(matterId, name, content, options = {}) {
      return await this._callTool('manage_create_document', {
        matter_id: matterId,
        name: name,
        content: content,
        format: options.format || 'DOCX',
        parent_id: options.parentId
      });
    },

    /**
     * Download a document from Manage
     * @param {number} documentId - The Manage document ID
     * @returns {Promise<object>} Download result with document info
     *
     * @example
     * const result = await ptManage.downloadDocument(789);
     * console.log(`Downloaded: ${result.file_name}`);
     */
    downloadDocument: async function(fileId) {
      return await this._callTool('manage_download_document', {
        file_id: fileId
      });
    },

    /**
     * Create a folder in a matter
     * @param {number} matterId - The matter ID
     * @param {string} folderName - Name of the folder to create
     * @param {number} parentFolderId - Optional parent folder ID
     * @returns {Promise<object>} Created folder info
     *
     * @example
     * const result = await ptManage.createFolder(73597, 'Correspondence');
     * console.log(`Created folder ID: ${result.folder_id}`);
     */
    createFolder: async function(matterId, folderName, parentFolderId = null) {
      return await this._callTool('manage_create_folder', {
        matter_id: matterId,
        name: folderName,
        parent_id: parentFolderId
      });
    },

    // ============================================================================
    // USER MANAGEMENT
    // ============================================================================

    /**
     * Get all users in a specific organization
     * @param {string} organizationUuid - Organization UUID or ID string (required)
     * @returns {Promise<object>} Object containing users array
     *
     * @example
     * const result = await ptManage.getAllUsers('org-uuid-123');
     * result.users.forEach(u => {
     *   console.log(`${u.user.full_name} (ID: ${u.user.id})`);
     * });
     */
    getAllUsers: async function(organizationUuid) {
      return await this._callTool('get_all_users_in_organisation', {
        organization_uuid: organizationUuid
      });
    },

    /**
     * Search for users by name within an organization
     * @param {string} organizationUuid - Organization UUID or ID string (required)
     * @param {string} query - The search query for user names (required)
     * @param {boolean} isInternal - Filter to internal users only (default: true)
     * @returns {Promise<Array>} Array of matching users
     *
     * @example
     * const users = await ptManage.searchUsers('org-uuid-123', 'John');
     * users.forEach(u => {
     *   console.log(`${u.user.full_name}`);
     * });
     */
    searchUsers: async function(organizationUuid, query, isInternal = true) {
      return await this._callTool('manage_search_users_in_organisation', {
        organization_uuid: organizationUuid,
        q: query,
        is_internal: isInternal
      });
    },

    // ============================================================================
    // TASKS & DEADLINES
    // ============================================================================

    /**
     * Get the current user's tasks
     * @param {string} startDate - Start date in YYYY-MM-DD format (required)
     * @param {string} endDate - End date in YYYY-MM-DD format (required)
     * @returns {Promise<Array>} Array of user's tasks
     *
     * @example
     * const tasks = await ptManage.getMyTasks('2026-03-01', '2026-03-31');
     * tasks.forEach(task => {
     *   console.log(`${task.title} - Due: ${task.due_date}`);
     * });
     */
    getMyTasks: async function(startDate, endDate) {
      return await this._callTool('manage_get_my_tasks', {
        start_date: startDate,
        end_date: endDate
      });
    },

    /**
     * Get all tasks in the organization
     * @param {string} startDate - Start date in YYYY-MM-DD format (required)
     * @param {string} endDate - End date in YYYY-MM-DD format (required)
     * @returns {Promise<object>} Object containing tasks array
     *
     * @example
     * const result = await ptManage.getAllTasks('2026-03-01', '2026-03-31');
     * console.log(`Total tasks: ${result.tasks.length}`);
     */
    getAllTasks: async function(startDate, endDate) {
      return await this._callTool('manage_get_all_tasks', {
        start_date: startDate,
        end_date: endDate
      });
    },

    /**
     * Create a new task
     * @param {object} taskData - Task details
     * @param {string} taskData.title - Task title (required)
     * @param {number} taskData.subMatter - Sub-matter ID where the task belongs (required)
     * @param {string} taskData.dueDate - Due date in YYYY-MM-DD format (required)
     * @param {string} taskData.assignorName - Name of the person assigning the task (required unless assignorMembershipId provided)
     * @param {string} taskData.assigneeName - Name of the person being assigned (required unless assigneeMembershipId provided)
     * @param {number} taskData.assignorMembershipId - Override assignor with specific membership ID
     * @param {number} taskData.assigneeMembershipId - Override assignee with specific membership ID
     * @param {string} taskData.type - Task type: 'Task', 'Info', 'Priority', 'Urgent' (default: 'Task')
     * @param {string} taskData.status - Task status: 'Not Started', 'In Progress', 'Completed', 'Deferred' (default: 'Not Started')
     * @param {string} taskData.text - Optional task description
     * @returns {Promise<object>} Created task info
     *
     * @example
     * const result = await ptManage.createTask({
     *   title: 'Review trademark application',
     *   subMatter: 73597,
     *   dueDate: '2026-03-01',
     *   assignorName: 'John Smith',
     *   assigneeName: 'Jane Doe',
     *   type: 'Task',
     *   text: 'Review and provide feedback'
     * });
     */
    createTask: async function(taskData) {
      const args = {
        title: taskData.title,
        sub_matter: taskData.subMatter,
        due_date: taskData.dueDate
      };
      if (taskData.assignorName !== undefined) args.assignor_name = taskData.assignorName;
      if (taskData.assigneeName !== undefined) args.assignee_name = taskData.assigneeName;
      if (taskData.assignorMembershipId !== undefined) args.assignor_membership_id = taskData.assignorMembershipId;
      if (taskData.assigneeMembershipId !== undefined) args.assignee_membership_id = taskData.assigneeMembershipId;
      if (taskData.type !== undefined) args.type = taskData.type;
      if (taskData.status !== undefined) args.status = taskData.status;
      if (taskData.text !== undefined) args.text = taskData.text;
      return await this._callTool('manage_create_task', args);
    },

    /**
     * Get the current user's deadlines
     * @param {string} startDate - Start date in YYYY-MM-DD format (required)
     * @param {string} endDate - End date in YYYY-MM-DD format (required)
     * @returns {Promise<Array>} Array of user's deadlines
     *
     * @example
     * const deadlines = await ptManage.getMyDeadlines('2026-03-01', '2026-03-31');
     * deadlines.forEach(d => {
     *   console.log(`${d.title} - ${d.date}`);
     * });
     */
    getMyDeadlines: async function(startDate, endDate) {
      return await this._callTool('manage_get_my_deadlines', {
        start_date: startDate,
        end_date: endDate
      });
    },

    /**
     * Get all deadlines in the organization
     * @param {string} startDate - Start date in YYYY-MM-DD format (required)
     * @param {string} endDate - End date in YYYY-MM-DD format (required)
     * @returns {Promise<object>} Object containing deadlines array
     *
     * @example
     * const result = await ptManage.getAllDeadlines('2026-03-01', '2026-03-31');
     * console.log(`Total deadlines: ${result.deadlines.length}`);
     */
    getAllDeadlines: async function(startDate, endDate) {
      return await this._callTool('manage_get_all_deadlines', {
        start_date: startDate,
        end_date: endDate
      });
    },

    // ============================================================================
    // TIMESHEET & BILLING
    // ============================================================================

    /**
     * Get timesheet entries
     * @param {object} options - Filter options
     * @param {string} options.startDateFrom - Start date from (YYYY-MM-DD), defaults to today
     * @param {string} options.startDateTo - Start date to (YYYY-MM-DD), defaults to today
     * @param {string} options.ordering - Sort order: '-start_time' (desc) or 'start_time' (asc)
     * @param {string} options.status - Filter by status: 'active' for active timers only
     * @returns {Promise<Array>} Array of timesheet entries
     *
     * @example
     * const entries = await ptManage.getTimesheetEntries({
     *   startDateFrom: '2026-01-01',
     *   startDateTo: '2026-01-31'
     * });
     */
    getTimesheetEntries: async function(options = {}) {
      const args = {};
      if (options.startDateFrom !== undefined) args.start_date_from = options.startDateFrom;
      if (options.startDateTo !== undefined) args.start_date_to = options.startDateTo;
      if (options.ordering !== undefined) args.ordering = options.ordering;
      if (options.status !== undefined) args.status = options.status;
      return await this._callTool('manage_get_timesheet_entries', args);
    },

    /**
     * Get charge categories
     * @param {object} options - Filter options
     * @param {boolean} options.onlyActive - Return only active categories (default: true)
     * @param {string} options.matterTypeId - Filter by matter type ID
     * @returns {Promise<object>} Object containing charge categories
     *
     * @example
     * const result = await ptManage.getChargeCategories();
     * result.categories.forEach(cat => {
     *   console.log(`${cat.name} (${cat.code})`);
     * });
     */
    getChargeCategories: async function(options = {}) {
      const args = {};
      if (options.onlyActive !== undefined) args.only_active = options.onlyActive;
      if (options.matterTypeId !== undefined) args.matter_type_id = options.matterTypeId;
      return await this._callTool('manage_get_charge_categories', args);
    },

    /**
     * Get dashboard data including billing, tasks, and calendar
     * @param {object} options - Dashboard options
     * @param {string} options.startDate - Start date in YYYY-MM-DD format (required)
     * @param {string} options.endDate - End date in YYYY-MM-DD format (required)
     * @param {string} [options.widgets] - Widget type filter
     * @param {boolean} [options.includeTasks=true] - Include tasks data
     * @param {boolean} [options.includeCalendar=true] - Include calendar data
     * @param {boolean} [options.includeDynamicData=true] - Include dynamic data
     * @param {boolean} [options.includeBillingData=true] - Include billing data
     * @param {number} [options.userId] - User ID to filter data
     * @returns {Promise<object>} Dashboard data
     *
     * @example
     * const result = await ptManage.getDashboardData({
     *   startDate: '2026-03-01',
     *   endDate: '2026-03-04'
     * });
     * console.log(`Tasks: ${result.tasks.length}`);
     */
    getDashboardData: async function(options = {}) {
      const args = {
        start_date: options.startDate,
        end_date: options.endDate
      };
      if (options.widgets !== undefined) args.widgets = options.widgets;
      if (options.includeTasks !== undefined) args.include_tasks = options.includeTasks;
      if (options.includeCalendar !== undefined) args.include_calendar = options.includeCalendar;
      if (options.includeDynamicData !== undefined) args.include_dynamic_data = options.includeDynamicData;
      if (options.includeBillingData !== undefined) args.include_billing_data = options.includeBillingData;
      if (options.userId !== undefined) args.user_id = options.userId;
      return await this._callTool('manage_get_dashboard_data', args);
    },

    // ============================================================================
    // TIMER MANAGEMENT
    // ============================================================================

    /**
     * Create an active timer
     * @param {object} timerData - Timer details
     * @param {number} timerData.matterId - Matter ID (required)
     * @param {string} timerData.description - Timer description (required)
     * @param {number} timerData.chargeCategory - Charge category ID (required)
     * @param {string} timerData.pastTime - Start time in the past (ISO datetime), if provided timer starts from this time
     * @returns {Promise<object>} Created timer info
     *
     * @example
     * const result = await ptManage.createTimer({
     *   matterId: 73597,
     *   description: 'Reviewing documents',
     *   chargeCategory: 1
     * });
     */
    createTimer: async function(timerData) {
      const args = {
        matter_id: timerData.matterId,
        description: timerData.description,
        charge_category: timerData.chargeCategory
      };
      if (timerData.pastTime !== undefined) args.past_time = timerData.pastTime;
      return await this._callTool('manage_create_active_timer', args);
    },

    /**
     * Get details of a specific time entry
     * @param {number} timeEntryId - ID of the time entry to retrieve (required)
     * @returns {Promise<object>} Time entry info
     *
     * @example
     * const timer = await ptManage.getTimer(12345);
     * console.log(`Timer: ${timer.description}`);
     */
    getTimer: async function(timeEntryId) {
      return await this._callTool('manage_get_timer', {
        time_entry_id: timeEntryId
      });
    },

    /**
     * Control an existing timer (start/stop/pause)
     * @param {string} operation - Timer operation: 'start_timer', 'pause_timer', or 'post_timer' (stop)
     * @param {number} timeEntryId - ID of the time entry to control (required)
     * @returns {Promise<object>} Timer control result
     *
     * @example
     * // Pause the timer
     * await ptManage.controlTimer('pause_timer', 12345);
     * // Stop/post the timer
     * await ptManage.controlTimer('post_timer', 12345);
     */
    controlTimer: async function(operation, timeEntryId) {
      return await this._callTool('manage_timer_control', {
        operation: operation,
        time_entry_id: timeEntryId
      });
    },

    /**
     * Edit an existing time entry
     * @param {object} timerData - Timer edit details
     * @param {number} timerData.timeEntryId - ID of the time entry to edit (required)
     * @param {string} timerData.description - New description (required)
     * @param {number} timerData.duration - Duration in seconds (required)
     * @param {number} timerData.matterId - Matter ID (required)
     * @param {number} timerData.membership - Membership ID (required)
     * @param {number} timerData.chargeCategory - Charge category ID (required)
     * @returns {Promise<object>} Updated time entry
     *
     * @example
     * const result = await ptManage.editTimer({
     *   timeEntryId: 12345,
     *   description: 'Updated description',
     *   duration: 3600,
     *   matterId: 73597,
     *   membership: 456,
     *   chargeCategory: 1
     * });
     */
    editTimer: async function(timerData) {
      return await this._callTool('manage_edit_timer', {
        time_entry_id: timerData.timeEntryId,
        description: timerData.description,
        duration: timerData.duration,
        matter_id: timerData.matterId,
        membership: timerData.membership,
        charge_category: timerData.chargeCategory
      });
    },

    /**
     * Log past work (create a time entry)
     * @param {object} workData - Work entry details
     * @param {number} workData.matterId - Matter ID (required)
     * @param {string} workData.description - Work description (required)
     * @param {number} workData.chargeCategory - Charge category ID (required)
     * @param {string} workData.pastTime - Start time for the entry (ISO datetime, required)
     * @param {number} workData.durationInMinutes - Duration in minutes (required)
     * @returns {Promise<object>} Created time entry
     *
     * @example
     * const result = await ptManage.logPastWork({
     *   matterId: 73597,
     *   description: 'Document review',
     *   chargeCategory: 1,
     *   pastTime: '2026-02-01T09:00:00',
     *   durationInMinutes: 60
     * });
     */
    logPastWork: async function(workData) {
      return await this._callTool('manage_log_post_past_work', {
        matter_id: workData.matterId,
        description: workData.description,
        charge_category: workData.chargeCategory,
        past_time: workData.pastTime,
        duration_in_minutes: workData.durationInMinutes
      });
    },

    // ============================================================================
    // MATTER CREATION
    // ============================================================================

    /**
     * Get all matter types and sub-types
     * @returns {Promise<object>} Matter types hierarchy
     *
     * @example
     * const result = await ptManage.getAllMatterTypes();
     * result.matter_types.forEach(type => {
     *   console.log(`${type.title} (${type.code})`);
     * });
     */
    getAllMatterTypes: async function() {
      return await this._callTool('manage_get_all_matter_types_and_sub_types_context');
    },

    /**
     * Get context for creating a matter of a specific type
     * @param {number} matterType - The matter type ID (required)
     * @returns {Promise<object>} Matter creation context with team relations, default contact, etc.
     *
     * @example
     * const context = await ptManage.getCreateMatterContext(40);
     * console.log('Team relations:', context.in_house_department_team_relations);
     */
    getCreateMatterContext: async function(matterType) {
      return await this._callTool('manage_get_create_matter_context_by_matter_type', {
        matter_type: matterType
      });
    },

    /**
     * Get all clients
     * @param {object} options - Search and pagination options
     * @param {string} options.searchByFullName - Optional search term to filter by full name
     * @param {number} options.page - Page number (default: 1)
     * @param {number} options.pageSize - Results per page (default: 50)
     * @returns {Promise<object>} Object containing clients array
     *
     * @example
     * const result = await ptManage.getAllClients({ searchByFullName: 'Acme' });
     * result.clients.forEach(client => {
     *   console.log(`${client.name} (ID: ${client.id})`);
     * });
     */
    getAllClients: async function(options = {}) {
      const args = {};
      if (options.searchByFullName !== undefined) args.search_by_full_name = options.searchByFullName;
      if (options.page !== undefined) args.page = options.page;
      if (options.pageSize !== undefined) args.page_size = options.pageSize;
      return await this._callTool('manage_get_all_clients', args);
    },

    /**
     * Create a new matter
     * @param {object} matterData - Matter details (varies by matter type)
     * @returns {Promise<object>} Created matter info
     *
     * @example
     * const result = await ptManage.createMatter({
     *   matter_type_id: 40,
     *   sub_type_id: 202,
     *   title: 'New Trademark Application',
     *   client_id: 12345,
     *   // ... additional fields based on matter type
     * });
     */
    createMatter: async function(matterData) {
      return await this._callTool('manage_create_matter', matterData);
    },

    // ============================================================================
    // MESSAGES & NOTIFICATIONS
    // ============================================================================

    /**
     * Get count of unread messages
     * @returns {Promise<object>} Object with unread count
     *
     * @example
     * const result = await ptManage.getUnreadMessagesCount();
     * console.log(`Unread messages: ${result.count}`);
     */
    getUnreadMessagesCount: async function() {
      return await this._callTool('manage_get_unread_messages_count');
    },

    // ============================================================================
    // REPORTS
    // ============================================================================

    /**
     * List available reports/saved searches
     * @param {object} options - Filter options
     * @param {string} options.filterType - Filter by type: 'public', 'private', or 'all' (default: 'all')
     * @returns {Promise<object>} Object containing reports array
     *
     * @example
     * const result = await ptManage.listReports({ filterType: 'public' });
     * result.reports.forEach(report => {
     *   console.log(`${report.name}`);
     * });
     */
    listReports: async function(options = {}) {
      const args = {};
      if (options.filterType !== undefined) args.filter_type = options.filterType;
      return await this._callTool('manage_list_reports', args);
    },

    // ============================================================================
    // SEARCH & TABLES
    // ============================================================================

    /**
     * Get search context for advanced searches
     * @param {string} app - Application name (e.g., 'legal') (required)
     * @param {string} entity - Entity name (e.g., 'sub_matters') (required)
     * @param {string} module - Translation module name (optional, defaults to '{app}_{entity}')
     * @returns {Promise<object>} Search context with sorts, columns, presets, and filters
     *
     * @example
     * const context = await ptManage.getSearchContext('legal', 'sub_matters');
     * console.log('Available filters:', context.filters);
     * console.log('Available columns:', context.columns);
     */
    getSearchContext: async function(app, entity, module = null) {
      const args = {
        app: app,
        entity: entity
      };
      if (module !== null) args.module = module;
      return await this._callTool('manage_get_search_context', args);
    },

    /**
     * Get filter options for a specific filter field
     * @param {string} app - Application name (e.g., 'legal') (required)
     * @param {string} entity - Entity name (e.g., 'sub_matters') (required)
     * @param {string} filterName - The filter's name field from getSearchContext (required, only for Selection type filters)
     * @returns {Promise<object>} Available options for the filter
     *
     * @example
     * const options = await ptManage.getFilterOptions('legal', 'sub_matters', 'status');
     * console.log('Status options:', options);
     */
    getFilterOptions: async function(app, entity, filterName) {
      return await this._callTool('manage_get_filter_options', {
        app: app,
        entity: entity,
        filter_name: filterName
      });
    },

    /**
     * Search a table/module with filters
     * @param {string} app - Application name (e.g., 'legal') (required)
     * @param {string} entity - Entity name (e.g., 'sub_matters') (required)
     * @param {object} options - Search options
     * @param {string} options.query - Search query using query syntax (e.g., '(status="1") AND (territory="UK")')
     * @param {string[]} options.columns - List of column names to return
     * @param {string} options.sort - Sort field name from available sorts
     * @param {string} options.sortDirection - Sort direction: 'asc' or 'desc' (default: 'asc')
     * @param {number} options.page - Page number, 0-indexed (default: 0)
     * @param {number} options.size - Results per page, 1-100 (default: 20)
     * @param {number} options.presetId - Load a saved preset by ID (overrides query/columns/sort)
     * @returns {Promise<object>} Search results
     *
     * @example
     * const result = await ptManage.searchTable('legal', 'sub_matters', {
     *   query: '(status="1")',
     *   sort: 'ref_no',
     *   sortDirection: 'desc',
     *   page: 0,
     *   size: 20
     * });
     */
    searchTable: async function(app, entity, options = {}) {
      const args = {
        app: app,
        entity: entity
      };
      if (options.query !== undefined) args.query = options.query;
      if (options.columns !== undefined) args.columns = options.columns;
      if (options.sort !== undefined) args.sort = options.sort;
      if (options.sortDirection !== undefined) args.sort_direction = options.sortDirection;
      if (options.page !== undefined) args.page = options.page;
      if (options.size !== undefined) args.size = options.size;
      if (options.presetId !== undefined) args.preset_id = options.presetId;
      return await this._callTool('manage_search_table', args);
    }
  };

    console.log('PrimeThink Manage library loaded');
  }

  // Automatically wait for pt and initialize
  window.ptManageReady = waitForPt().then(() => {
    initialize();
  }).catch((err) => {
    console.error(err.message);
  });
})();
