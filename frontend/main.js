const { createApp } = Vue;

const FIELD_GROUPS = [
  {
    title: "Basic Info",
    fields: [
      { key: "display_name", label: "Display Name" },
      { key: "flow_id", label: "Flow ID (optional)" },
      { key: "data_source", label: "Data Source", type: "select", options: ["manual", "nmos", "rds"] },
      { key: "note", label: "Notes", type: "textarea" }
    ]
  },
  {
    title: "ST2022-7 Path A",
    fields: [
      { key: "source_addr_a", label: "Source Address A" },
      { key: "source_port_a", label: "Source Port A", type: "number" },
      { key: "multicast_addr_a", label: "Multicast Address A" },
      { key: "group_port_a", label: "Group Port A", type: "number" }
    ]
  },
  {
    title: "ST2022-7 Path B",
    fields: [
      { key: "source_addr_b", label: "Source Address B" },
      { key: "source_port_b", label: "Source Port B", type: "number" },
      { key: "multicast_addr_b", label: "Multicast Address B" },
      { key: "group_port_b", label: "Group Port B", type: "number" }
    ]
  },
  {
    title: "NMOS Metadata",
    fields: [
      { key: "transport_protocol", label: "Transport Protocol" },
      { key: "nmos_node_id", label: "NMOS Node ID" },
      { key: "nmos_node_label", label: "NMOS Node Label" },
      { key: "nmos_node_description", label: "NMOS Node Description" },
      { key: "nmos_flow_id", label: "NMOS Flow ID" },
      { key: "nmos_sender_id", label: "NMOS Sender ID" },
      { key: "nmos_device_id", label: "NMOS Device ID" },
      { key: "nmos_is04_host", label: "NMOS IS-04 Host" },
      { key: "nmos_is04_port", label: "NMOS IS-04 Port", type: "number" },
      { key: "nmos_is04_base_url", label: "NMOS IS-04 Base URL" },
      { key: "nmos_is05_host", label: "NMOS IS-05 Host" },
      { key: "nmos_is05_port", label: "NMOS IS-05 Port", type: "number" },
      { key: "nmos_is05_base_url", label: "NMOS IS-05 Base URL" },
      { key: "nmos_is04_version", label: "NMOS IS-04 Version" },
      { key: "nmos_is05_version", label: "NMOS IS-05 Version" },
      { key: "nmos_label", label: "NMOS Label" },
      { key: "nmos_description", label: "NMOS Description" }
    ]
  },
  {
    title: "SDP / Labels",
    fields: [
      { key: "sdp_url", label: "SDP URL" },
      { key: "sdp_cache", label: "SDP Cache", type: "textarea" }
    ]
  },
  {
    title: "Media Info",
    fields: [
      { key: "media_type", label: "Media Type" },
      { key: "st2110_format", label: "ST2110 Format" },
      { key: "redundancy_group", label: "Redundancy Group" },
      { key: "management_url", label: "Management URL" }
    ]
  },
  {
    title: "Aliases",
    fields: Array.from({ length: 8 }).map((_, idx) => ({
      key: `alias${idx + 1}`,
      label: `Alias ${idx + 1}`
    }))
  },
  {
    title: "Status / Availability",
    fields: [
      { key: "flow_status", label: "Flow Status", type: "select", options: ["active", "unused", "maintenance"] },
      { key: "availability", label: "Availability", type: "select", options: ["available", "lost", "maintenance"] },
      { key: "last_seen", label: "Last Seen (ISO8601)" }
    ]
  },
  {
    title: "External References",
    fields: [
      { key: "rds_address", label: "RDS Address" },
      { key: "rds_api_url", label: "RDS API URL" },
      { key: "rds_version", label: "RDS Version" }
    ]
  },
  {
    title: "User-defined Fields",
    fields: Array.from({ length: 8 }).map((_, idx) => ({
      key: `user_field${idx + 1}`,
      label: `User Field ${idx + 1}`
    }))
  }
];

const NUMBER_FIELDS = new Set([
  "source_port_a",
  "source_port_b",
  "group_port_a",
  "group_port_b",
  "nmos_is04_port",
  "nmos_is05_port"
]);

const SORT_FIELDS = [
  { value: "updated_at", label: "Updated" },
  { value: "created_at", label: "Created" },
  { value: "display_name", label: "Display Name" },
  { value: "flow_status", label: "Status" },
  { value: "multicast_addr_a", label: "Multicast A" },
  { value: "source_addr_a", label: "Source A" }
];

const FLOW_STATUS_OPTIONS = ["active", "unused", "maintenance"];
const AVAILABILITY_OPTIONS = ["available", "lost", "maintenance"];

const DEFAULT_FLOW = () => ({
  flow_id: "",
  display_name: "",
  source_addr_a: "",
  source_port_a: null,
  multicast_addr_a: "",
  group_port_a: null,
  source_addr_b: "",
  source_port_b: null,
  multicast_addr_b: "",
  group_port_b: null,
  transport_protocol: "RTP/UDP",
  nmos_node_id: "",
  nmos_flow_id: "",
  nmos_sender_id: "",
  nmos_device_id: "",
  nmos_node_label: "",
  nmos_node_description: "",
  nmos_is04_host: "",
  nmos_is04_port: null,
  nmos_is04_base_url: "",
  nmos_is05_host: "",
  nmos_is05_port: null,
  nmos_is05_base_url: "",
  nmos_is04_version: "",
  nmos_is05_version: "",
  sdp_url: "",
  sdp_cache: "",
  nmos_label: "",
  nmos_description: "",
  management_url: "",
  media_type: "",
  st2110_format: "",
  redundancy_group: "",
  alias1: "",
  alias2: "",
  alias3: "",
  alias4: "",
  alias5: "",
  alias6: "",
  alias7: "",
  alias8: "",
  flow_status: "active",
  availability: "available",
  last_seen: "",
  data_source: "manual",
  rds_address: "",
  rds_api_url: "",
  rds_version: "",
  user_field1: "",
  user_field2: "",
  user_field3: "",
  user_field4: "",
  user_field5: "",
  user_field6: "",
  user_field7: "",
  user_field8: "",
  note: "",
  locked: false
});

const DEFAULT_QUICK_SEARCH = () => ({
  term: "",
  limit: 50
});

const DEFAULT_ADVANCED_SEARCH = () => ({
  limit: 50,
  include_unused: false,
  display_name: "",
  flow_id: "",
  source_addr_a: "",
  source_addr_b: "",
  multicast_addr_a: "",
  multicast_addr_b: "",
  transport_protocol: "",
  alias1: "",
  nmos_node_id: "",
  nmos_node_label: "",
  nmos_node_description: "",
  flow_status: "",
  availability: "",
  source_port_a_min: null,
  source_port_a_max: null,
  source_port_b_min: null,
  source_port_b_max: null,
  group_port_a_min: null,
  group_port_a_max: null,
  group_port_b_min: null,
  group_port_b_max: null,
  nmos_is04_port_min: null,
  nmos_is04_port_max: null,
  nmos_is05_port_min: null,
  nmos_is05_port_max: null,
  updated_at_min: "",
  updated_at_max: "",
  created_at_min: "",
  created_at_max: ""
});

const PLANNER_GRID_COLUMNS = 64;
const SUBNET_24_SIZE = 256;
const EASY_VIEW_MAX_TOTAL = 4096;
const EASY_VIEW_HISTORY_LIMIT = 6;

const STATE_FREE = "FREE";
const STATE_USED = "USED";
const STATE_RESERVED = "RESERVED";

createApp({
  data() {
    return {
      baseUrl: "",
      mqttWsOverride: "",
      token: null,
      currentUser: null,
      currentView: "dashboard",
      views: ["dashboard", "flows", "search", "newFlow", "wizard", "planner", "checker", "users", "settings"],
      loginForm: {
        username: "",
        password: ""
      },
      flows: [],
      users: [],
      settings: {},
      summary: {
        total: 0,
        active: 0
      },
      filters: {
        limit: 20,
        offset: 0,
        sort_by: "updated_at",
        sort_order: "desc"
      },
      pageInput: "1",
      sortFields: SORT_FIELDS,
      flowStatusOptions: FLOW_STATUS_OPTIONS,
      availabilityOptions: AVAILABILITY_OPTIONS,
      quickSearch: DEFAULT_QUICK_SEARCH(),
      advancedSearch: DEFAULT_ADVANCED_SEARCH(),
      advancedCollapsed: false,
      searchMode: null,
      searchResults: [],
      newFlow: DEFAULT_FLOW(),
      editingFlowId: null,
      editingOriginalFlow: null,
      lockToggleAllowed: false,
      lockToggleLoading: false,
      notification: null,
      summaryRefreshTimer: null,
      realtime: {
        enabled: false,
        wsUrl: "",
        topic: "",
        topicAll: "",
        topicFlowPrefix: "",
        username: "",
        password: "",
        clientIdPrefix: "mmam-ui",
        client: null,
        connected: false
      },
      realtimeFeed: [],
      importFile: null,
      importingFlows: false,
      checkerTabs: [
        { key: "collisions", label: "Collision Check" },
        { key: "nmos", label: "NMOS Check" }
      ],
      currentCheckerTab: "collisions",
      checkerLoading: false,
      checkerResults: {
        collisions: null,
        nmos: null
      },
      // Automation
      automationJobs: [],
      automationSummary: null,
      collisionJob: {
        job_id: 'collision_check',
        enabled: false,
        schedule_type: 'interval',
        schedule_value: '1800',
        last_run_at: null,
        last_run_status: null,
        last_run_result: null,
        next_run_time: null
      },
      nmosJob: {
        job_id: 'nmos_check',
        enabled: false,
        schedule_type: 'interval',
        schedule_value: '3600',
        last_run_at: null,
        last_run_status: null,
        last_run_result: null,
        next_run_time: null
      },
      collisionIntervalValue: 30,
      collisionIntervalUnit: '60',
      nmosIntervalValue: 60,
      nmosIntervalUnit: '60',
      editingCollisionSchedule: false,
      editingNmosSchedule: false,
      newUser: {
        username: "",
        password: "",
        role: "viewer"
      },
      updateUser: {
        username: "",
        password: "",
        role: ""
      },
      newSettingKey: "",
      newSettingValue: "",
      hardDeleteFlowId: "",
      detailFlow: null,
      detailEntries: [],
      logs: [],
      logViewer: {
        api: [],
        audit: [],
        loading: false
      },
      fieldGroups: FIELD_GROUPS,
      wizard: {
        useRDS: false,
        rdsBaseUrl: "",
        rdsVersion: "v1.3",
        rdsVersions: ["v1.3", "v1.2", "v1.1", "v1.0"],
        fetchingRDS: false,
        rdsNodesModal: {
          visible: false,
          nodes: [],
          selected: null
        },
        is04BaseUrl: "",
        is05BaseUrl: "",
        is04Version: "v1.3",
        is05Version: "v1.1",
        is04Versions: ["v1.3", "v1.2", "v1.1", "v1.0"],
        is05Versions: ["v1.1", "v1.0"],
        flows: [],
        node: null,
        loading: false,
        importing: false,
        error: "",
        selections: {},
        detectingIS05: false,
        is05DetectionModal: {
          visible: false,
          options: [],
          selected: null
        }
      },
      nmos: {
        checking: false,
        applying: false,
        error: "",
        targetFlowId: null,
        result: null,
        applyVisible: false,
        applySelections: []
      },
      planner: {
        drives: [],
        selectedDriveId: null,
        folderNodes: {},
        expandedFolders: {},
        selectedFolderId: null,
        selectedView: null,
        filesLoading: false,
        detailCells: [],
        hoverInfo: null,
        hoverTooltip: {
          visible: false,
          x: 0,
          y: 0
        },
        gauss: null,
        map: null,
        usedLookup: {},
        centerIndex: 0,
        searchSize: 8,
        centerAddressInput: "",
        isLoading: false,
        error: "",
        tab: "view",
        selectedCell: null,
        selectedCellIndex: null,
        selectedContext: null,
        easyView: {
          mode: "cidr",
          cidr: "",
          start_ip: "",
          end_ip: "",
          error: "",
          history: [],
          map: null,
          detailCells: [],
          usedLookup: {},
          activeLabel: "",
          loading: false
        },
        parentForm: {
          parent_id: null,
          mode: "cidr",
          cidr: "",
          start_ip: "",
          end_ip: "",
          description: "",
          memo: "",
          color: ""
        },
        childForm: {
          parent_id: null,
          mode: "cidr",
          cidr: "",
          start_ip: "",
          end_ip: "",
          description: "",
          memo: "",
          color: "",
          is_reserved: false
        },
        bucketFormError: "",
        bucketSaving: false,
        backup: {
          exporting: false,
          importing: false,
          file: null,
          message: ""
        },
        manageFolderEditing: false,
        manageFolderForm: {
          description: "",
          memo: "",
          color: ""
        },
        allFoldersCache: [],
        manageViewEditingId: null,
        manageViewForm: {
          description: "",
          memo: "",
          color: "",
          is_reserved: false
        }
      }
    };
  },
  mounted() {
    this.loadBaseUrl();
    this.initializeViewFromHash();
    window.addEventListener("popstate", this.handlePopState);
    const reloadToken = sessionStorage.getItem("mmam_reload_token");
    if (reloadToken) {
      this.token = reloadToken;
      sessionStorage.removeItem("mmam_reload_token");
    }
    if (this.token) {
      this.fetchMe();
    }
    this.loadMqttOverride();
    this.refreshFlows();
    this.fetchRealtimeConfig();
    this.loadAutomationJobs();
    this.loadAutomationSummary();
  },
  beforeUnmount() {
    window.removeEventListener("popstate", this.handlePopState);
    this.teardownRealtime();
    if (this.summaryRefreshTimer) {
      clearTimeout(this.summaryRefreshTimer);
      this.summaryRefreshTimer = null;
    }
  },
  computed: {
    normalizedLimit() {
      const limit = Number(this.filters.limit);
      if (!Number.isFinite(limit) || limit < 1) {
        return 20;
      }
      return Math.min(500, Math.floor(limit));
    },
    currentPageNumber() {
      return Math.floor(this.filters.offset / this.normalizedLimit) + 1;
    },
    canGoPrevious() {
      return this.filters.offset > 0;
    },
    canGoNext() {
      return this.flows.length === this.normalizedLimit;
    },
    wizardSelectedCount() {
      return Object.values(this.wizard.selections).filter(Boolean).length;
    },
    wizardAllSelected() {
      return (
        this.wizard.flows.length > 0 &&
        this.wizard.flows.every(flow => this.isWizardFlowSelected(flow.nmos_flow_id))
      );
    },
    wizardIndeterminate() {
      const selected = this.wizardSelectedCount;
      return selected > 0 && selected < this.wizard.flows.length;
    },
    plannerFolderBreadcrumb() {
      const segments = [];
      const drive = this.planner.selectedDriveId
        ? this.planner.drives.find(d => d.id === this.planner.selectedDriveId)
        : null;
      if (drive) {
        segments.push(drive.description || `${drive.start_ip} /8`);
      }
      let node = this.currentFolderNode;
      if (node && (!drive || node.id !== drive.id)) {
        segments.push(node.description || `${node.start_ip} – ${node.end_ip}`);
      }
      return segments.join(" / ");
    },
    currentFolderNode() {
      if (!this.planner.selectedFolderId) return null;
      return this.planner.folderNodes[this.planner.selectedFolderId] || null;
    },
    currentFolderFiles() {
      const folderId = this.planner.selectedFolderId;
      if (!folderId) return [];
      const node = this.planner.folderNodes[folderId];
      if (!node || !node.children) return [];
      return node.children.filter(child => child.kind === "child");
    },
    currentFolderLabel() {
      const node = this.currentFolderNode;
      if (!node) {
        const drive = this.planner.drives.find(d => d.id === this.planner.selectedDriveId);
        return drive ? this.driveLabel(drive) : "Select a drive";
      }
      return node.description || (node.start_ip && node.end_ip ? `${node.start_ip} – ${node.end_ip}` : "Folder");
    },
    manageParentTargetLabel() {
      return this.currentFolderLabel;
    },
    manageChildTargetLabel() {
      const node = this.currentFolderNode;
      if (node && node.kind === "parent") {
        return node.description || `${node.start_ip} – ${node.end_ip}`;
      }
      return "Select a parent folder";
    },
    canCreateChildView() {
      const node = this.currentFolderNode;
      return Boolean(node && node.kind === "parent");
    },
    selectedFolderIsTier0() {
      const node = this.currentFolderNode;
      return Boolean(node && node.kind === "tier0");
    },
    selectedFolderCanEdit() {
      return Boolean(this.currentFolderNode && !this.selectedFolderIsTier0);
    },
    selectedFolderCanDelete() {
      return this.selectedFolderCanEdit;
    },
    currentParentFolderLabel() {
      const currentNode = this.currentFolderNode;
      if (!currentNode || !currentNode.parent_id) return "";
      if (!this.planner.allFoldersCache || this.planner.allFoldersCache.length === 0) {
        const parentNode = this.planner.folderNodes[currentNode.parent_id];
        if (parentNode) {
          return parentNode.description || parentNode.cidr || `${parentNode.start_ip} - ${parentNode.end_ip}`;
        }
        return "";
      }
      const parentFolder = this.planner.allFoldersCache.find(f => f.id === currentNode.parent_id);
      if (parentFolder) {
        return parentFolder.description || parentFolder.cidr || `${parentFolder.start_ip} - ${parentFolder.end_ip}`;
      }
      return "";
    },
    selectableParentFolders() {
      const result = [];
      const currentNode = this.currentFolderNode;
      if (!currentNode || currentNode.kind !== "parent") return result;
      if (!this.planner.allFoldersCache || this.planner.allFoldersCache.length === 0) return result;

      const currentNodeChildren = new Set();
      const collectDescendants = (folderId) => {
        currentNodeChildren.add(folderId);
        const children = this.planner.allFoldersCache.filter(f => f.parent_id === folderId);
        children.forEach(child => collectDescendants(child.id));
      };
      collectDescendants(currentNode.id);

      this.planner.allFoldersCache.forEach(folder => {
        if ((folder.kind === "tier0" || folder.kind === "parent") &&
            folder.id !== currentNode.id &&
            !currentNodeChildren.has(folder.id)) {
          result.push(folder);
        }
      });

      return result;
    },
    currentEditingView() {
      if (!this.planner.manageViewEditingId) return null;
      return this.currentFolderFiles.find(v => v.id === this.planner.manageViewEditingId);
    },
    currentViewParentFolderLabel() {
      const view = this.currentEditingView;
      if (!view || !view.parent_id) return "";
      if (!this.planner.allFoldersCache || this.planner.allFoldersCache.length === 0) {
        const parentNode = this.planner.folderNodes[view.parent_id];
        if (parentNode) {
          return parentNode.description || parentNode.cidr || `${parentNode.start_ip} - ${parentNode.end_ip}`;
        }
        return "";
      }
      const parentFolder = this.planner.allFoldersCache.find(f => f.id === view.parent_id);
      if (parentFolder) {
        return parentFolder.description || parentFolder.cidr || `${parentFolder.start_ip} - ${parentFolder.end_ip}`;
      }
      return "";
    },
    selectableParentFoldersForView() {
      const result = [];
      const view = this.currentEditingView;
      if (!view) return result;
      if (!this.planner.allFoldersCache || this.planner.allFoldersCache.length === 0) return result;

      this.planner.allFoldersCache.forEach(folder => {
        if (folder.kind === "parent" && folder.id !== view.parent_id) {
          result.push(folder);
        }
      });

      return result;
    },
    plannerFolderTree() {
      const rows = [];
      const traverse = (folderId, level = 0) => {
        const node = this.planner.folderNodes[folderId];
        if (!node || !node.children) return;
        node.children
          .filter(child => child.kind !== "child")
          .forEach(child => {
            rows.push({ node: child, level });
            if (this.planner.expandedFolders[child.id]) {
              traverse(child.id, level + 1);
            }
          });
      };
      if (this.planner.selectedDriveId) {
        traverse(this.planner.selectedDriveId, 0);
      }
      return rows;
    },
    plannerGridColumns() {
      return this.gridColumnsForMap(this.planner.map);
    },
    plannerDetailRows() {
      return this.buildPlannerRowsForContext("explorer");
    },
    easyViewDetailRows() {
      return this.buildPlannerRowsForContext("easy");
    },
    easyViewRangeSummary() {
      const map = this.planner.easyView.map;
      if (!map || !map.scope) return null;
      const total = Number(map.scope.total) || 0;
      let label = this.planner.easyView.activeLabel || "";
      if (!label && map.scope.start_address && map.scope.end_address) {
        label = `${map.scope.start_address} – ${map.scope.end_address}`;
      }
      if (!label && Number.isFinite(map.scope.start_int)) {
        const startInt = map.scope.start_int;
        const endInt = startInt + Math.max(0, total - 1);
        label = `${this.intToIp(startInt)} – ${this.intToIp(endInt)}`;
      }
      return {
        total,
        label
      };
    },
    plannerParentSelectOptions() {
      const options = [];
      const driveId = this.planner.selectedDriveId;
      if (driveId && this.planner.folderNodes[driveId]) {
        const drive = this.planner.folderNodes[driveId];
        options.push({
          id: driveId,
          label: drive.description || `${drive.start_ip} /8`
        });
      }
      Object.values(this.planner.folderNodes)
        .filter(node => node && node.kind === "parent")
        .forEach(node => {
          options.push({
            id: node.id,
            label: node.description || `${node.start_ip} – ${node.end_ip}`
          });
        });
      return options;
    },
    plannerChildParentOptions() {
      return Object.values(this.planner.folderNodes).filter(node => node && node.kind === "parent");
    },
    canEditAutomation() {
      return this.currentUser && this.currentUser.role === 'admin';
    }
  },
  watch: {
    currentView(newView) {
      if (newView === "planner") {
        this.ensurePlannerDrives();
      }
    },
    "planner.searchSize"(value) {
      const numeric = Number(value) || 1;
      const clamped = Math.min(255, Math.max(1, Math.floor(numeric)));
      if (clamped !== value) {
        this.planner.searchSize = clamped;
      } else if (this.planner.hoverInfo) {
        this.handlePlannerHover({ index: this.planner.hoverInfo.index }, { silent: true });
      }
    },
    "planner.selectedFolderId"() {
      this.resetManageForms();
      this.syncManageTargets();
    }
  },
  methods: {
    formatTimestamp(value) {
      if (!value) {
        return "N/A";
      }
      try {
        let timestamp = value;
        if (typeof value === "string" && !/(Z|z|[+-]\d{2}:?\d{2})$/.test(value)) {
          timestamp = `${value}Z`;
        }
        const date = new Date(timestamp);
        if (Number.isNaN(date.getTime())) {
          throw new Error("Invalid date");
        }
        return date.toLocaleString();
      } catch {
        return value || "N/A";
      }
    },
    canAccessChecker() {
      return Boolean(
        this.token &&
        this.currentUser &&
        (this.currentUser.role === "editor" || this.currentUser.role === "admin")
      );
    },
    resetCheckerResults() {
      this.checkerResults = {
        collisions: null,
        nmos: null
      };
    },
    initializeViewFromHash() {
      const hashView = window.location.hash.replace("#", "");
      const initialView = this.views.includes(hashView) ? hashView : this.currentView;
      this.setView(initialView, { replaceHistory: true, force: true });
    },
    handlePopState(event) {
      const stateView = event.state && event.state.view;
      const hashView = window.location.hash.replace("#", "");
      const target = this.views.includes(stateView) ? stateView : hashView;
      this.setView(target, { skipHistory: true, force: true });
    },
    setView(view, options = {}) {
      const { replaceHistory = false, skipHistory = false, force = false } = options;
      const validView = this.views.includes(view) ? view : "dashboard";
      const changed = this.currentView !== validView || force;
      if (changed) {
        this.currentView = validView;
      }
      if (
        changed &&
        validView === "settings" &&
        this.currentUser &&
        this.currentUser.role === "admin"
      ) {
        this.refreshAllLogs();
      }
      if (changed && validView === "checker" && this.canAccessChecker()) {
        this.fetchLatestCheckerResults();
      }
      if (changed && validView === "newFlow" && !this.editingFlowId) {
        this.resetFlowForm();
      }
      if (!skipHistory) {
        const method = replaceHistory ? "replaceState" : (changed ? "pushState" : null);
        if (method && typeof history !== "undefined") {
          history[method]({ view: validView }, "", `#${validView}`);
        }
      }
      return validView;
    },
    navigate(view) {
      this.setView(view);
    },
    log(message) {
      const stamp = new Date().toISOString();
      this.logs.unshift(`[${stamp}] ${message}`);
      if (this.logs.length > 200) this.logs.pop();
    },
    notify(message, type = "success", duration = 2000) {
      this.notification = { message, type };
      if (this._toastTimer) {
        clearTimeout(this._toastTimer);
      }
      this._toastTimer = setTimeout(() => {
        this.notification = null;
        this._toastTimer = null;
      }, duration);
    },
    isNmosDiff(fieldKey, flowId) {
      if (!fieldKey || !flowId) return false;
      if (!this.nmos.result || this.nmos.result.flow_id !== flowId) return false;
      return Boolean(this.nmos.result.differences && this.nmos.result.differences[fieldKey]);
    },
    nmosDiffValue(fieldKey) {
      if (!this.nmos.result || !this.nmos.result.differences) return null;
      return this.nmos.result.differences[fieldKey] || null;
    },
    nmosDiffSummary(flowId) {
      if (!this.nmos.result || this.nmos.result.flow_id !== flowId) return 0;
      return Object.keys(this.nmos.result.differences || {}).length;
    },
    canApplyNmos(flowId) {
      return Boolean(this.nmos.result && this.nmos.result.flow_id === flowId);
    },
    async checkNmos(flowId) {
      if (!flowId) {
        this.log("Flow ID is required for NMOS check");
        return;
      }
      this.nmos.checking = true;
      this.nmos.error = "";
      this.nmos.targetFlowId = flowId;
      try {
        const resp = await fetch(`${this.baseUrl}/api/flows/${flowId}/nmos/check`, {
          headers: this.authHeaders()
        });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(`Failed to check NMOS: ${resp.status} ${text}`);
        }
        const data = await resp.json();
        this.nmos.result = data;
        this.nmos.applySelections = Object.keys(data.differences || {});
        this.log(`NMOS check completed (${this.nmos.applySelections.length} differences)`);
        this.notify("NMOS check completed");
      } catch (err) {
        this.nmos.error = err.message;
        this.log(err.message);
        this.notify(err.message, "error");
      } finally {
        this.nmos.checking = false;
      }
    },
    openNmosApplyDialog(flowId) {
      if (!this.canApplyNmos(flowId)) {
        this.log("Run NMOS check before applying NMOS values");
        return;
      }
      if (!this.nmos.applySelections.length) {
        this.nmos.applySelections = Object.keys(this.nmos.result.differences || {});
      }
      this.nmos.applyVisible = true;
    },
    closeNmosApplyDialog() {
      this.nmos.applyVisible = false;
    },
    async applyNmos(flowId) {
      if (!this.canApplyNmos(flowId)) {
        this.log("Cannot apply NMOS data without a recent check");
        return;
      }
      if (!this.nmos.applySelections.length) {
        this.log("Select at least one field to apply");
        return;
      }
      this.nmos.applying = true;
      this.nmos.error = "";
      try {
        const resp = await fetch(`${this.baseUrl}/api/flows/${flowId}/nmos/apply`, {
          method: "POST",
          headers: this.authHeaders(),
          body: JSON.stringify({ fields: this.nmos.applySelections })
        });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(`Failed to apply NMOS data: ${resp.status} ${text}`);
        }
        const data = await resp.json();
        this.log(`NMOS fields updated: ${data.updated_fields.join(", ")}`);
        this.notify("NMOS values applied");
        this.nmos.applyVisible = false;
        if (this.editingFlowId === flowId) {
          await this.loadFlowForEdit(flowId);
        }
        await this.refreshFlows();
        await this.checkNmos(flowId);
      } catch (err) {
        this.nmos.error = err.message;
        this.log(err.message);
      } finally {
        this.nmos.applying = false;
      }
    },
    defaultBaseUrl() {
      try {
        if (typeof window === "undefined" || !window.location) {
          return "http://localhost:8080";
        }
        const { protocol, hostname } = window.location;
        const safeHost = hostname
          ? (hostname.includes(":") ? `[${hostname}]` : hostname)
          : "localhost";

        // Use port 8443 for HTTPS, 8080 for HTTP
        const port = protocol === "https:" ? "8443" : "8080";

        return `${protocol}//${safeHost}:${port}`;
      } catch (err) {
        console.warn("Failed to detect default base URL", err);
        return "http://localhost:8080";
      }
    },
    saveBaseUrl() {
      localStorage.setItem("mmam_base_url", this.baseUrl);
      this.log(`Base URL saved: ${this.baseUrl}`);
      this.notify("Base URL saved");
    },
    loadBaseUrl() {
      this.baseUrl = localStorage.getItem("mmam_base_url") || this.defaultBaseUrl();
    },
    async login() {
      try {
        const resp = await fetch(`${this.baseUrl}/api/login`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(this.loginForm).toString()
        });
        if (!resp.ok) throw new Error(`Login failed: ${resp.status}`);
        const json = await resp.json();
        this.token = json.access_token;
        this.log("Login success");
        this.notify("Logged in");
        await this.fetchMe();
        await this.fetchRealtimeConfig();
        if (this.currentUser && this.currentUser.role === "admin") {
          await this.fetchSettings();
          await this.fetchUsers();
        } else {
          this.settings = {};
          this.users = [];
        }
        await this.refreshFlows();
        if (this.canAccessChecker()) {
          await this.fetchLatestCheckerResults();
        } else {
          this.resetCheckerResults();
        }
      } catch (err) {
        console.error(err);
        this.log(err.message);
        this.notify(err.message, "error");
      }
    },
    logout() {
      this.token = null;
      this.currentUser = null;
      this.teardownRealtime();
      this.resetCheckerResults();
      this.log("Logged out");
      this.notify("Logged out", "success", 1500);
    },
    handleTokenExpired() {
      this.token = null;
      this.currentUser = null;
      this.teardownRealtime();
      this.resetCheckerResults();
      this.currentView = "dashboard";
      this.notify("Session expired. Please log in again / セッションが期限切れです。再度ログインしてください。", "error", 5000);
    },
    async fetchMe() {
      if (!this.token) return;
      try {
        const resp = await fetch(`${this.baseUrl}/api/me`, {
          headers: { Authorization: `Bearer ${this.token}` }
        });
        if (!resp.ok) throw new Error("Failed to fetch user");
        this.currentUser = await resp.json();
      } catch (err) {
        this.log(err.message);
        this.notify(err.message, "error");
      }
    },
    authHeaders() {
      const headers = { "Content-Type": "application/json" };
      if (this.token) headers["Authorization"] = `Bearer ${this.token}`;
      return headers;
    },
    async handleFetchResponse(resp) {
      if (resp.status === 401) {
        const text = await resp.text();
        if (text.includes("Token expired") || text.includes("トークンの有効期限切れ")) {
          this.handleTokenExpired();
          throw new Error("Session expired");
        }
        throw new Error(text || "Unauthorized");
      }
      return resp;
    },
    async fetchRealtimeConfig() {
      try {
        const headers = this.token ? { Authorization: `Bearer ${this.token}` } : {};
        const resp = await fetch(`${this.baseUrl}/api/realtime/config`, { headers });
        if (!resp.ok) {
          if ([401, 403, 404].includes(resp.status)) {
            this.teardownRealtime();
            this.realtime.enabled = false;
            return;
          }
          throw new Error(`Failed to load realtime config: ${resp.status}`);
        }
        const data = await resp.json();
        const wsOverride = this.mqttWsOverride;
        const wsUrl = wsOverride || data.ws_url;
        const enabled = Boolean(data.enabled && wsUrl && data.topic);
        this.realtime.enabled = enabled;
        this.realtime.wsUrl = wsUrl || "";
        this.realtime.wsUrlInput = wsUrl || "";
        this.realtime.topicAll = data.topic_all || data.topic || "";
        this.realtime.topicFlowPrefix = data.topic_flow_prefix || "";
        this.realtime.topic = this.realtime.topicAll || data.topic || "";
        this.realtime.username = data.username || "";
        this.realtime.password = data.password || "";
        this.realtime.clientIdPrefix = data.client_id_prefix || "mmam-ui";
        if (enabled) {
          this.connectRealtime();
        } else {
          this.teardownRealtime();
        }
      } catch (err) {
        console.warn("Realtime config error", err);
      }
    },
    connectRealtime() {
      if (typeof mqtt === "undefined" || !this.realtime.enabled) {
        return;
      }
      if (!this.realtime.wsUrl || !this.realtime.topic) {
        return;
      }
      this.teardownRealtime();
      const clientId = `${this.realtime.clientIdPrefix}-${Math.random().toString(16).slice(2, 10)}`;
      const options = {
        clientId,
        reconnectPeriod: 5000,
        connectTimeout: 5000,
        clean: true
      };
      if (this.realtime.username) options.username = this.realtime.username;
      if (this.realtime.password) options.password = this.realtime.password;
      try {
        const client = mqtt.connect(this.realtime.wsUrl, options);
        this.realtime.client = client;
        client.on("connect", () => {
          this.realtime.connected = true;
          this.log("MQTT connected");
          const subscribeTargets = new Set();
          if (this.realtime.topicAll) {
            subscribeTargets.add(this.realtime.topicAll);
          } else if (this.realtime.topic) {
            subscribeTargets.add(this.realtime.topic);
          }
          if (!this.realtime.topicAll && this.realtime.topicFlowPrefix) {
            subscribeTargets.add(`${this.realtime.topicFlowPrefix}/#`);
          }
          subscribeTargets.forEach(topic => {
            if (!topic) return;
            client.subscribe(topic, err => {
              if (err) {
                this.log(`MQTT subscribe failed: ${topic}`);
              }
            });
          });
        });
        client.on("message", (_, payload) => {
          try {
            const data = JSON.parse(payload.toString());
            this.handleRealtimeFlowEvent(data);
          } catch (err) {
            console.warn("Failed to parse MQTT payload", err);
          }
        });
        client.on("error", err => {
          this.realtime.connected = false;
          this.log(`MQTT error: ${err.message || err}`);
        });
        client.on("close", () => {
          this.realtime.connected = false;
        });
      } catch (err) {
        console.error("MQTT connect error", err);
      }
    },
    teardownRealtime() {
      if (this.realtime.client) {
        try {
          this.realtime.client.end(true);
        } catch (err) {
          console.warn("MQTT disconnect failed", err);
        }
      }
      this.realtime.client = null;
      this.realtime.connected = false;
    },
    handleRealtimeFlowEvent(event) {
      if (!event || !event.flow_id) return;
      const action = event.event || event.action || "updated";
      if (action === "deleted" || action === "hard_deleted") {
        this.flows = this.flows.filter(flow => flow.flow_id !== event.flow_id);
        this.searchResults = this.searchResults.filter(flow => flow.flow_id !== event.flow_id);
        if (this.detailFlow && this.detailFlow.flow_id === event.flow_id) {
          this.detailFlow = null;
          this.detailEntries = [];
        }
      } else if (event.flow) {
        this.mergeFlowIntoCollections(event.flow, action);
      }
      this.scheduleSummaryRefresh();
      this.appendRealtimeFeed(event);
    },
    appendRealtimeFeed(event) {
      const entry = {
        id: `${event.flow_id}-${Date.now()}`,
        flow_id: event.flow_id,
        display: (event.flow && (event.flow.display_name || event.flow.flow_id)) || event.flow_id,
        action: event.event || event.action || "updated",
        diffKeys: event.diff ? Object.keys(event.diff) : [],
        timestamp: new Date().toLocaleTimeString()
      };
      this.realtimeFeed.unshift(entry);
      if (this.realtimeFeed.length > 10) {
        this.realtimeFeed.pop();
      }
    },
    mergeFlowIntoCollections(flow, action = "updated") {
      if (!flow || !flow.flow_id) return;
      const applyToList = list => {
        const idx = list.findIndex(item => item.flow_id === flow.flow_id);
        if (idx >= 0) {
          list.splice(idx, 1, { ...list[idx], ...flow });
          return true;
        }
        return false;
      };
      const inMain = applyToList(this.flows);
      const inSearch = applyToList(this.searchResults);
      if (this.detailFlow && this.detailFlow.flow_id === flow.flow_id) {
        this.detailFlow = { ...this.detailFlow, ...flow };
      }
      if (!inMain && !inSearch && action === "created") {
        this.refreshFlows();
      }
    },
    scheduleSummaryRefresh() {
      if (this.summaryRefreshTimer) return;
      this.summaryRefreshTimer = setTimeout(async () => {
        try {
          await this.fetchFlowSummary();
        } finally {
          this.summaryRefreshTimer = null;
        }
      }, 1000);
    },
    reloadUiPreserveSession() {
      if (this.token) {
        sessionStorage.setItem("mmam_reload_token", this.token);
      }
      window.location.reload();
    },
    saveMqttOverride() {
      if (this.realtime.wsUrlInput) {
        localStorage.setItem("mmam_mqtt_ws_url", this.realtime.wsUrlInput);
        this.mqttWsOverride = this.realtime.wsUrlInput;
        this.notify("MQTT WebSocket URL saved");
        this.fetchRealtimeConfig();
      }
    },
    resetMqttOverride() {
      localStorage.removeItem("mmam_mqtt_ws_url");
      this.mqttWsOverride = "";
      this.realtime.wsUrlInput = "";
      this.notify("MQTT WebSocket URL reset");
      this.fetchRealtimeConfig();
    },
    loadMqttOverride() {
      this.mqttWsOverride = localStorage.getItem("mmam_mqtt_ws_url") || "";
      this.realtime.wsUrlInput = this.mqttWsOverride;
    },
    async refreshFlows() {
      try {
        const limit = this.normalizedLimit;
        const offset = Math.max(0, Math.floor(Number(this.filters.offset) || 0));
        if (this.filters.limit !== limit) {
          this.filters.limit = limit;
        }
        if (this.filters.offset !== offset) {
          this.filters.offset = offset;
        }
        const params = new URLSearchParams({
          limit: limit,
          offset: offset,
          sort_by: this.filters.sort_by,
          sort_order: this.filters.sort_order,
          fields: [
            "nmos_node_label",
            "source_addr_a",
            "source_port_a",
            "multicast_addr_a",
            "group_port_a",
            "source_addr_b",
            "source_port_b",
            "multicast_addr_b",
            "group_port_b",
            "locked"
          ].join(",")
        });
        const resp = await fetch(`${this.baseUrl}/api/flows?${params.toString()}`, {
          headers: this.token ? { Authorization: `Bearer ${this.token}` } : {}
        });
        if (!resp.ok) throw new Error(`Failed to load flows: ${resp.status}`);
        const list = await resp.json();
        this.flows = list;
        this.pageInput = String(this.currentPageNumber);
        await this.fetchFlowSummary();
      } catch (err) {
        console.error(err);
        this.log(err.message);
        this.notify(err.message, "error");
      }
    },
    async fetchFlowSummary() {
      try {
        const resp = await fetch(`${this.baseUrl}/api/flows/summary`, {
          headers: this.token ? { Authorization: `Bearer ${this.token}` } : {}
        });
        if (!resp.ok) throw new Error(`Failed to load summary: ${resp.status}`);
        const data = await resp.json();
        this.summary.total = data.total ?? 0;
        this.summary.active = data.active ?? 0;
      } catch (err) {
        console.error(err);
        this.log(err.message);
      }
    },
    async runQuickSearch() {
      const term = this.quickSearch.term.trim();
      if (!term) {
        this.searchResults = [];
        this.log("Search term is empty / キーワードを入力してください");
        return;
      }
      try {
        const params = new URLSearchParams({
          limit: this.quickSearch.limit,
          offset: 0,
          sort_by: "updated_at",
          sort_order: "desc",
          q: term,
          fields: [
            "nmos_node_label",
            "source_addr_a",
            "source_port_a",
            "multicast_addr_a",
            "group_port_a",
            "flow_status",
            "availability",
            "locked"
          ].join(",")
        });
        const resp = await fetch(`${this.baseUrl}/api/flows?${params.toString()}`, {
          headers: this.token ? { Authorization: `Bearer ${this.token}` } : {}
        });
        if (!resp.ok) throw new Error(`Failed to search flows: ${resp.status}`);
        this.searchResults = await resp.json();
        this.searchMode = "Quick / 簡易";
        this.log(`Quick search finished (${this.searchResults.length} hits)`);
        this.notify(`Quick search: ${this.searchResults.length} hits`);
      } catch (err) {
        console.error(err);
        this.log(err.message);
        this.notify(err.message, "error");
      }
    },
    async runAdvancedSearch() {
      try {
        const params = new URLSearchParams({
          limit: this.advancedSearch.limit,
          offset: 0,
          sort_by: "updated_at",
          sort_order: "desc",
          fields: [
            "nmos_node_label",
            "source_addr_a",
            "source_port_a",
            "multicast_addr_a",
            "group_port_a",
            "flow_status",
            "availability",
            "locked"
          ].join(",")
        });
        if (this.advancedSearch.include_unused) {
          params.append("include_unused", "true");
        }
        const textFields = [
          "display_name",
          "flow_id",
          "source_addr_a",
          "source_addr_b",
          "multicast_addr_a",
          "multicast_addr_b",
          "transport_protocol",
          "nmos_node_id",
          "alias1",
          "flow_status",
          "availability"
        ];
        let hasTextCondition = false;
        textFields.forEach(field => {
          const value = this.advancedSearch[field];
          if (value) {
            params.append(field, value);
            hasTextCondition = true;
          }
        });
        const numberFields = [
          "source_port_a",
          "source_port_b",
          "group_port_a",
          "group_port_b",
          "nmos_is04_port",
          "nmos_is05_port"
        ];
        let hasNumberCondition = false;
        numberFields.forEach(field => {
          const min = this.advancedSearch[`${field}_min`];
          const max = this.advancedSearch[`${field}_max`];
          if (min !== null && min !== "" && !Number.isNaN(min)) {
            params.append(`${field}_min`, min);
            hasNumberCondition = true;
          }
          if (max !== null && max !== "" && !Number.isNaN(max)) {
            params.append(`${field}_max`, max);
            hasNumberCondition = true;
          }
        });
        let hasDateCondition = false;
        ["updated_at_min", "updated_at_max", "created_at_min", "created_at_max"].forEach(field => {
          const value = this.advancedSearch[field];
          if (value) {
            params.append(field, value);
            hasDateCondition = true;
          }
        });
        const hasIncludeFlag = this.advancedSearch.include_unused;
        if (!hasTextCondition && !hasNumberCondition && !hasDateCondition && !hasIncludeFlag) {
          this.log("Advanced search requires at least one condition / 条件を入力してください");
          return;
        }
        const resp = await fetch(`${this.baseUrl}/api/flows?${params.toString()}`, {
          headers: this.token ? { Authorization: `Bearer ${this.token}` } : {}
        });
        if (!resp.ok) throw new Error(`Failed to search flows: ${resp.status}`);
        this.searchResults = await resp.json();
        this.searchMode = "Advanced / 詳細";
        this.log(`Advanced search finished (${this.searchResults.length} hits)`);
        this.notify(`Advanced search: ${this.searchResults.length} hits`);
      } catch (err) {
        console.error(err);
        this.log(err.message);
        this.notify(err.message, "error");
      }
    },
    resetAdvancedSearch() {
      this.advancedSearch = DEFAULT_ADVANCED_SEARCH();
    },
    toggleAdvancedCollapse() {
      this.advancedCollapsed = !this.advancedCollapsed;
    },
    async showFlow(flowId) {
      try {
        const resp = await fetch(`${this.baseUrl}/api/flows/${flowId}`, {
          headers: this.token ? { Authorization: `Bearer ${this.token}` } : {}
        });
        if (!resp.ok) throw new Error(`Failed to load detail: ${resp.status}`);
        const data = await resp.json();
        delete data.lock_toggle_allowed;
        this.detailFlow = data;

        // Build grouped entries using FIELD_GROUPS structure
        const groupedEntries = [];

        // Add system fields group (created_at, updated_at)
        const systemFields = [
          { key: 'created_at', label: 'Created At' },
          { key: 'updated_at', label: 'Updated At' },
          { key: 'locked', label: 'Locked' }
        ];

        for (const group of FIELD_GROUPS) {
          const groupData = {
            title: group.title,
            fields: []
          };

          for (const field of group.fields) {
            const value = data[field.key];
            if (value !== undefined && value !== null && value !== '') {
              groupData.fields.push({
                key: field.key,
                label: field.label,
                value: value
              });
            }
          }

          // Only add group if it has fields with values
          if (groupData.fields.length > 0) {
            groupedEntries.push(groupData);
          }
        }

        // Add system metadata group
        const systemGroup = {
          title: 'System Metadata',
          fields: []
        };
        for (const field of systemFields) {
          const value = data[field.key];
          if (value !== undefined && value !== null && value !== '') {
            systemGroup.fields.push({
              key: field.key,
              label: field.label,
              value: value
            });
          }
        }
        if (systemGroup.fields.length > 0) {
          groupedEntries.push(systemGroup);
        }

        this.detailEntries = groupedEntries;
      } catch (err) {
        this.log(err.message);
        this.notify(err.message, "error");
      }
    },
    async loadFlowForEdit(flowId) {
      try {
        const resp = await fetch(`${this.baseUrl}/api/flows/${flowId}`, {
          headers: this.authHeaders()
        });
        if (!resp.ok) throw new Error("Failed to load flow");
        const data = await resp.json();
        const lockPermission = data.lock_toggle_allowed;
        delete data.lock_toggle_allowed;
        this.newFlow = { ...DEFAULT_FLOW(), ...data };
        this.newFlow.locked = Boolean(data.locked);
        this.editingFlowId = flowId;
        this.editingOriginalFlow = JSON.parse(JSON.stringify(this.newFlow));
        this.lockToggleAllowed = Boolean(lockPermission);
        this.setView("newFlow");
        this.log(`Loaded flow ${flowId} into form`);
      } catch (err) {
        this.log(err.message);
      }
    },
    async toggleFlowLock() {
      if (!this.editingFlowId || !this.lockToggleAllowed || this.lockToggleLoading) return;
      const target = !this.newFlow.locked;
      this.lockToggleLoading = true;
      try {
        const resp = await fetch(`${this.baseUrl}/api/flows/${this.editingFlowId}/lock`, {
          method: "POST",
          headers: this.authHeaders(),
          body: JSON.stringify({ locked: target })
        });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(`Failed to toggle lock: ${resp.status} ${text}`);
        }
        const data = await resp.json();
        this.newFlow.locked = data.locked;
        if (!data.locked) {
          this.editingOriginalFlow = JSON.parse(JSON.stringify(this.newFlow));
        }
        const msg = data.locked ? "Flow locked" : "Flow unlocked";
        this.log(msg);
        this.notify(msg);
      } catch (err) {
        this.log(err.message);
        this.notify(err.message, "error");
      } finally {
        this.lockToggleLoading = false;
      }
    },
    resetFlowForm() {
      this.newFlow = DEFAULT_FLOW();
      this.editingFlowId = null;
      this.editingOriginalFlow = null;
      this.lockToggleAllowed = false;
      this.lockToggleLoading = false;
    },
    closeDetail() {
      this.detailFlow = null;
      this.detailEntries = [];
    },
    nextPage() {
      const limit = this.normalizedLimit;
      if (this.flows.length < limit) {
        this.log("No more flows / これ以上フローがありません。");
        return;
      }
      this.filters.offset += limit;
      this.refreshFlows();
    },
    prevPage() {
      if (!this.canGoPrevious) {
        this.log("Already at first page / 先頭ページです。");
        return;
      }
      this.filters.offset = Math.max(0, this.filters.offset - this.normalizedLimit);
      this.refreshFlows();
    },
    applyPageInput() {
      const page = Number(this.pageInput);
      if (!page || page < 1) {
        this.pageInput = String(this.currentPageNumber);
        return;
      }
      const limit = this.normalizedLimit;
      const newOffset = (page - 1) * limit;
      if (newOffset === this.filters.offset) {
        this.pageInput = String(this.currentPageNumber);
        return;
      }
      this.filters.offset = newOffset;
      this.refreshFlows();
    },
    async submitFlow() {
      try {
        if (this.editingFlowId && this.newFlow.locked) {
          throw new Error("This flow is locked. Please unlock it before updating / このフローはロックされています。解除してから更新してください。");
        }
        const formData = { ...this.newFlow };
        if (
          formData.data_source === "manual" &&
          (!formData.flow_id || formData.flow_id === "") &&
          formData.nmos_flow_id
        ) {
          formData.flow_id = formData.nmos_flow_id;
          this.newFlow.flow_id = formData.nmos_flow_id;
        }

        const payload = {};
        for (const [key, value] of Object.entries(formData)) {
          if (value === "" || value === undefined) {
            payload[key] = null;
          } else if (NUMBER_FIELDS.has(key)) {
            payload[key] = value === null ? null : Number(value);
          } else {
            payload[key] = value;
          }
        }
        if (!payload.display_name && !payload.multicast_addr_a && !payload.source_addr_a) {
          throw new Error("Please enter at least display name or address / 最低でも表示名またはアドレスを入力してください。");
        }
        if (this.editingFlowId) {
          const diffs = {};
          const original = this.editingOriginalFlow || {};
          for (const [key, value] of Object.entries(payload)) {
            if (key === "flow_id") continue;
            const originalValue = original[key] ?? null;
            if (value !== originalValue) {
              diffs[key] = value;
            }
          }
          if (Object.keys(diffs).length === 0) {
            this.log("No changes to save / 変更がありません。");
            return;
          }
          const resp = await fetch(`${this.baseUrl}/api/flows/${this.editingFlowId}`, {
            method: "PATCH",
            headers: this.authHeaders(),
            body: JSON.stringify(diffs)
          });
          if (!resp.ok) throw new Error(`Failed to update flow: ${resp.status}`);
          this.log(`Flow updated: ${this.editingFlowId}`);
          this.notify("Flow updated");
        } else {
          const resp = await fetch(`${this.baseUrl}/api/flows`, {
            method: "POST",
            headers: this.authHeaders(),
            body: JSON.stringify(payload)
          });
          if (!resp.ok) throw new Error(`Failed to create flow: ${resp.status}`);
          const data = await resp.json();
          this.log(`Flow created: ${data.flow_id}`);
          this.notify("Flow created");
        }
        this.resetFlowForm();
        await this.refreshFlows();
      } catch (err) {
        this.log(err.message);
        this.notify(err.message, "error");
      }
    },
    async fetchUsers() {
      try {
        const resp = await fetch(`${this.baseUrl}/api/users`, {
          headers: this.authHeaders()
        });
        if (!resp.ok) throw new Error("Failed to fetch user list");
        this.users = await resp.json();
      } catch (err) {
        this.log(err.message);
      }
    },
    async createUser() {
      try {
        const resp = await fetch(`${this.baseUrl}/api/users`, {
          method: "POST",
          headers: this.authHeaders(),
          body: JSON.stringify(this.newUser)
        });
        if (!resp.ok) throw new Error("Failed to create user");
        this.log(`User created: ${this.newUser.username}`);
        this.notify("User created");
        this.newUser = { username: "", password: "", role: "viewer" };
        await this.fetchUsers();
      } catch (err) {
        this.log(err.message);
        this.notify(err.message, "error");
      }
    },
    async updateUserInfo(user) {
      try {
        const payload = {};
        if (user.password) payload.password = user.password;
        if (user.role) payload.role = user.role;
        const resp = await fetch(`${this.baseUrl}/api/users/${user.username}`, {
          method: "PATCH",
          headers: this.authHeaders(),
          body: JSON.stringify(payload)
        });
        if (!resp.ok) throw new Error("Failed to update user");
        this.log(`User updated: ${user.username}`);
        this.notify("User updated");
        await this.fetchUsers();
      } catch (err) {
        this.log(err.message);
        this.notify(err.message, "error");
      }
    },
    async deleteUser(username) {
      if (!confirm(`Delete user ${username}?`)) return;
      try {
        const resp = await fetch(`${this.baseUrl}/api/users/${username}`, {
          method: "DELETE",
          headers: this.authHeaders()
        });
        if (!resp.ok) throw new Error("Failed to delete user");
        this.log(`User deleted: ${username}`);
        this.notify("User deleted");
        await this.fetchUsers();
      } catch (err) {
        this.log(err.message);
        this.notify(err.message, "error");
      }
    },
    async deleteFlow(flowId) {
      if (!confirm(`Delete flow ${flowId}?`)) return;
      try {
        const resp = await fetch(`${this.baseUrl}/api/flows/${flowId}`, {
          method: "DELETE",
          headers: this.authHeaders()
        });
        if (!resp.ok) throw new Error("Failed to delete flow");
        this.log(`Flow deleted: ${flowId}`);
        this.notify("Flow deleted");
        await this.refreshFlows();
        this.searchResults = this.searchResults.filter(flow => flow.flow_id !== flowId);
      } catch (err) {
        this.log(err.message);
        this.notify(err.message, "error");
      }
    },
    async fetchSettings() {
      try {
        const resp = await fetch(`${this.baseUrl}/api/settings`, {
          headers: this.authHeaders()
        });
        if (!resp.ok) throw new Error("Failed to fetch settings");
        this.settings = await resp.json();
      } catch (err) {
        this.log(err.message);
      }
    },
    async updateSetting(key, value) {
      try {
        const resp = await fetch(`${this.baseUrl}/api/settings/${key}`, {
          method: "PUT",
          headers: this.authHeaders(),
          body: JSON.stringify({ value })
        });
        if (!resp.ok) throw new Error("Failed to update setting");
        const data = await resp.json();
        this.settings[key] = data.value;
        this.log(`Setting updated: ${key} = ${data.value}`);
        this.notify(`Setting updated: ${key}`);
      } catch (err) {
        this.log(err.message);
        this.notify(err.message, "error");
      }
    },
    async refreshAllLogs() {
      await Promise.all(["api", "audit"].map(kind => this.refreshLogPreview(kind)));
    },
    async refreshLogPreview(kind) {
      if (!this.token) {
        this.notify("Log access requires authentication", "error");
        return;
      }
      this.logViewer.loading = true;
      try {
        const resp = await fetch(`${this.baseUrl}/api/logs?kind=${kind}&lines=200`, {
          headers: this.authHeaders()
        });
        await this.handleFetchResponse(resp);
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(`Failed to fetch ${kind} log: ${resp.status} ${text}`);
        }
        const data = await resp.json();
        this.logViewer[kind] = data.lines || [];
      } catch (err) {
        this.log(err.message);
        this.notify(err.message, "error");
      } finally {
        this.logViewer.loading = false;
      }
    },
    async downloadLog(kind) {
      if (!this.token) {
        this.notify("Log access requires authentication", "error");
        return;
      }
      try {
        const headers = {};
        if (this.token) headers["Authorization"] = `Bearer ${this.token}`;
        const resp = await fetch(`${this.baseUrl}/api/logs/download?kind=${kind}`, {
          headers
        });
        await this.handleFetchResponse(resp);
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(`Failed to download ${kind} log: ${resp.status} ${text}`);
        }
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0];
        const a = document.createElement("a");
        a.href = url;
        a.download = `mmam-${kind}-log-${stamp}.txt`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        this.notify(`${kind.toUpperCase()} log downloaded`);
      } catch (err) {
        this.log(err.message);
        this.notify(err.message, "error");
      }
    },
    handleImportFile(event) {
      const file = event.target.files && event.target.files[0];
      this.importFile = file || null;
    },
    async exportFlows() {
      try {
        const headers = {};
        if (this.token) headers["Authorization"] = `Bearer ${this.token}`;
        const resp = await fetch(`${this.baseUrl}/api/flows/export`, {
          headers
        });
        if (!resp.ok) throw new Error(`Failed to export flows: ${resp.status}`);
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0];
        a.href = url;
        a.download = `mmam-flows-${stamp}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        this.notify("Flows exported");
      } catch (err) {
        this.log(err.message);
        this.notify(err.message, "error");
      }
    },
    async importFlows() {
      if (!this.importFile) {
        this.notify("Select a JSON file first", "error");
        return;
      }
      this.importingFlows = true;
      try {
        const text = await this.importFile.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error("Invalid JSON");
        }
        if (!Array.isArray(data)) {
          throw new Error("Import file must be a JSON array");
        }
        const resp = await fetch(`${this.baseUrl}/api/flows/import`, {
          method: "POST",
          headers: this.authHeaders(),
          body: JSON.stringify(data)
        });
        if (!resp.ok) {
          const detail = await resp.text();
          throw new Error(`Failed to import flows: ${resp.status} ${detail}`);
        }
        const result = await resp.json();
        this.notify(
          `Import completed (new: ${result.inserted}, updated: ${result.updated}, skipped: ${result.skipped_locked})`
        );
        this.importFile = null;
        if (this.$refs.flowImportInput) {
          this.$refs.flowImportInput.value = "";
        }
        await this.refreshFlows();
      } catch (err) {
        this.log(err.message);
        this.notify(err.message, "error");
      } finally {
        this.importingFlows = false;
      }
    },
    setCheckerTab(key) {
      this.currentCheckerTab = key;
    },
    async fetchLatestCheckerResults() {
      if (!this.canAccessChecker()) return;
      await Promise.all(this.checkerTabs.map(tab => this.fetchLatestChecker(tab.key)));
    },
    async fetchLatestChecker(kind) {
      if (!this.canAccessChecker()) return;
      try {
        const resp = await fetch(`${this.baseUrl}/api/checker/latest?kind=${kind}`, {
          headers: this.authHeaders()
        });
        await this.handleFetchResponse(resp);
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(`Failed to fetch ${kind} checker result: ${resp.status} ${text}`);
        }
        const data = await resp.json();
        if (data && data.result) {
          const enriched = {
            ...data.result,
            fetchedAt: this.formatTimestamp(data.result.fetchedAt || data.created_at)
          };
          this.checkerResults = {
            ...this.checkerResults,
            [kind]: enriched
          };
        } else {
          this.checkerResults = {
            ...this.checkerResults,
            [kind]: null
          };
        }
      } catch (err) {
        this.log(err.message);
      }
    },
    async runCollisionCheck() {
      if (!this.token) {
        this.notify("Please log in to run the checker", "error");
        return;
      }
      this.checkerLoading = true;
      try {
        const resp = await fetch(`${this.baseUrl}/api/checker/collisions`, {
          headers: this.authHeaders()
        });
        if (!resp.ok) throw new Error(`Failed to run collision check: ${resp.status}`);
        const data = await resp.json();
        this.checkerResults.collisions = {
          ...data,
          fetchedAt: this.formatTimestamp(data.fetchedAt)
        };
        await this.fetchLatestChecker("collisions");
        this.notify("Collision check completed");
      } catch (err) {
        this.log(err.message);
        this.notify(err.message, "error");
      } finally {
        this.checkerLoading = false;
      }
    },
    async runNmosCheck() {
      if (!this.token) {
        this.notify("Please log in to run the checker", "error");
        return;
      }
      this.checkerLoading = true;
      try {
        const resp = await fetch(`${this.baseUrl}/api/checker/nmos`, {
          headers: this.authHeaders()
        });
        if (!resp.ok) throw new Error(`Failed to run NMOS check: ${resp.status}`);
        const data = await resp.json();
        this.checkerResults.nmos = {
          ...data,
          fetchedAt: this.formatTimestamp(data.fetchedAt),
          checked: data.checked || 0,
          skipped: data.skipped || 0,
          differences: data.differences || [],
          errors: data.errors || []
        };
        await this.fetchLatestChecker("nmos");
        const diffCount = this.checkerResults.nmos.differences.length;
        this.notify(`NMOS check completed (${diffCount} difference${diffCount === 1 ? "" : "s"})`);
      } catch (err) {
        this.log(err.message);
        this.notify(err.message, "error");
      } finally {
        this.checkerLoading = false;
      }
    },
    // --------------------------------------------------------
    // Automation methods
    // --------------------------------------------------------
    async loadAutomationJobs() {
      if (!this.token) return;
      try {
        const resp = await fetch(`${this.baseUrl}/api/automation/jobs`, {
          headers: this.authHeaders()
        });
        if (!resp.ok) throw new Error(`Failed to load automation jobs: ${resp.status}`);
        const jobs = await resp.json();
        this.automationJobs = jobs;

        // Update individual job data for collision and nmos
        const collisionJob = jobs.find(j => j.job_id === 'collision_check');
        const nmosJob = jobs.find(j => j.job_id === 'nmos_check');

        if (collisionJob) {
          this.collisionJob = { ...collisionJob };
        }
        if (nmosJob) {
          this.nmosJob = { ...nmosJob };
        }
      } catch (err) {
        console.error('Failed to load automation jobs:', err);
      }
    },
    async loadAutomationSummary() {
      try {
        const resp = await fetch(`${this.baseUrl}/api/automation/summary`, {
          headers: this.authHeaders()
        });
        if (!resp.ok) {
          if (resp.status === 401) {
            this.automationSummary = null;
            return;
          }
          throw new Error(`Failed to load automation summary: ${resp.status}`);
        }
        this.automationSummary = await resp.json();
      } catch (err) {
        console.error('Failed to load automation summary:', err);
        this.automationSummary = null;
      }
    },
    async updateAutomationJob(jobId, config) {
      if (!this.token) {
        this.notify("Please log in", "error");
        return;
      }
      try {
        const resp = await fetch(`${this.baseUrl}/api/automation/jobs/${jobId}`, {
          method: 'PUT',
          headers: { ...this.authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        });
        if (!resp.ok) {
          const detail = await resp.text();
          throw new Error(`Failed to update job: ${resp.status} ${detail}`);
        }
        this.notify('Job updated successfully');
        await this.loadAutomationJobs();
      } catch (err) {
        this.log(err.message);
        this.notify(err.message, "error");
        throw err;
      }
    },
    async toggleAutomationJob(jobId, enabled) {
      if (!this.token) {
        this.notify("Please log in", "error");
        return;
      }
      try {
        const endpoint = enabled ? 'enable' : 'disable';
        const resp = await fetch(`${this.baseUrl}/api/automation/jobs/${jobId}/${endpoint}`, {
          method: 'POST',
          headers: this.authHeaders()
        });
        if (!resp.ok) {
          const detail = await resp.text();
          throw new Error(`Failed to ${endpoint} job: ${resp.status} ${detail}`);
        }
        this.notify(`Job ${enabled ? 'enabled' : 'disabled'} successfully`);
        await this.loadAutomationJobs();
      } catch (err) {
        this.log(err.message);
        this.notify(err.message, "error");
        throw err;
      }
    },
    async saveCollisionSchedule() {
      const job = this.collisionJob;
      let scheduleValue = job.schedule_value;

      // If interval type, calculate seconds from intervalValue and intervalUnit
      if (job.schedule_type === 'interval') {
        scheduleValue = String(this.collisionIntervalValue * parseInt(this.collisionIntervalUnit));
      }

      try {
        await this.updateAutomationJob('collision_check', {
          enabled: job.enabled,
          schedule_type: job.schedule_type,
          schedule_value: scheduleValue
        });
        this.editingCollisionSchedule = false;
      } catch (err) {
        // Error already handled in updateAutomationJob
      }
    },
    async saveNmosSchedule() {
      const job = this.nmosJob;
      let scheduleValue = job.schedule_value;

      // If interval type, calculate seconds from intervalValue and intervalUnit
      if (job.schedule_type === 'interval') {
        scheduleValue = String(this.nmosIntervalValue * parseInt(this.nmosIntervalUnit));
      }

      try {
        await this.updateAutomationJob('nmos_check', {
          enabled: job.enabled,
          schedule_type: job.schedule_type,
          schedule_value: scheduleValue
        });
        this.editingNmosSchedule = false;
      } catch (err) {
        // Error already handled in updateAutomationJob
      }
    },
    async toggleCollisionJob() {
      try {
        await this.toggleAutomationJob('collision_check', this.collisionJob.enabled);
      } catch (err) {
        // Revert on error
        this.collisionJob.enabled = !this.collisionJob.enabled;
      }
    },
    async toggleNmosJob() {
      try {
        await this.toggleAutomationJob('nmos_check', this.nmosJob.enabled);
      } catch (err) {
        // Revert on error
        this.nmosJob.enabled = !this.nmosJob.enabled;
      }
    },
    cancelEditCollisionSchedule() {
      this.editingCollisionSchedule = false;
      this.loadAutomationJobs(); // Reload to revert changes
    },
    cancelEditNmosSchedule() {
      this.editingNmosSchedule = false;
      this.loadAutomationJobs(); // Reload to revert changes
    },
    async copyToClipboard(text) {
      if (!text) return;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          const textarea = document.createElement("textarea");
          textarea.value = text;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          document.execCommand("copy");
          document.body.removeChild(textarea);
        }
        this.notify("Copied to clipboard");
      } catch (err) {
        console.error(err);
        this.notify("Failed to copy", "error");
      }
    },
    async hardDeleteFlow() {
      const flowId = this.hardDeleteFlowId.trim();
      if (!flowId) {
        this.log("Flow ID is required for hard delete");
        return;
      }
      if (!confirm(`Permanently delete flow ${flowId}? This cannot be undone.`)) {
        return;
      }
      try {
        const resp = await fetch(`${this.baseUrl}/api/flows/${flowId}/hard`, {
          method: "DELETE",
          headers: this.authHeaders()
        });
        if (!resp.ok) {
          const detail = await resp.text();
          throw new Error(`Failed to hard delete flow: ${resp.status} ${detail}`);
        }
        this.log(`Hard deleted flow: ${flowId}`);
        this.notify("Flow permanently deleted");
        this.hardDeleteFlowId = "";
        await this.refreshFlows();
      } catch (err) {
        this.log(err.message);
        this.notify(err.message, "error");
      }
    },
    async fetchRDSNodes() {
      if (!this.wizard.rdsBaseUrl) {
        this.notify("Please enter RDS Base URL / RDSのベースURLを入力してください", "error");
        return;
      }
      this.wizard.fetchingRDS = true;
      try {
        const resp = await fetch(`${this.baseUrl}/api/nmos/detect-is04-from-rds`, {
          method: "POST",
          headers: this.authHeaders(),
          body: JSON.stringify({
            rds_base_url: this.wizard.rdsBaseUrl,
            rds_version: this.wizard.rdsVersion,
            timeout: 5
          })
        });
        await this.handleFetchResponse(resp);
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(`Failed to fetch RDS nodes: ${resp.status} ${text}`);
        }
        const data = await resp.json();
        if (data.nodes && data.nodes.length > 0) {
          // Show modal for node selection
          this.wizard.rdsNodesModal = {
            visible: true,
            nodes: data.nodes,
            selected: 0
          };
        } else {
          this.notify("No nodes found in RDS / RDSにノードが見つかりませんでした", "error");
        }
      } catch (err) {
        console.error(err);
        this.notify(err.message, "error");
      } finally {
        this.wizard.fetchingRDS = false;
      }
    },
    applyRDSNode() {
      const selectedIndex = this.wizard.rdsNodesModal.selected;
      if (selectedIndex === null) return;
      const node = this.wizard.rdsNodesModal.nodes[selectedIndex];
      if (node) {
        this.wizard.is04BaseUrl = node.is04_url;
        // Set IS-04 version if detected
        if (node.version && node.version !== "unknown" && this.wizard.is04Versions.includes(node.version)) {
          this.wizard.is04Version = node.version;
        }
        this.notify(`IS-04 endpoint set to ${node.label}`);
      }
      this.wizard.rdsNodesModal.visible = false;
    },
    copyIs04ToIs05() {
      this.wizard.is05BaseUrl = this.wizard.is04BaseUrl;
    },
    async detectIS05() {
      if (!this.wizard.is04BaseUrl) {
        this.notify("Please enter IS-04 Base URL first / IS-04のベースURLを先に入力してください", "error");
        return;
      }
      this.wizard.detectingIS05 = true;
      try {
        const resp = await fetch(`${this.baseUrl}/api/nmos/detect-is05`, {
          method: "POST",
          headers: this.authHeaders(),
          body: JSON.stringify({
            is04_base_url: this.wizard.is04BaseUrl,
            is04_version: this.wizard.is04Version,
            timeout: 5
          })
        });
        await this.handleFetchResponse(resp);
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(`Failed to detect IS-05: ${resp.status} ${text}`);
        }
        const data = await resp.json();
        if (data.options && data.options.length > 0) {
          this.wizard.is05DetectionModal.options = data.options;
          this.wizard.is05DetectionModal.selected = 0;
          this.wizard.is05DetectionModal.visible = true;
        } else {
          this.notify("No IS-05 endpoints found in devices / デバイスにIS-05エンドポイントが見つかりませんでした", "error");
        }
      } catch (err) {
        console.error(err);
        this.notify(err.message, "error");
      } finally {
        this.wizard.detectingIS05 = false;
      }
    },
    applyDetectedIS05() {
      const selectedIndex = this.wizard.is05DetectionModal.selected;
      if (selectedIndex === null) return;
      const option = this.wizard.is05DetectionModal.options[selectedIndex];
      if (option) {
        this.wizard.is05BaseUrl = option.is05_url;
        // Set IS-05 version if detected
        if (option.version && option.version !== "unknown" && this.wizard.is05Versions.includes(option.version)) {
          this.wizard.is05Version = option.version;
        }
        this.notify(`IS-05 endpoint set to ${option.device_label}`);
      }
      this.wizard.is05DetectionModal.visible = false;
    },
    async fetchNmosFlows() {
      if (!this.wizard.is04BaseUrl || !this.wizard.is05BaseUrl) {
        this.log("NMOS base URLs are required / IS-04 と IS-05 エンドポイントを入力してください");
        return;
      }
      this.wizard.loading = true;
      this.wizard.error = "";
      this.wizard.flows = [];
      this.wizard.node = null;
      this.wizard.selections = {};
      try {
        const requestPayload = {
          is04_base_url: this.wizard.is04BaseUrl,
          is05_base_url: this.wizard.is05BaseUrl,
          is04_version: this.wizard.is04Version,
          is05_version: this.wizard.is05Version
        };
        console.log("[wizard] discover payload", requestPayload);
        const resp = await fetch(`${this.baseUrl}/api/nmos/discover`, {
          method: "POST",
          headers: this.authHeaders(),
          body: JSON.stringify(requestPayload)
        });
        if (!resp.ok) {
          let errText = await resp.text();
          try {
            const parsed = JSON.parse(errText);
            if (parsed.detail) {
              if (typeof parsed.detail === "string") {
                errText = parsed.detail;
              } else {
                errText = JSON.stringify(parsed.detail);
              }
            } else {
              errText = JSON.stringify(parsed);
            }
          } catch {
            errText = errText || resp.statusText;
          }
          throw new Error(`NMOS discover failed: ${resp.status} ${errText}`);
        }
        const data = await resp.json();
        this.wizard.flows = data.flows || [];
        this.wizard.node = data.node || null;
        this.log(`NMOS discover success (${this.wizard.flows.length} flows)`);
        this.notify(`NMOS discover: ${this.wizard.flows.length} flows`);
      } catch (err) {
        this.wizard.error = err.message;
        this.log(err.message);
        this.notify(err.message, "error");
      } finally {
        this.wizard.loading = false;
      }
    },
    toggleWizardSelection(flowId, checked) {
      if (checked) {
        this.wizard.selections[flowId] = true;
      } else {
        delete this.wizard.selections[flowId];
      }
    },
    toggleWizardSelectAll(checked) {
      const nextSelections = { ...this.wizard.selections };
      if (checked) {
        this.wizard.flows.forEach(flow => {
          nextSelections[flow.nmos_flow_id] = true;
        });
      } else {
        this.wizard.flows.forEach(flow => {
          delete nextSelections[flow.nmos_flow_id];
        });
      }
      this.wizard.selections = nextSelections;
    },
    isWizardFlowSelected(flowId) {
      return !!this.wizard.selections[flowId];
    },
    async importSelectedFlows() {
      const selectedIds = Object.keys(this.wizard.selections).filter(id => this.wizard.selections[id]);
      if (selectedIds.length === 0) {
        this.log("No NMOS flows selected");
        this.notify("Select at least one NMOS flow", "error");
        return;
      }
      this.wizard.importing = true;
      let success = 0;
      const total = selectedIds.length;
      for (const id of selectedIds) {
        const flow = this.wizard.flows.find(item => item.nmos_flow_id === id);
        if (!flow) continue;
        const payload = {
          flow_id: flow.nmos_flow_id,
          display_name: flow.label,
          nmos_node_id: flow.nmos_node_id,
          nmos_node_label: flow.node_label || flow.nmos_node_label,
          nmos_node_description: flow.node_description || flow.nmos_node_description,
          nmos_node_label: flow.nmos_node_label,
          nmos_node_description: flow.nmos_node_description,
          nmos_flow_id: flow.nmos_flow_id,
          nmos_sender_id: flow.nmos_sender_id,
          nmos_device_id: flow.nmos_device_id,
          nmos_is04_host: flow.nmos_is04_host,
          nmos_is04_port: flow.nmos_is04_port,
          nmos_is04_base_url: this.wizard.is04BaseUrl,
          nmos_is05_host: flow.nmos_is05_host,
          nmos_is05_port: flow.nmos_is05_port,
          nmos_is05_base_url: this.wizard.is05BaseUrl,
          nmos_is04_version: this.wizard.is04Version,
          nmos_is05_version: this.wizard.is05Version,
          nmos_label: flow.label,
          nmos_description: flow.description,
          transport_protocol: flow.sender_transport || "RTP/UDP",
          data_source: this.wizard.useRDS ? "rds" : "nmos",
          note: flow.description,
          sdp_url: flow.sdp_url || flow.sender_manifest || null,
          sdp_cache: flow.sdp_cache || null,
        source_addr_a: flow.source_addr_a || null,
        source_addr_b: flow.source_addr_b || null,
        multicast_addr_a: flow.multicast_addr_a || null,
        multicast_addr_b: flow.multicast_addr_b || null,
        group_port_a: flow.group_port_a || null,
        group_port_b: flow.group_port_b || null,
        source_port_a: flow.source_port_a || null,
        source_port_b: flow.source_port_b || null,
        media_type: flow.media_type || null,
        st2110_format: flow.st2110_format || null,
        redundancy_group: flow.redundancy_group || null
      };
        // Add RDS information if RDS was used
        if (this.wizard.useRDS) {
          payload.rds_api_url = this.wizard.rdsBaseUrl;
          payload.rds_version = this.wizard.rdsVersion;
        }
        ["group_port_a", "group_port_b", "source_port_a", "source_port_b"].forEach(key => {
          if (payload[key] === "" || payload[key] === undefined) {
            payload[key] = null;
            return;
          }
          const parsed = Number(payload[key]);
          payload[key] = Number.isFinite(parsed) ? parsed : null;
        });
        try {
          const resp = await fetch(`${this.baseUrl}/api/flows`, {
            method: "POST",
            headers: this.authHeaders(),
            body: JSON.stringify(payload)
          });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const data = await resp.json();
          this.log(`Imported flow ${data.flow_id}`);
          success += 1;
        } catch (err) {
          this.log(`Failed to import ${flow.label}: ${err.message}`);
        }
      }
      if (success > 0) {
        await this.refreshFlows();
        this.notify(`NMOS import: ${success}/${total} flows`);
      } else {
        this.notify("Failed to import NMOS flows", "error");
      }
      this.wizard.importing = false;
    },
    // -------- Planner (Explorer) --------
    async ensurePlannerDrives() {
      if (this.planner.drives.length === 0) {
        await this.fetchPlannerDrives();
      } else if (!this.planner.selectedDriveId) {
        this.selectDrive(this.planner.drives[0].id);
      }
    },
    async fetchPlannerDrives() {
      try {
        const headers = this.token ? { Authorization: `Bearer ${this.token}` } : {};
        const resp = await fetch(`${this.baseUrl}/api/address/buckets/privileged`, { headers });
        if (!resp.ok) throw new Error(`Failed to load drives: ${resp.status}`);
        const data = await resp.json();
        this.planner.drives = data;
        const preferred =
          data.find(item => item.start_ip && item.start_ip.startsWith("232.")) || data[0];
        if (preferred) {
          this.selectDrive(preferred.id);
        }
      } catch (err) {
        this.log(err.message);
        this.notify(err.message, "error");
      }
    },
    driveLabel(drive) {
      if (!drive) return "";
      return drive.description || `${drive.start_ip} /8`;
    },
    async selectDrive(driveId) {
      if (!driveId) return;
      this.planner.selectedDriveId = driveId;
      this.planner.folderNodes = {};
      this.planner.expandedFolders = {};
      this.planner.selectedFolderId = null;
      this.planner.selectedView = null;
      this.planner.detailCells = [];
      this.planner.map = null;
      const drive = this.planner.drives.find(item => item.id === driveId);
      if (drive) {
        this.planner.folderNodes[driveId] = { ...drive, children: [], loaded: false };
      }
      await this.loadFolderChildren(driveId);
      this.planner.selectedFolderId = driveId;
      this.resetManageForms();
      this.syncManageTargets();
    },
    getFolderChildren(folderId) {
      const node = this.planner.folderNodes[folderId];
      return node && node.children ? node.children : [];
    },
    async loadFolderChildren(folderId) {
      if (!folderId) return;
      try {
        const headers = this.token ? { Authorization: `Bearer ${this.token}` } : {};
        const resp = await fetch(`${this.baseUrl}/api/address/buckets/${folderId}/children`, {
          headers
        });
        if (!resp.ok) throw new Error(`Failed to load folders: ${resp.status}`);
        const children = await resp.json();
        const node = this.planner.folderNodes[folderId] || { children: [] };
        node.children = children;
        node.loaded = true;
        this.planner.folderNodes[folderId] = node;
        children.forEach(child => {
          if (!this.planner.folderNodes[child.id]) {
            this.planner.folderNodes[child.id] = { ...child, children: [], loaded: false };
          } else {
            this.planner.folderNodes[child.id] = {
              ...this.planner.folderNodes[child.id],
              ...child
            };
          }
        });
      } catch (err) {
        this.log(err.message);
        this.notify(err.message, "error");
      }
    },
    isFolderExpanded(folderId) {
      return Boolean(this.planner.expandedFolders[folderId]);
    },
    canExpandFolder(node) {
      if (!node || !node.id) return false;
      const stored = this.planner.folderNodes[node.id] || node;
      if (!stored.loaded) return true;
      const children = stored.children || [];
      return children.some(child => child && child.kind !== "child");
    },
    hasLoadedChildFolders(folderId) {
      const node = this.planner.folderNodes[folderId];
      if (!node) return false;
      if (node.kind === "tier0" || node.kind === "parent") {
        return !this.isFolderExpanded(folderId);
      }
      return false;
    },
    async toggleFolder(node) {
      if (!node) return;
      const expanded = this.isFolderExpanded(node.id);
      if (!expanded && (!this.planner.folderNodes[node.id] || !this.planner.folderNodes[node.id].loaded)) {
        await this.loadFolderChildren(node.id);
      }
      this.planner.expandedFolders = {
        ...this.planner.expandedFolders,
        [node.id]: !expanded
      };
    },
    async selectFolder(node) {
      if (!node) return;
      if (!this.planner.folderNodes[node.id] || !this.planner.folderNodes[node.id].loaded) {
        await this.loadFolderChildren(node.id);
      }
      this.planner.selectedFolderId = node.id;
      this.planner.selectedView = null;
      this.planner.detailCells = [];
      this.planner.map = null;
      this.resetManageForms();
      this.syncManageTargets();
      if (this.canExpandFolder(node)) {
        this.planner.expandedFolders = {
          ...this.planner.expandedFolders,
          [node.id]: true
        };
      }
    },
    normalizeIp(value) {
      if (!value) return "";
      const trimmed = String(value).trim();
      if (!trimmed.includes("/")) return trimmed;
      return trimmed.split("/")[0];
    },
    resetManageForms() {
      this.planner.manageFolderEditing = false;
      this.planner.manageFolderForm = {
        description: "",
        memo: "",
        color: ""
      };
      this.planner.manageViewEditingId = null;
      this.planner.manageViewForm = {
        description: "",
        memo: "",
        color: "",
        is_reserved: false
      };
    },
    syncManageTargets() {
      const node = this.currentFolderNode;
      if (node && node.id) {
        this.planner.parentForm.parent_id = node.id;
        if (node.kind === "parent") {
          this.planner.childForm.parent_id = node.id;
        } else {
          this.planner.childForm.parent_id = null;
        }
      } else {
        this.planner.parentForm.parent_id = this.planner.selectedDriveId;
        this.planner.childForm.parent_id = null;
      }
    },
    manageParentTargetId() {
      const node = this.currentFolderNode;
      if (node && node.id) return node.id;
      return this.planner.selectedDriveId;
    },
    manageChildTargetId() {
      const node = this.currentFolderNode;
      if (node && node.kind === "parent") return node.id;
      return null;
    },
    async openPlannerView(view) {
      if (!view) return;
      const normalized = {
        ...view,
        start_ip: this.normalizeIp(view.start_ip),
        end_ip: this.normalizeIp(view.end_ip)
      };
      this.planner.selectedView = normalized;
      await this.loadAddressMap({
        rangeStart: normalized.start_ip,
        rangeEnd: normalized.end_ip
      });
    },
    plannerFileIcon(view) {
      if (!view) return "🗂";
      if (view.is_reserved) return "🔒";
      return "📄";
    },
    handleDriveChange(event) {
      const driveId = Number(event.target.value);
      if (driveId) {
        this.selectDrive(driveId);
      }
    },
    async loadAddressMap(options = {}) {
      const { rangeStart = null, rangeEnd = null, centerOverride = null } = options;
      if (!rangeStart || !rangeEnd) return;
      if (!this.isValidIpv4(rangeStart) || !this.isValidIpv4(rangeEnd)) {
        this.notify("Range start/end must be IPv4 addresses", "error");
        return;
      }
      this.planner.isLoading = true;
      this.planner.error = "";
      try {
        const data = await this.fetchAddressMapData(rangeStart, rangeEnd, centerOverride);
        this.applyAddressMapData(data, "explorer");
        this.planner.centerAddressInput = "";
      } catch (err) {
        console.error(err);
        this.planner.error = err.message;
        this.notify(err.message, "error");
      } finally {
        this.planner.isLoading = false;
      }
    },
    plannerBuildDetailCells(count, context = "explorer") {
      const cells = [];
      const map = this.plannerMapForContext(context);
      if (!map || !map.scope) return cells;
      const scope = map.scope;
      const base = scope.start_int;
      const columns = this.gridColumnsForContext(context);
      for (let index = 0; index < count; index += 1) {
        const absoluteIndex = base + index;
        const address = this.intToIp(absoluteIndex);
        cells.push({
          index,
          address,
          state: this.plannerStateForIndex(index, context),
          groupSize: this.detectGroupSize(index, context),
          displayColumn: absoluteIndex % columns
        });
      }
      return cells;
    },
    async fetchAddressMapData(rangeStart, rangeEnd, centerOverride = null) {
      if (!rangeStart || !rangeEnd) {
        throw new Error("range_start and range_end are required");
      }
      const params = new URLSearchParams({ range_start: rangeStart, range_end: rangeEnd });
      if (centerOverride) {
        params.append("center", centerOverride);
      }
      const headers = this.token ? { Authorization: `Bearer ${this.token}` } : {};
      const resp = await fetch(`${this.baseUrl}/api/address-map?${params.toString()}`, {
        headers
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Failed to load address map: ${resp.status} ${text}`);
      }
      return resp.json();
    },
    applyAddressMapData(data, context = "explorer") {
      if (!data) return;
      const total = data.scope && typeof data.scope.total === "number" ? data.scope.total : 0;
      const usedLookup = {};
      (data.used_details || []).forEach(detail => {
        usedLookup[detail.index] = detail;
      });
      if (context === "easy") {
        this.planner.easyView.map = data;
        this.planner.easyView.usedLookup = usedLookup;
        this.planner.easyView.detailCells = this.plannerBuildDetailCells(total, "easy");
      } else {
        this.planner.map = data;
        this.planner.usedLookup = usedLookup;
        this.planner.centerIndex = Math.min(Math.max(0, data.center_index || 0), Math.max(0, total - 1));
        this.planner.gauss = null;
        this.planner.detailCells = this.plannerBuildDetailCells(total, "explorer");
      }
    },
    plannerMapForContext(context = "explorer") {
      return context === "easy" ? this.planner.easyView.map : this.planner.map;
    },
    plannerUsedLookupForContext(context = "explorer") {
      return context === "easy" ? this.planner.easyView.usedLookup : this.planner.usedLookup;
    },
    gridColumnsForMap(map) {
      const total = map?.scope?.total;
      if (!Number.isFinite(total) || total <= 0) {
        return PLANNER_GRID_COLUMNS;
      }
      return Math.max(1, Math.min(PLANNER_GRID_COLUMNS, Math.floor(total)));
    },
    gridColumnsForContext(context = "explorer") {
      return this.gridColumnsForMap(this.plannerMapForContext(context));
    },
    buildPlannerRowsForContext(context = "explorer") {
      const map = this.plannerMapForContext(context);
      const detailCells = context === "easy" ? this.planner.easyView.detailCells : this.planner.detailCells;
      if (!detailCells.length || !map?.scope) return [];
      const base = map.scope.start_int || 0;
      const columns = this.gridColumnsForContext(context);
      const rows = [];
      let currentKey = null;
      let currentRow = null;
      const columnOf = cell =>
        Number.isFinite(cell.displayColumn) ? cell.displayColumn : cell.index % columns;
      const flushRow = () => {
        if (!currentRow || !currentRow.cells.length) return;
        const startColumn = columnOf(currentRow.cells[0]);
        const usedColumns = currentRow.cells.length;
        const trailing = Math.max(0, columns - usedColumns - startColumn);
        const absoluteStart = base + currentRow.cells[0].index;
        currentRow.leading = Math.max(0, startColumn);
        currentRow.trailing = trailing;
        currentRow.segment24 = Math.floor(absoluteStart / SUBNET_24_SIZE);
        rows.push(currentRow);
      };
      for (const cell of detailCells) {
        const absoluteIndex = base + cell.index;
        const rowKey = Math.floor(absoluteIndex / columns);
        if (rowKey !== currentKey) {
          flushRow();
          currentKey = rowKey;
          currentRow = { key: rowKey, cells: [], order: rows.length };
        }
        currentRow.cells.push(cell);
      }
      flushRow();
      rows.forEach((row, idx) => {
        const prev = rows[idx - 1];
        const boundaryChanged = Boolean(prev && prev.segment24 !== row.segment24);
        const isFirst = idx === 0;
        row.segmentLabel = null;
        row.gapTop = boundaryChanged;
        row.showLabel = boundaryChanged || isFirst;
        if (row.showLabel && row.cells.length) {
          const absoluteStart = base + row.cells[0].index;
          const aligned = absoluteStart - (absoluteStart % SUBNET_24_SIZE);
          row.segmentLabel = `${this.intToIp(aligned)}/24`;
        }
      });
      return rows;
    },
    parseCidrRange(input) {
      console.log("parseCidrRange - input:", input);
      const trimmed = (input || "").trim();
      const [ipPart, prefixPart] = trimmed.split("/");
      console.log("parseCidrRange - ipPart:", ipPart, "prefixPart:", prefixPart);
      if (!ipPart || typeof prefixPart === "undefined") {
        console.log("parseCidrRange - missing parts");
        return null;
      }
      if (!this.isValidIpv4(ipPart)) {
        console.log("parseCidrRange - invalid IPv4");
        return null;
      }
      const prefix = Number(prefixPart);
      if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
        console.log("parseCidrRange - invalid prefix");
        return null;
      }
      const size = Math.pow(2, 32 - prefix);
      const ipInt = this.ipToInt(ipPart);
      if (!Number.isFinite(ipInt)) {
        console.log("parseCidrRange - invalid ipInt");
        return null;
      }
      const startInt = Math.floor(ipInt / size) * size;
      const endInt = startInt + size - 1;
      const result = {
        start_ip: this.intToIp(startInt),
        end_ip: this.intToIp(endInt),
        total: size,
        label: `${this.intToIp(startInt)}/${prefix}`
      };
      console.log("parseCidrRange - result:", result);
      return result;
    },
    resolveEasyViewRange() {
      const easy = this.planner.easyView;
      console.log("resolveEasyViewRange - mode:", easy.mode, "cidr:", easy.cidr, "start_ip:", easy.start_ip, "end_ip:", easy.end_ip);
      if (easy.mode === "cidr") {
        if (!easy.cidr) {
          easy.error = "CIDR is required";
          return null;
        }
        const parsed = this.parseCidrRange(easy.cidr);
        console.log("resolveEasyViewRange - parsed CIDR:", parsed);
        if (!parsed) {
          easy.error = "Invalid CIDR format";
          return null;
        }
        if (parsed.total > EASY_VIEW_MAX_TOTAL) {
          easy.error = `CIDR range must be <= ${EASY_VIEW_MAX_TOTAL} addresses (/20 or smaller)`;
          return null;
        }
        return parsed;
      }
      if (!easy.start_ip || !easy.end_ip) {
        easy.error = "Start and end IP are required";
        return null;
      }
      const startNorm = this.normalizeIp(easy.start_ip);
      const endNorm = this.normalizeIp(easy.end_ip);
      console.log("resolveEasyViewRange - normalized:", startNorm, endNorm);
      if (!this.isValidIpv4(startNorm) || !this.isValidIpv4(endNorm)) {
        easy.error = "Start and end IP must be IPv4";
        return null;
      }
      const startInt = this.ipToInt(startNorm);
      const endInt = this.ipToInt(endNorm);
      if (endInt < startInt) {
        easy.error = "End IP must be greater than or equal to start IP";
        return null;
      }
      const total = endInt - startInt + 1;
      if (total > EASY_VIEW_MAX_TOTAL) {
        easy.error = `Manual range must be <= ${EASY_VIEW_MAX_TOTAL} addresses`;
        return null;
      }
      const result = {
        start_ip: this.intToIp(startInt),
        end_ip: this.intToIp(endInt),
        total,
        label: `${this.intToIp(startInt)} – ${this.intToIp(endInt)}`
      };
      console.log("resolveEasyViewRange - result:", result);
      return result;
    },
    async loadEasyViewRange(rangeOverride = null) {
      const easy = this.planner.easyView;
      easy.error = "";
      const targetRange = rangeOverride || this.resolveEasyViewRange();
      console.log("loadEasyViewRange - targetRange:", targetRange);
      if (!targetRange || !targetRange.start_ip || !targetRange.end_ip) {
        if (!targetRange) {
          easy.error = "Please enter valid IP range or CIDR";
        } else {
          easy.error = "Invalid range: missing start_ip or end_ip";
        }
        console.log("loadEasyViewRange - validation failed:", easy.error);
        return;
      }
      easy.loading = true;
      try {
        console.log("loadEasyViewRange - fetching:", targetRange.start_ip, targetRange.end_ip);
        const data = await this.fetchAddressMapData(targetRange.start_ip, targetRange.end_ip);
        this.applyAddressMapData(data, "easy");
        easy.activeLabel = targetRange.label;
        this.recordEasyViewHistory(targetRange);
      } catch (err) {
        easy.error = err.message;
        this.notify(err.message, "error");
        console.error("loadEasyViewRange - error:", err);
      } finally {
        easy.loading = false;
      }
    },
    recordEasyViewHistory(range) {
      if (!range) return;
      const history = this.planner.easyView.history.filter(
        entry => entry.start_ip !== range.start_ip || entry.end_ip !== range.end_ip
      );
      history.unshift({
        id: Date.now(),
        label: range.label,
        start_ip: range.start_ip,
        end_ip: range.end_ip,
        total: range.total
      });
      this.planner.easyView.history = history.slice(0, EASY_VIEW_HISTORY_LIMIT);
    },
    async loadEasyViewFromHistory(entry) {
      if (!entry) return;
      await this.loadEasyViewRange({
        start_ip: entry.start_ip,
        end_ip: entry.end_ip,
        label: entry.label,
        total: entry.total
      });
    },
    clearEasyViewHistory() {
      this.planner.easyView.history = [];
    },
    plannerRowStyle(row) {
      if (!row) return {};
      const baseGap = row.order === 0 ? 0 : 2;
      return {
        marginTop: row.gapTop ? "8px" : `${baseGap}px`
      };
    },
    updatePlannerGauss(startIndex) {
      const total = this.planner?.map?.scope?.total;
      if (!Number.isFinite(startIndex) || !Number.isFinite(total) || total <= 0) {
        this.planner.gauss = null;
        return;
      }
      const size = Math.max(1, Math.min(Number(this.planner.searchSize) || 1, total));
      const clampedStart = Math.max(0, Math.min(startIndex, total - 1));
      const endExclusive = Math.min(total, clampedStart + size);
      let hasUsed = false;
      for (let idx = clampedStart; idx < endExclusive; idx += 1) {
        if (this.plannerStateForIndex(idx) === STATE_USED) {
          hasUsed = true;
          break;
        }
      }
      this.planner.gauss = {
        start: clampedStart,
        end: endExclusive,
        tone: hasUsed ? "used" : "free"
      };
    },
    detectGroupSize(index, context = "explorer") {
      const map = this.plannerMapForContext(context);
      if (!Number.isFinite(index) || !map || !Array.isArray(map.segments)) {
        return 1;
      }
      const segment = this.plannerSegmentForIndex(index, context);
      if (!segment || !Number.isFinite(segment.start) || !Number.isFinite(segment.length)) {
        return 1;
      }
      const offsetWithinSegment = index - segment.start;
      const remaining = segment.length - offsetWithinSegment;
      return remaining > 0 ? remaining : 1;
    },
    plannerStateForIndex(index, context = "explorer") {
      const segment = this.plannerSegmentForIndex(index, context);
      return segment ? segment.state : STATE_FREE;
    },
    plannerSegmentForIndex(index, context = "explorer") {
      const map = this.plannerMapForContext(context);
      if (!map || !map.segments) return null;
      let left = 0;
      let right = map.segments.length - 1;
      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const seg = map.segments[mid];
        const start = seg.start;
        const end = seg.start + seg.length;
        if (index < start) {
          right = mid - 1;
        } else if (index >= end) {
          left = mid + 1;
        } else {
          return seg;
        }
      }
      return null;
    },
    plannerCellStyle(cell, context = "explorer") {
      const baseColors = {
        FREE: "rgba(16,185,129,0.25)",
        RESERVED: "rgba(245,158,11,0.35)",
        USED: "rgba(248,113,113,0.5)"
      };
      const style = {
        backgroundColor: baseColors[cell.state] || "rgba(148,163,184,0.2)",
        border: "1px solid rgba(148,163,184,0.4)",
        width: "12px",
        height: "12px",
        margin: "0px",
        marginRight: "0px"
      };
      const columns = this.gridColumnsForContext(context) || PLANNER_GRID_COLUMNS;
      const column = Number.isFinite(cell.displayColumn) ? cell.displayColumn : cell.index % columns;
      let extraGap = 0;
      if ((column + 1) % 16 === 0) extraGap = Math.max(extraGap, 3);
      if ((column + 1) % 32 === 0) extraGap = Math.max(extraGap, 4);
      if (extraGap > 0 && (column + 1) !== columns) {
        style.marginRight = `${extraGap}px`;
      }
      const gauss = context === "explorer" ? this.planner.gauss : null;
      if (gauss && cell.index >= gauss.start && cell.index < gauss.end) {
        const glowColor = gauss.tone === "used" ? "rgba(248,113,113,0.85)" : "rgba(16,185,129,0.85)";
        style.boxShadow = `0 0 6px 2px ${glowColor}`;
        style.zIndex = 1;
      }
      if (this.planner.selectedCellIndex === cell.index && this.planner.selectedContext === context) {
        style.boxShadow = "0 0 8px 3px rgba(59,130,246,0.9)";
        style.border = "1px solid rgba(59,130,246,1)";
        style.zIndex = 2;
      }
      return style;
    },
    handlePlannerHover(cell, payload, context = "explorer") {
      if (!cell || typeof cell.index !== "number") return;
      const eventLike = payload && payload.target ? payload : null;
      const state = this.plannerStateForIndex(cell.index, context);
      const info = {
        index: cell.index,
        address: cell.address,
        state
      };
      const lookup = this.plannerUsedLookupForContext(context);
      if (state === STATE_USED && lookup && lookup[cell.index]) {
        info.flows = lookup[cell.index].flows || [];
      }
      this.planner.hoverInfo = info;
      if (context === "explorer") {
        this.updatePlannerGauss(cell.index);
      } else {
        this.planner.gauss = null;
      }
      if (eventLike) {
        this.updateHoverTooltipPosition(eventLike);
        this.planner.hoverTooltip.visible = true;
      }
    },
    clearPlannerHover() {
      this.planner.hoverInfo = null;
      this.planner.hoverTooltip.visible = false;
      this.planner.gauss = null;
    },
    emphasizePlannerCell(cell, context = "explorer") {
      if (!cell) return;
      const lookup = this.plannerUsedLookupForContext(context);
      const detail = lookup ? lookup[cell.index] : null;
      if (!detail || !detail.flows || detail.flows.length === 0) {
        this.notify("No flow data for this cell", "error");
        return;
      }
      const targetFlow = detail.flows[0];
      if (!targetFlow.flow_id) {
        this.notify("Flow information missing flow_id", "error");
        return;
      }
      this.showFlow(targetFlow.flow_id);
    },
    selectPlannerCell(cell, context = "explorer") {
      if (!cell) return;
      const lookup = this.plannerUsedLookupForContext(context);
      const detail = lookup ? lookup[cell.index] : null;
      const selectedCell = {
        address: cell.address,
        state: cell.state,
        index: cell.index,
        flows: detail ? detail.flows : []
      };
      this.planner.selectedCell = selectedCell;
      this.planner.selectedCellIndex = cell.index;
      this.planner.selectedContext = context;
    },
    clearSelectedCell() {
      this.planner.selectedCell = null;
      this.planner.selectedCellIndex = null;
      this.planner.selectedContext = null;
    },
    handlePlannerHoverMove(event) {
      if (!this.planner.hoverTooltip.visible) return;
      this.updateHoverTooltipPosition(event);
    },
    handlePlannerBackupFile(event) {
      const file = event.target?.files?.[0] || null;
      this.planner.backup.file = file;
    },
    async exportPlannerBackup() {
      this.planner.backup.exporting = true;
      try {
        const headers = this.token ? { Authorization: `Bearer ${this.token}` } : {};
        const resp = await fetch(`${this.baseUrl}/api/address/buckets/export`, { headers });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(`Failed to export planner data: ${resp.status} ${text}`);
        }
        const data = await resp.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const link = document.createElement("a");
        link.href = url;
        link.download = `planner-backup-${timestamp}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        this.notify("Planner backup exported");
      } catch (err) {
        this.notify(err.message, "error");
      } finally {
        this.planner.backup.exporting = false;
      }
    },
    async importPlannerBackup() {
      const file = this.planner.backup.file;
      if (!file) {
        this.notify("Select a JSON file first", "error");
        return;
      }
      if (!window.confirm("Importing will replace all planner folders and views. Continue?")) {
        return;
      }
      this.planner.backup.importing = true;
      try {
        const text = await file.text();
        let payload;
        try {
          payload = JSON.parse(text);
        } catch (parseErr) {
          throw new Error("Invalid JSON file");
        }
        if (!payload || !payload.buckets || !Array.isArray(payload.buckets)) {
          throw new Error("Backup file must contain a buckets array");
        }
        const resp = await fetch(`${this.baseUrl}/api/address/buckets/import`, {
          method: "POST",
          headers: this.authHeaders(),
          body: JSON.stringify(payload)
        });
        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`Import failed: ${resp.status} ${errText}`);
        }
        this.notify("Planner backup imported");
        this.planner.backup.file = null;
        if (this.$refs.plannerBackupInput) {
          this.$refs.plannerBackupInput.value = "";
        }
        await this.fetchPlannerDrives();
        if (this.planner.selectedDriveId) {
          await this.selectDrive(this.planner.selectedDriveId);
        } else if (this.planner.drives.length > 0) {
          await this.selectDrive(this.planner.drives[0].id);
        }
      } catch (err) {
        this.notify(err.message, "error");
      } finally {
        this.planner.backup.importing = false;
      }
    },
    updateHoverTooltipPosition(event) {
      if (!event) return;
      const offset = 18;
      const width = 240;
      const height = 160;
      let x = event.clientX + offset;
      let y = event.clientY + offset;
      const maxX = window.innerWidth - width - 8;
      const maxY = window.innerHeight - height - 8;
      x = Math.max(8, Math.min(x, maxX));
      y = Math.max(8, Math.min(y, maxY));
      this.planner.hoverTooltip = {
        ...this.planner.hoverTooltip,
        x,
        y,
        visible: true
      };
    },
    plannerSearchAvailable() {
      return this.planner.map && this.planner.map.scope;
    },
    plannerCenterOnInput() {
      const target = (this.planner.centerAddressInput || "").trim();
      if (!target) return;
      if (!this.isValidIpv4(target)) {
        this.notify("Center address must be IPv4", "error");
        return;
      }
      if (!this.plannerSearchAvailable()) {
        this.notify("No view loaded", "error");
        return;
      }
      const targetInt = this.ipToInt(target);
      const base = this.planner.map.scope.start_int;
      const end = base + (this.planner.map.scope.total || 0);
      if (targetInt < base || targetInt >= end) {
        this.notify("Address out of range", "error");
        return;
      }
      const index = targetInt - base;
      const cell = this.planner.detailCells[index];
      if (cell) {
        this.handlePlannerHover(cell);
      }
    },
    isValidIpv4(value) {
      if (!value) return false;
      const parts = value.trim().split(".");
      if (parts.length !== 4) return false;
      return parts.every(part => {
        if (!/^\d+$/.test(part)) return false;
        const num = Number(part);
        return num >= 0 && num <= 255;
      });
    },
    intToIp(value) {
      if (!Number.isFinite(value) || value < 0) return "";
      const unsigned = value >>> 0;
      return [
        (unsigned >>> 24) & 255,
        (unsigned >>> 16) & 255,
        (unsigned >>> 8) & 255,
        unsigned & 255
      ].join(".");
    },
    ipToInt(value) {
      if (!value) return NaN;
      const parts = value.trim().split(".");
      if (parts.length !== 4) return NaN;
      let result = 0;
      for (const part of parts) {
        const num = Number(part);
        if (!Number.isFinite(num) || num < 0 || num > 255) return NaN;
        result = (result << 8) + num;
      }
      return result >>> 0;
    },
    async submitParentBucket() {
      const form = { ...this.planner.parentForm };
      const targetParentId = this.manageParentTargetId();
      if (!targetParentId) {
        this.planner.bucketFormError = "Select a drive or parent folder";
        return;
      }
      const payload = {
        parent_id: targetParentId,
        description: form.description,
        memo: form.memo,
        color: form.color
      };
      if (form.mode === "cidr") {
        if (!form.cidr) {
          this.planner.bucketFormError = "CIDR is required";
          return;
        }
        payload.cidr = form.cidr.trim();
      } else {
        if (!form.start_ip || !form.end_ip) {
          this.planner.bucketFormError = "Start and end IP are required";
          return;
        }
        payload.start_ip = this.normalizeIp(form.start_ip);
        payload.end_ip = this.normalizeIp(form.end_ip);
      }
      this.planner.bucketFormError = "";
      this.planner.bucketSaving = true;
      try {
        const resp = await fetch(`${this.baseUrl}/api/address/buckets/parent`, {
          method: "POST",
          headers: this.authHeaders(),
          body: JSON.stringify(payload)
        });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(`Failed to create parent bucket: ${resp.status} ${text}`);
        }
        await resp.json();
        this.notify("Parent bucket created");
        this.planner.parentForm = {
          parent_id: targetParentId,
          mode: form.mode,
          cidr: "",
          start_ip: "",
          end_ip: "",
          description: "",
          memo: "",
          color: ""
        };
        await this.loadFolderChildren(targetParentId);
        this.planner.expandedFolders[targetParentId] = true;
      } catch (err) {
        this.planner.bucketFormError = err.message;
        this.notify(err.message, "error");
      } finally {
        this.planner.bucketSaving = false;
      }
    },
    async submitChildBucket() {
      const form = { ...this.planner.childForm };
      const targetParentId = this.manageChildTargetId();
      if (!targetParentId) {
        this.planner.bucketFormError = "Select a parent folder to create a view";
        return;
      }
      const payload = {
        parent_id: targetParentId,
        description: form.description,
        memo: form.memo,
        color: form.color,
        is_reserved: form.is_reserved
      };
      if (form.mode === "cidr") {
        if (!form.cidr) {
          this.planner.bucketFormError = "CIDR is required";
          return;
        }
        payload.cidr = form.cidr.trim();
      } else {
        if (!form.start_ip || !form.end_ip) {
          this.planner.bucketFormError = "Start and end IP are required";
          return;
        }
        payload.start_ip = this.normalizeIp(form.start_ip);
        payload.end_ip = this.normalizeIp(form.end_ip);
      }
      this.planner.bucketFormError = "";
      this.planner.bucketSaving = true;
      try {
        const resp = await fetch(`${this.baseUrl}/api/address/buckets/child`, {
          method: "POST",
          headers: this.authHeaders(),
          body: JSON.stringify(payload)
        });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(`Failed to create child bucket: ${resp.status} ${text}`);
        }
        this.notify("Child bucket created");
        const parentId = payload.parent_id;
        this.planner.childForm = {
          parent_id: parentId,
          mode: form.mode,
          cidr: "",
          start_ip: "",
          end_ip: "",
          description: "",
          memo: "",
          color: "",
          is_reserved: false
        };
        await this.loadFolderChildren(parentId);
        if (this.planner.selectedFolderId === parentId) {
          this.planner.selectedView = null;
          this.planner.detailCells = [];
          this.planner.map = null;
        }
      } catch (err) {
        this.planner.bucketFormError = err.message;
        this.notify(err.message, "error");
      } finally {
        this.planner.bucketSaving = false;
      }
    },
    async refreshCurrentFolderChildren() {
      const folderId = this.planner.selectedFolderId;
      if (folderId) {
        await this.loadFolderChildren(folderId);
      }
    },
    async patchBucket(bucketId, payload) {
      const resp = await fetch(`${this.baseUrl}/api/address/buckets/${bucketId}`, {
        method: "PATCH",
        headers: this.authHeaders(),
        body: JSON.stringify(payload)
      });
      await this.handleFetchResponse(resp);
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Failed to update bucket: ${resp.status} ${text}`);
      }
      return await resp.json();
    },
    async deleteBucketRequest(bucketId) {
      const resp = await fetch(`${this.baseUrl}/api/address/buckets/${bucketId}`, {
        method: "DELETE",
        headers: this.authHeaders()
      });
      await this.handleFetchResponse(resp);
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Failed to delete bucket: ${resp.status} ${text}`);
      }
      return true;
    },
    async fetchAllFoldersForParentSelection() {
      const allFolders = [];
      const fetchRecursively = async (bucketId) => {
        try {
          const resp = await fetch(`${this.baseUrl}/api/address/buckets/${bucketId}/children`, {
            headers: this.authHeaders()
          });
          if (!resp.ok) return;
          const children = await resp.json();
          for (const child of children) {
            if (child.kind === "tier0" || child.kind === "parent") {
              allFolders.push(child);
              await fetchRecursively(child.id);
            }
          }
        } catch (err) {
          console.error(`Failed to fetch children for ${bucketId}:`, err);
        }
      };
      for (const drive of this.planner.drives) {
        allFolders.push(drive);
        await fetchRecursively(drive.id);
      }
      return allFolders;
    },
    replaceBucketInTree(updated) {
      if (!updated || !updated.id) return;
      if (this.planner.folderNodes[updated.id]) {
        this.planner.folderNodes[updated.id] = {
          ...this.planner.folderNodes[updated.id],
          ...updated
        };
      }
      const parentId = updated.parent_id;
      if (parentId && this.planner.folderNodes[parentId] && Array.isArray(this.planner.folderNodes[parentId].children)) {
        this.planner.folderNodes[parentId].children = this.planner.folderNodes[parentId].children.map(child =>
          child.id === updated.id ? { ...child, ...updated } : child
        );
      }
    },
    async startFolderEdit() {
      if (!this.selectedFolderCanEdit) return;
      const node = this.currentFolderNode;
      if (!node) return;
      this.planner.manageFolderEditing = true;
      this.planner.manageFolderForm = {
        description: node.description || "",
        memo: node.memo || "",
        color: node.color || "",
        parent_id: node.parent_id || null
      };
      if (node.kind === "parent") {
        this.planner.allFoldersCache = await this.fetchAllFoldersForParentSelection();
      }
    },
    cancelFolderEdit() {
      this.planner.manageFolderEditing = false;
      this.planner.manageFolderForm = {
        description: "",
        memo: "",
        color: "",
        parent_id: null
      };
    },
    async saveFolderEdit() {
      if (!this.selectedFolderCanEdit) return;
      const node = this.currentFolderNode;
      if (!node) return;
      const form = this.planner.manageFolderForm;
      const payload = {};
      if ((form.description || "") !== (node.description || "")) payload.description = form.description;
      if ((form.memo || "") !== (node.memo || "")) payload.memo = form.memo;
      if ((form.color || "") !== (node.color || "")) payload.color = form.color;
      if (form.parent_id && form.parent_id !== node.parent_id) payload.parent_id = form.parent_id;
      if (Object.keys(payload).length === 0) {
        this.notify("No changes to save", "error");
        this.planner.manageFolderEditing = false;
        return;
      }
      try {
        const updated = await this.patchBucket(node.id, payload);
        this.replaceBucketInTree(updated);
        this.notify("Folder updated");
        this.planner.manageFolderEditing = false;
        if (payload.parent_id) {
          await this.selectDrive(this.planner.selectedDriveId);
        }
      } catch (err) {
        this.notify(err.message, "error");
      }
    },
    async deleteFolder() {
      if (!this.selectedFolderCanDelete) return;
      const node = this.currentFolderNode;
      if (!node) return;
      if (!window.confirm(`Delete folder "${this.currentFolderLabel}"? This cannot be undone.`)) return;
      const parentId = node.parent_id || node.privilege_id || this.planner.selectedDriveId;
      try {
        await this.deleteBucketRequest(node.id);
        this.notify("Folder deleted");
        delete this.planner.folderNodes[node.id];
        if (parentId) {
          await this.loadFolderChildren(parentId);
          this.planner.selectedFolderId = parentId;
        } else {
          await this.selectDrive(this.planner.selectedDriveId);
        }
      } catch (err) {
        this.notify(err.message, "error");
      }
    },
    async startViewEdit(view) {
      if (!view) return;
      this.planner.manageViewEditingId = view.id;
      this.planner.manageViewForm = {
        description: view.description || "",
        memo: view.memo || "",
        color: view.color || "",
        is_reserved: Boolean(view.is_reserved),
        parent_id: view.parent_id || null
      };
      this.planner.allFoldersCache = await this.fetchAllFoldersForParentSelection();
    },
    cancelViewEdit() {
      this.planner.manageViewEditingId = null;
      this.planner.manageViewForm = {
        description: "",
        memo: "",
        color: "",
        is_reserved: false,
        parent_id: null
      };
    },
    async saveViewEdit() {
      const editId = this.planner.manageViewEditingId;
      if (!editId) return;
      const view = this.currentFolderFiles.find(item => item.id === editId);
      if (!view) {
        this.notify("Select a view to edit", "error");
        return;
      }
      const form = this.planner.manageViewForm;
      const payload = {};
      if ((form.description || "") !== (view.description || "")) payload.description = form.description;
      if ((form.memo || "") !== (view.memo || "")) payload.memo = form.memo;
      if ((form.color || "") !== (view.color || "")) payload.color = form.color;
      if (Boolean(form.is_reserved) !== Boolean(view.is_reserved)) payload.is_reserved = form.is_reserved;
      if (form.parent_id && form.parent_id !== view.parent_id) payload.parent_id = form.parent_id;
      if (Object.keys(payload).length === 0) {
        this.notify("No changes to save", "error");
        return;
      }
      try {
        const updated = await this.patchBucket(view.id, payload);
        this.replaceBucketInTree(updated);
        await this.refreshCurrentFolderChildren();
        this.notify("View updated");
        this.cancelViewEdit();
        if (payload.parent_id) {
          await this.selectDrive(this.planner.selectedDriveId);
        }
      } catch (err) {
        this.notify(err.message, "error");
      }
    },
    async deleteView(view) {
      const target = view || this.currentFolderFiles.find(item => item.id === this.planner.manageViewEditingId);
      if (!target) return;
      if (!window.confirm(`Delete view "${target.description || target.start_ip}"?`)) return;
      const parentId = target.parent_id || this.manageChildTargetId();
      try {
        await this.deleteBucketRequest(target.id);
        this.notify("View deleted");
        this.planner.manageViewEditingId = null;
        await this.loadFolderChildren(parentId || this.planner.selectedFolderId);
      } catch (err) {
        this.notify(err.message, "error");
      }
    },
    closeDetail() {
      this.detailFlow = null;
      this.detailEntries = [];
    }
  }
}).mount("#app");
