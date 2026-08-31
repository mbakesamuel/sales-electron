const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  db: {
    getSchemaSummary: () => ipcRenderer.invoke("db:getSchemaSummary"),
    queryTable: (input) => ipcRenderer.invoke("db:queryTable", input),
    getTableSchema: (table) => ipcRenderer.invoke("db:getTableSchema", table),
    insertRow: (input) => ipcRenderer.invoke("db:insertRow", input),
    updateRow: (input) => ipcRenderer.invoke("db:updateRow", input),
    deleteRow: (input) => ipcRenderer.invoke("db:deleteRow", input),
    clearOperationalData: (input) =>
      ipcRenderer.invoke("db:clearOperationalData", input),
  },
  auth: {
    login: (data) => ipcRenderer.invoke("auth:login", data),
    getSession: (token) => ipcRenderer.invoke("auth:getSession", token),
    logout: (token) => ipcRenderer.invoke("auth:logout", token),
    changePassword: (data) => ipcRenderer.invoke("auth:changePassword", data),
  },
  permissions: {
    getSnapshot: (token) => ipcRenderer.invoke("permissions:getSnapshot", token),
    getMatrix: (token) => ipcRenderer.invoke("permissions:getMatrix", token),
    saveMatrix: (input) => ipcRenderer.invoke("permissions:saveMatrix", input),
    listRoles: (token) => ipcRenderer.invoke("permissions:listRoles", token),
    createRole: (input) => ipcRenderer.invoke("permissions:createRole", input),
    updateRole: (input) => ipcRenderer.invoke("permissions:updateRole", input),
    deleteRole: (input) => ipcRenderer.invoke("permissions:deleteRole", input),
  },
  sales: {
    getFormOptions: (userId) => ipcRenderer.invoke("sales:getFormOptions", userId),
    getTaxRatesAsOf: (asOfDate) =>
      ipcRenderer.invoke("sales:getTaxRatesAsOf", asOfDate),
    listSales: (filters) => ipcRenderer.invoke("sales:listSales", filters),
    listPendingSales: () => ipcRenderer.invoke("sales:listPendingSales"),
    listValidationQueue: (userId) =>
      ipcRenderer.invoke("sales:listValidationQueue", userId),
    validateMany: (payload) => ipcRenderer.invoke("sales:validateMany", payload),
    loadSaleByInvoiceNo: (invoiceNo) =>
      ipcRenderer.invoke("sales:loadSaleByInvoiceNo", invoiceNo),
    createSale: (input) => ipcRenderer.invoke("sales:createSale", input),
    validateSale: (payload) => ipcRenderer.invoke("sales:validateSale", payload),
    deleteSale: (payload) => ipcRenderer.invoke("sales:deleteSale", payload),
    listAvailableDeliveryOrders: (payload) =>
      ipcRenderer.invoke("sales:listAvailableDeliveryOrders", payload),
    lookupDeliveryOrder: (payload) =>
      ipcRenderer.invoke("sales:lookupDeliveryOrder", payload),
    loadSalePrintById: (saleId) =>
      ipcRenderer.invoke("sales:loadSalePrintById", saleId),
    previewUnitPrice: (payload) =>
      ipcRenderer.invoke("sales:previewUnitPrice", payload),
    listStorageLocationsWithBalance: (payload) =>
      ipcRenderer.invoke("sales:listStorageLocationsWithBalance", payload),
  },
  vehicleConsignmentNotes: {
    loadSaleByInvoice: (invoiceNo) =>
      ipcRenderer.invoke("vehicleConsignmentNotes:loadSaleByInvoice", invoiceNo),
    loadByVcnNo: (vcnNo) =>
      ipcRenderer.invoke("vehicleConsignmentNotes:loadByVcnNo", vcnNo),
    save: (input) => ipcRenderer.invoke("vehicleConsignmentNotes:save", input),
    delete: (payload) =>
      ipcRenderer.invoke("vehicleConsignmentNotes:delete", payload),
    validate: (payload) =>
      ipcRenderer.invoke("vehicleConsignmentNotes:validate", payload),
    loadPrintById: (noteId) =>
      ipcRenderer.invoke("vehicleConsignmentNotes:loadPrintById", noteId),
    listValidationQueue: (userId) =>
      ipcRenderer.invoke("vehicleConsignmentNotes:listValidationQueue", userId),
    validateMany: (payload) =>
      ipcRenderer.invoke("vehicleConsignmentNotes:validateMany", payload),
  },
  deliveryOrders: {
    getFormOptions: () => ipcRenderer.invoke("deliveryOrders:getFormOptions"),
    loadByNo: (deliveryOrderNo) =>
      ipcRenderer.invoke("deliveryOrders:loadByNo", deliveryOrderNo),
    loadPrintById: (orderId) =>
      ipcRenderer.invoke("deliveryOrders:loadPrintById", orderId),
    trackByNo: (deliveryOrderNo) =>
      ipcRenderer.invoke("deliveryOrders:trackByNo", deliveryOrderNo),
    transferBalance: (input) =>
      ipcRenderer.invoke("deliveryOrders:transferBalance", input),
    listPending: () => ipcRenderer.invoke("deliveryOrders:listPending"),
    listOrders: (filters) => ipcRenderer.invoke("deliveryOrders:listOrders", filters),
    save: (input) => ipcRenderer.invoke("deliveryOrders:save", input),
    deleteOrder: (payload) => ipcRenderer.invoke("deliveryOrders:deleteOrder", payload),
    validateOrder: (payload) =>
      ipcRenderer.invoke("deliveryOrders:validateOrder", payload),
    cancelValidated: (payload) =>
      ipcRenderer.invoke("deliveryOrders:cancelValidated", payload),
    previewTaxes: (payload) => ipcRenderer.invoke("deliveryOrders:previewTaxes", payload),
    previewUnitPrice: (payload) =>
      ipcRenderer.invoke("deliveryOrders:previewUnitPrice", payload),
    previewStockOnHand: (payload) =>
      ipcRenderer.invoke("deliveryOrders:previewStockOnHand", payload),
    listValidationQueue: () => ipcRenderer.invoke("deliveryOrders:listValidationQueue"),
    validateMany: (payload) => ipcRenderer.invoke("deliveryOrders:validateMany", payload),
  },
  carryForward: {
    getFormOptions: () => ipcRenderer.invoke("carryForward:getFormOptions"),
    list: () => ipcRenderer.invoke("carryForward:list"),
    upsert: (input) => ipcRenderer.invoke("carryForward:upsert", input),
    upsertBatch: (input) => ipcRenderer.invoke("carryForward:upsertBatch", input),
    delete: (input) => ipcRenderer.invoke("carryForward:delete", input),
  },
  carryForwardStock: {
    getFormOptions: () => ipcRenderer.invoke("carryForwardStock:getFormOptions"),
    list: () => ipcRenderer.invoke("carryForwardStock:list"),
    listOnHand: (input) => ipcRenderer.invoke("carryForwardStock:listOnHand", input),
    upsertBatch: (input) => ipcRenderer.invoke("carryForwardStock:upsertBatch", input),
  },
  reports: {
    getStockCommitment: (authToken) =>
      ipcRenderer.invoke("reports:getStockCommitment", authToken),
    getStockReport: (authToken) =>
      ipcRenderer.invoke("reports:getStockReport", authToken),
    getCommitmentReport: (authToken) =>
      ipcRenderer.invoke("reports:getCommitmentReport", authToken),
    getBottleOilStockSales: (authToken) =>
      ipcRenderer.invoke("reports:getBottleOilStockSales", authToken),
    getBottledWeeklyIssues: (authToken, estimateBasis, weekMondayIso) =>
      ipcRenderer.invoke(
        "reports:getBottledWeeklyIssues",
        authToken,
        estimateBasis,
        weekMondayIso,
      ),
    getWeekChoices: (authToken) =>
      ipcRenderer.invoke("reports:getWeekChoices", authToken),
    getWeeklyDeliveries: (authToken, weekMondayIso) =>
      ipcRenderer.invoke("reports:getWeeklyDeliveries", authToken, weekMondayIso),
    getMonthlyDelivery: (half, authToken) =>
      ipcRenderer.invoke("reports:getMonthlyDelivery", half, authToken),
    getMonthlyStockReconciliation: (authToken) =>
      ipcRenderer.invoke("reports:getMonthlyStockReconciliation", authToken),
    getMonthlyPaymentDelivery: (authToken) =>
      ipcRenderer.invoke("reports:getMonthlyPaymentDelivery", authToken),
    getMonthlyDeliveriesByDestination: (authToken) =>
      ipcRenderer.invoke("reports:getMonthlyDeliveriesByDestination", authToken),
    getMonthlyPalmOilSales: (authToken) =>
      ipcRenderer.invoke("reports:getMonthlyPalmOilSales", authToken),
    getIndustryProductMonthlySales: (authToken) =>
      ipcRenderer.invoke("reports:getIndustryProductMonthlySales", authToken),
    getBottledPalmOilSalesReturn: (authToken) =>
      ipcRenderer.invoke("reports:getBottledPalmOilSalesReturn", authToken),
    getOtherProductSalesDeliveries: (authToken) =>
      ipcRenderer.invoke("reports:getOtherProductSalesDeliveries", authToken),
    getMonthlyBottledOil: (authToken) =>
      ipcRenderer.invoke("reports:getMonthlyBottledOil", authToken),
    getRevenueTaxes: (authToken, period, salesPointId) =>
      ipcRenderer.invoke("reports:getRevenueTaxes", authToken, period, salesPointId),
    getSalesBudgetMonthlyCrosstab: (authToken, reportYear) =>
      ipcRenderer.invoke("reports:getSalesBudgetMonthlyCrosstab", authToken, reportYear),
    getSalesBudgetWeeklyCrosstab: (authToken, reportYear) =>
      ipcRenderer.invoke("reports:getSalesBudgetWeeklyCrosstab", authToken, reportYear),
    getSalesBudgetMonthlyRevenueCrosstab: (authToken, reportYear) =>
      ipcRenderer.invoke("reports:getSalesBudgetMonthlyRevenueCrosstab", authToken, reportYear),
    getSalesBudgetWeeklyRevenueCrosstab: (authToken, reportYear) =>
      ipcRenderer.invoke("reports:getSalesBudgetWeeklyRevenueCrosstab", authToken, reportYear),
    getDailySales: (authToken, reportDateIso, salesPointId) =>
      ipcRenderer.invoke("reports:getDailySales", authToken, reportDateIso, salesPointId),
    getDailySalesMatrix: (authToken, salesPointId, productId) =>
      ipcRenderer.invoke("reports:getDailySalesMatrix", authToken, salesPointId, productId),
    getPalmOilSalesActivity: (authToken) =>
      ipcRenderer.invoke("reports:getPalmOilSalesActivity", authToken),
    saveReportComments: (authToken, input) =>
      ipcRenderer.invoke("reports:saveReportComments", authToken, input),
    listSignatories: (authToken) =>
      ipcRenderer.invoke("reports:listSignatories", authToken),
    getSignatory: (authToken, asAtIso) =>
      ipcRenderer.invoke("reports:getSignatory", authToken, asAtIso),
    upsertSignatory: (authToken, input) =>
      ipcRenderer.invoke("reports:upsertSignatory", authToken, input),
    deleteSignatory: (authToken, id) =>
      ipcRenderer.invoke("reports:deleteSignatory", authToken, id),
  },
  dashboard: {
    getSummary: (authToken) =>
      ipcRenderer.invoke("dashboard:getSummary", authToken),
  },
  financialYears: {
    listYears: (authToken) =>
      ipcRenderer.invoke("financialYears:listYears", authToken),
    openYear: (authToken, financialYear) =>
      ipcRenderer.invoke("financialYears:openYear", authToken, financialYear),
    closeYear: (authToken, periodId) =>
      ipcRenderer.invoke("financialYears:closeYear", authToken, periodId),
    listMonthsForOpenYear: (authToken) =>
      ipcRenderer.invoke("financialYears:listMonthsForOpenYear", authToken),
    listMonthsForPeriod: (authToken, periodId) =>
      ipcRenderer.invoke("financialYears:listMonthsForPeriod", authToken, periodId),
    setMonthStatus: (authToken, monthId, status) =>
      ipcRenderer.invoke(
        "financialYears:setMonthStatus",
        authToken,
        monthId,
        status,
      ),
    getOpenPostingPeriod: (authToken) =>
      ipcRenderer.invoke("financialYears:getOpenPostingPeriod", authToken),
  },
  stock: {
    getBootstrap: (userId, productFilter) =>
      ipcRenderer.invoke("stock:getBootstrap", userId, productFilter),
    listOnHandAsOf: (userId, payload) =>
      ipcRenderer.invoke("stock:listOnHandAsOf", userId, payload),
    getBinCard: (userId, query) =>
      ipcRenderer.invoke("stock:getBinCard", userId, query),
    saveReceipt: (input) => ipcRenderer.invoke("stock:saveReceipt", input),
    postReceipt: (payload) => ipcRenderer.invoke("stock:postReceipt", payload),
    cancelReceipt: (payload) => ipcRenderer.invoke("stock:cancelReceipt", payload),
    findReceiptByNumber: (payload) =>
      ipcRenderer.invoke("stock:findReceiptByNumber", payload),
    loadReceiptForReview: (payload) =>
      ipcRenderer.invoke("stock:loadReceiptForReview", payload),
    loadReceiptPrintById: (payload) =>
      ipcRenderer.invoke("stock:loadReceiptPrintById", payload),
    loadTransferPrintById: (payload) =>
      ipcRenderer.invoke("stock:loadTransferPrintById", payload),
    saveTransfer: (input) => ipcRenderer.invoke("stock:saveTransfer", input),
    dispatchTransfer: (payload) => ipcRenderer.invoke("stock:dispatchTransfer", payload),
    postInternalTransfer: (payload) =>
      ipcRenderer.invoke("stock:postInternalTransfer", payload),
    receiveTransfer: (input) => ipcRenderer.invoke("stock:receiveTransfer", input),
    cancelTransfer: (payload) => ipcRenderer.invoke("stock:cancelTransfer", payload),
    findTransferByNumber: (payload) =>
      ipcRenderer.invoke("stock:findTransferByNumber", payload),
    loadTransferForReview: (payload) =>
      ipcRenderer.invoke("stock:loadTransferForReview", payload),
    saveAdjustment: (input) => ipcRenderer.invoke("stock:saveAdjustment", input),
    postAdjustment: (payload) => ipcRenderer.invoke("stock:postAdjustment", payload),
    cancelAdjustment: (payload) => ipcRenderer.invoke("stock:cancelAdjustment", payload),
    findAdjustmentByNumber: (payload) =>
      ipcRenderer.invoke("stock:findAdjustmentByNumber", payload),
    loadAdjustmentForReview: (payload) =>
      ipcRenderer.invoke("stock:loadAdjustmentForReview", payload),
    listValidationQueue: (userId) =>
      ipcRenderer.invoke("stock:listValidationQueue", userId),
    listReceiveQueue: (userId) =>
      ipcRenderer.invoke("stock:listReceiveQueue", userId),
    validateMany: (payload) => ipcRenderer.invoke("stock:validateMany", payload),
    getIntakeOilGroupingStatus: () =>
      ipcRenderer.invoke("stock:getIntakeOilGroupingStatus"),
    applyIntakeOilGrouping: (payload) =>
      ipcRenderer.invoke("stock:applyIntakeOilGrouping", payload),
  },
  dialog: {
    confirm: (message) => ipcRenderer.sendSync("dialog:confirm", message),
    alert: (message) => ipcRenderer.sendSync("dialog:alert", message),
  },
  print: {
    exportPdf: (defaultFileName) =>
      ipcRenderer.invoke("print:exportPdf", defaultFileName),
  },
  windows: {
    openReport: (authToken, reportId, query) =>
      ipcRenderer.invoke("windows:openReport", authToken, reportId, query),
    onReportClosed: (callback) => {
      const listener = (_event, payload) => {
        callback(payload);
      };
      ipcRenderer.on("report-window:closed", listener);
      return () => {
        ipcRenderer.removeListener("report-window:closed", listener);
      };
    },
  },
  reportWindow: {
    getBootstrap: (reportId) =>
      ipcRenderer.invoke("report-window:getBootstrap", reportId),
    onBootstrap: (callback) => {
      const listener = (_event, payload) => {
        callback(payload);
      };
      ipcRenderer.on("report-window:bootstrap", listener);
      return () => {
        ipcRenderer.removeListener("report-window:bootstrap", listener);
      };
    },
  },
});
