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
      { key: "rds_api_url", label: "RDS API URL" }
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

createApp({
  data() {
    return {
      baseUrl: "",
      token: null,
      currentUser: null,
      currentView: "dashboard",
      views: ["dashboard", "flows", "search", "newFlow", "wizard", "checker", "users", "settings"],
      loginForm: {
        username: "admin",
        password: "admin"
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
      importFile: null,
      importingFlows: false,
      checkerTabs: [
        { key: "collisions", label: "Collision Check" }
      ],
      currentCheckerTab: "collisions",
      checkerLoading: false,
      checkerResults: {
        collisions: null
      },
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
      fieldGroups: FIELD_GROUPS,
      wizard: {
        is04BaseUrl: "http://example:8080/x-nmos/",
        is05BaseUrl: "http://example:8080/x-nmos/",
        is04Version: "v1.3",
        is05Version: "v1.1",
        is04Versions: ["v1.3", "v1.2", "v1.1", "v1.0"],
        is05Versions: ["v1.1", "v1.0"],
        flows: [],
        node: null,
        loading: false,
        importing: false,
        error: "",
        selections: {}
      },
      nmos: {
        checking: false,
        applying: false,
        error: "",
        targetFlowId: null,
        result: null,
        applyVisible: false,
        applySelections: []
      }
    };
  },
  mounted() {
    this.loadBaseUrl();
    this.initializeViewFromHash();
    window.addEventListener("popstate", this.handlePopState);
    if (this.token) {
      this.fetchMe();
    }
    this.refreshFlows();
  },
  beforeUnmount() {
    window.removeEventListener("popstate", this.handlePopState);
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
    }
  },
  methods: {
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
        return `${protocol}//${safeHost}:8080`;
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
        if (this.currentUser && this.currentUser.role === "admin") {
          await this.fetchSettings();
          await this.fetchUsers();
        } else {
          this.settings = {};
          this.users = [];
        }
        await this.refreshFlows();
      } catch (err) {
        console.error(err);
        this.log(err.message);
        this.notify(err.message, "error");
      }
    },
    logout() {
      this.token = null;
      this.currentUser = null;
      this.log("Logged out");
      this.notify("Logged out", "success", 1500);
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
        this.detailEntries = Object.entries(data);
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
          throw new Error("このフローはロックされています。解除してから更新してください。");
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
          throw new Error("最低でも表示名またはアドレスを入力してください。");
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
            this.log("変更がありません。");
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
          fetchedAt: new Date().toLocaleString(),
          results: data.results || []
        };
        this.notify("Collision check completed");
      } catch (err) {
        this.log(err.message);
        this.notify(err.message, "error");
      } finally {
        this.checkerLoading = false;
      }
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
    copyIs04ToIs05() {
      this.wizard.is05BaseUrl = this.wizard.is04BaseUrl;
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
          data_source: "nmos",
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
    closeDetail() {
      this.detailFlow = null;
      this.detailEntries = [];
    }
  }
}).mount("#app");
