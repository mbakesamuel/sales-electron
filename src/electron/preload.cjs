const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  db: {
    getSchemaSummary: () => ipcRenderer.invoke("db:getSchemaSummary"),
    queryTable: (input) => ipcRenderer.invoke("db:queryTable", input),
    getTableSchema: (table) => ipcRenderer.invoke("db:getTableSchema", table),
    insertRow: (input) => ipcRenderer.invoke("db:insertRow", input),
    updateRow: (input) => ipcRenderer.invoke("db:updateRow", input),
    deleteRow: (input) => ipcRenderer.invoke("db:deleteRow", input),
  },
  auth: {
    login: (data) => ipcRenderer.invoke("auth:login", data),
    getSession: (token) => ipcRenderer.invoke("auth:getSession", token),
    logout: (token) => ipcRenderer.invoke("auth:logout", token),
  },
  permissions: {
    getSnapshot: (token) => ipcRenderer.invoke("permissions:getSnapshot", token),
    getMatrix: (token) => ipcRenderer.invoke("permissions:getMatrix", token),
    saveMatrix: (input) => ipcRenderer.invoke("permissions:saveMatrix", input),
  },
  sales: {
    getFormOptions: () => ipcRenderer.invoke("sales:getFormOptions"),
    getTaxRatesAsOf: (asOfDate) =>
      ipcRenderer.invoke("sales:getTaxRatesAsOf", asOfDate),
    listSales: (filters) => ipcRenderer.invoke("sales:listSales", filters),
    listPendingSales: () => ipcRenderer.invoke("sales:listPendingSales"),
    loadSaleByInvoiceNo: (invoiceNo) =>
      ipcRenderer.invoke("sales:loadSaleByInvoiceNo", invoiceNo),
    createSale: (input) => ipcRenderer.invoke("sales:createSale", input),
    validateSale: (payload) => ipcRenderer.invoke("sales:validateSale", payload),
    deleteSale: (payload) => ipcRenderer.invoke("sales:deleteSale", payload),
    listAvailableDeliveryOrders: (salesPointId) =>
      ipcRenderer.invoke("sales:listAvailableDeliveryOrders", salesPointId),
    lookupDeliveryOrder: (payload) =>
      ipcRenderer.invoke("sales:lookupDeliveryOrder", payload),
    loadSalePrintById: (saleId) =>
      ipcRenderer.invoke("sales:loadSalePrintById", saleId),
    previewUnitPrice: (payload) =>
      ipcRenderer.invoke("sales:previewUnitPrice", payload),
  },
  deliveryOrders: {
    getFormOptions: () => ipcRenderer.invoke("deliveryOrders:getFormOptions"),
    loadByNo: (deliveryOrderNo) =>
      ipcRenderer.invoke("deliveryOrders:loadByNo", deliveryOrderNo),
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
  reports: {
    getStockCommitment: (authToken) =>
      ipcRenderer.invoke("reports:getStockCommitment", authToken),
    getStockReport: (authToken) =>
      ipcRenderer.invoke("reports:getStockReport", authToken),
    getCommitmentReport: (authToken) =>
      ipcRenderer.invoke("reports:getCommitmentReport", authToken),
    getBottleOilStockSales: (authToken) =>
      ipcRenderer.invoke("reports:getBottleOilStockSales", authToken),
    getBottledWeeklyIssues: (authToken) =>
      ipcRenderer.invoke("reports:getBottledWeeklyIssues", authToken),
    getWeeklyDeliveries: (authToken) =>
      ipcRenderer.invoke("reports:getWeeklyDeliveries", authToken),
    getMonthlyDelivery: (half, authToken) =>
      ipcRenderer.invoke("reports:getMonthlyDelivery", half, authToken),
    getSalesBudgetMonthlyCrosstab: (authToken, reportYear) =>
      ipcRenderer.invoke("reports:getSalesBudgetMonthlyCrosstab", authToken, reportYear),
    getSalesBudgetWeeklyCrosstab: (authToken, reportYear) =>
      ipcRenderer.invoke("reports:getSalesBudgetWeeklyCrosstab", authToken, reportYear),
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
    getBootstrap: (userId) => ipcRenderer.invoke("stock:getBootstrap", userId),
    saveReceipt: (input) => ipcRenderer.invoke("stock:saveReceipt", input),
    postReceipt: (payload) => ipcRenderer.invoke("stock:postReceipt", payload),
    cancelReceipt: (payload) => ipcRenderer.invoke("stock:cancelReceipt", payload),
    findReceiptByNumber: (payload) =>
      ipcRenderer.invoke("stock:findReceiptByNumber", payload),
    loadReceiptForReview: (payload) =>
      ipcRenderer.invoke("stock:loadReceiptForReview", payload),
    saveTransfer: (input) => ipcRenderer.invoke("stock:saveTransfer", input),
    dispatchTransfer: (payload) => ipcRenderer.invoke("stock:dispatchTransfer", payload),
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
  },
});
