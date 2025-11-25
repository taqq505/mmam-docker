const { createApp } = Vue;

const FIELD_GROUPS = [
  {
    title: "基本情報",
    fields: [
      { key: "display_name", label: "表示名" },
      { key: "flow_id", label: "Flow ID (任意)" },
      { key: "data_source", label: "データソース", type: "select", options: ["manual", "nmos", "rds"] },
      { key: "note", label: "メモ", type: "textarea" }
    ]
  },
  {
    title: "ST2022-7 パスA",
    fields: [
      { key: "source_addr_a", label: "ソースアドレスA" },
      { key: "source_port_a", label: "ソースポートA", type: "number" },
      { key: "multicast_addr_a", label: "マルチキャストアドレスA" },
      { key: "group_port_a", label: "グループポートA", type: "number" }
    ]
  },
  {
    title: "ST2022-7 パスB",
    fields: [
      { key: "source_addr_b", label: "ソースアドレスB" },
      { key: "source_port_b", label: "ソースポートB", type: "number" },
      { key: "multicast_addr_b", label: "マルチキャストアドレスB" },
      { key: "group_port_b", label: "グループポートB", type: "number" }
    ]
  },
  {
    title: "NMOS メタデータ",
    fields: [
      { key: "transport_protocol", label: "Transport Protocol" },
      { key: "nmos_flow_id", label: "NMOS Flow ID" },
      { key: "nmos_sender_id", label: "NMOS Sender ID" },
      { key: "nmos_device_id", label: "NMOS Device ID" },
      { key: "nmos_is04_host", label: "NMOS IS-04 Host" },
      { key: "nmos_is04_port", label: "NMOS IS-04 Port", type: "number" },
      { key: "nmos_is05_host", label: "NMOS IS-05 Host" },
      { key: "nmos_is05_port", label: "NMOS IS-05 Port", type: "number" }
    ]
  },
  {
    title: "SDP / ラベル",
    fields: [
      { key: "sdp_url", label: "SDP URL" },
      { key: "sdp_cache", label: "SDP Cache", type: "textarea" },
      { key: "nmos_label", label: "NMOS Label" },
      { key: "nmos_description", label: "NMOS Description" },
      { key: "management_url", label: "Management URL" }
    ]
  },
  {
    title: "メディア情報",
    fields: [
      { key: "media_type", label: "Media Type" },
      { key: "st2110_format", label: "ST2110 Format" },
      { key: "redundancy_group", label: "Redundancy Group" }
    ]
  },
  {
    title: "エイリアス",
    fields: Array.from({ length: 8 }).map((_, idx) => ({
      key: `alias${idx + 1}`,
      label: `Alias ${idx + 1}`
    }))
  },
  {
    title: "ステータス / 利用状況",
    fields: [
      { key: "flow_status", label: "Flow Status" },
      { key: "availability", label: "Availability" },
      { key: "last_seen", label: "Last Seen (ISO8601)" }
    ]
  },
  {
    title: "外部参照",
    fields: [
      { key: "rds_address", label: "RDS Address" },
      { key: "rds_api_url", label: "RDS API URL" }
    ]
  },
  {
    title: "ユーザー定義フィールド",
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
  nmos_flow_id: "",
  nmos_sender_id: "",
  nmos_device_id: "",
  nmos_is04_host: "",
  nmos_is04_port: null,
  nmos_is05_host: "",
  nmos_is05_port: null,
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
  note: ""
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
        offset: 0
      },
      quickSearch: DEFAULT_QUICK_SEARCH(),
      advancedSearch: DEFAULT_ADVANCED_SEARCH(),
      advancedCollapsed: false,
      searchMode: null,
      searchResults: [],
      newFlow: DEFAULT_FLOW(),
      editingFlowId: null,
      editingOriginalFlow: null,
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
      detailFlow: null,
      detailEntries: [],
      logs: [],
      fieldGroups: FIELD_GROUPS
    };
  },
  mounted() {
    this.loadBaseUrl();
    if (this.token) {
      this.fetchMe();
    }
    this.refreshFlows();
  },
  methods: {
    log(message) {
      const stamp = new Date().toISOString();
      this.logs.unshift(`[${stamp}] ${message}`);
      if (this.logs.length > 200) this.logs.pop();
    },
    saveBaseUrl() {
      localStorage.setItem("mmam_base_url", this.baseUrl);
      this.log(`Base URL saved: ${this.baseUrl}`);
    },
    loadBaseUrl() {
      this.baseUrl = localStorage.getItem("mmam_base_url") || "http://10.59.100.111:8080";
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
        await this.fetchMe();
        await this.fetchSettings();
        await this.fetchUsers();
        await this.refreshFlows();
      } catch (err) {
        console.error(err);
        this.log(err.message);
      }
    },
    logout() {
      this.token = null;
      this.currentUser = null;
      this.log("Logged out");
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
      }
    },
    authHeaders() {
      const headers = { "Content-Type": "application/json" };
      if (this.token) headers["Authorization"] = `Bearer ${this.token}`;
      return headers;
    },
    async refreshFlows() {
      try {
        const params = new URLSearchParams({
          limit: this.filters.limit,
          offset: this.filters.offset,
          sort_by: "updated_at",
          sort_order: "desc",
          fields: [
            "source_addr_a",
            "source_port_a",
            "multicast_addr_a",
            "group_port_a",
            "source_addr_b",
            "source_port_b",
            "multicast_addr_b",
            "group_port_b"
          ].join(",")
        });
        const resp = await fetch(`${this.baseUrl}/api/flows?${params.toString()}`, {
          headers: this.token ? { Authorization: `Bearer ${this.token}` } : {}
        });
        if (!resp.ok) throw new Error(`Failed to load flows: ${resp.status}`);
        const list = await resp.json();
        this.flows = list;
        this.summary.total = this.filters.offset + list.length;
        this.summary.active = list.filter(f => f.flow_status === "active").length;
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
            "source_addr_a",
            "source_port_a",
            "multicast_addr_a",
            "group_port_a",
            "flow_status",
            "availability"
          ].join(",")
        });
        const resp = await fetch(`${this.baseUrl}/api/flows?${params.toString()}`, {
          headers: this.token ? { Authorization: `Bearer ${this.token}` } : {}
        });
        if (!resp.ok) throw new Error(`Failed to search flows: ${resp.status}`);
        this.searchResults = await resp.json();
        this.searchMode = "Quick / 簡易";
        this.log(`Quick search finished (${this.searchResults.length} hits)`);
      } catch (err) {
        console.error(err);
        this.log(err.message);
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
            "source_addr_a",
            "source_port_a",
            "multicast_addr_a",
            "group_port_a",
            "flow_status",
            "availability"
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
          "alias1"
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
      } catch (err) {
        console.error(err);
        this.log(err.message);
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
        this.detailFlow = data;
        this.detailEntries = Object.entries(data);
      } catch (err) {
        this.log(err.message);
      }
    },
    async loadFlowForEdit(flowId) {
      try {
        const resp = await fetch(`${this.baseUrl}/api/flows/${flowId}`, {
          headers: this.authHeaders()
        });
        if (!resp.ok) throw new Error("Failed to load flow");
        const data = await resp.json();
        this.newFlow = { ...DEFAULT_FLOW(), ...data };
        this.editingFlowId = flowId;
        this.editingOriginalFlow = JSON.parse(JSON.stringify(this.newFlow));
        this.currentView = "newFlow";
        this.log(`Loaded flow ${flowId} into form`);
      } catch (err) {
        this.log(err.message);
      }
    },
    resetFlowForm() {
      this.newFlow = DEFAULT_FLOW();
      this.editingFlowId = null;
      this.editingOriginalFlow = null;
    },
    closeDetail() {
      this.detailFlow = null;
      this.detailEntries = [];
    },
    async submitFlow() {
      try {
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
        } else {
          const resp = await fetch(`${this.baseUrl}/api/flows`, {
            method: "POST",
            headers: this.authHeaders(),
            body: JSON.stringify(payload)
          });
          if (!resp.ok) throw new Error(`Failed to create flow: ${resp.status}`);
          const data = await resp.json();
          this.log(`Flow created: ${data.flow_id}`);
        }
        this.resetFlowForm();
        await this.refreshFlows();
      } catch (err) {
        this.log(err.message);
      }
    },
    async fetchUsers() {
      try {
        const resp = await fetch(`${this.baseUrl}/api/users`, {
          headers: this.authHeaders()
        });
        if (!resp.ok) throw new Error("ユーザー一覧の取得に失敗しました");
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
        if (!resp.ok) throw new Error("ユーザー作成に失敗しました");
        this.log(`ユーザー作成: ${this.newUser.username}`);
        this.newUser = { username: "", password: "", role: "viewer" };
        await this.fetchUsers();
      } catch (err) {
        this.log(err.message);
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
        if (!resp.ok) throw new Error("ユーザー更新に失敗しました");
        this.log(`ユーザー更新: ${user.username}`);
        await this.fetchUsers();
      } catch (err) {
        this.log(err.message);
      }
    },
    async deleteUser(username) {
      if (!confirm(`${username} を削除しますか？`)) return;
      try {
        const resp = await fetch(`${this.baseUrl}/api/users/${username}`, {
          method: "DELETE",
          headers: this.authHeaders()
        });
        if (!resp.ok) throw new Error("ユーザー削除に失敗しました");
        this.log(`ユーザー削除: ${username}`);
        await this.fetchUsers();
      } catch (err) {
        this.log(err.message);
      }
    },
    async fetchSettings() {
      try {
        const resp = await fetch(`${this.baseUrl}/api/settings`, {
          headers: this.authHeaders()
        });
        if (!resp.ok) throw new Error("設定情報の取得に失敗しました");
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
        if (!resp.ok) throw new Error("設定更新に失敗しました");
        const data = await resp.json();
        this.settings[key] = data.value;
        this.log(`設定更新: ${key} = ${data.value}`);
      } catch (err) {
        this.log(err.message);
      }
    },
    closeDetail() {
      this.detailFlow = null;
      this.detailEntries = [];
    }
  }
}).mount("#app");
