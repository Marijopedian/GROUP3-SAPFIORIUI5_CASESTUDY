sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History"
], function(Controller, JSONModel, History) {
    "use strict";

    return Controller.extend("group3casestudy.controller.DetailOrder", {

        onInit: function() {
            let oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteDetailOrder").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function(oEvent) {
            let sOrderID = oEvent.getParameter("arguments").OrderID;

            let oModel = this.getView().getModel();
            let oView = this.getView();

            oModel.read("/Orders('" + sOrderID + "')", {
                success: function(oData) {
                    let oOrderModel = new JSONModel(oData);
                    oView.setModel(oOrderModel, "OrderDetail");

                    oModel.read("/Products", {
                        success: function(oProductsData) {
                            let aFilteredProducts = oProductsData.results.filter(function(p) {
                                return p.OrderID == sOrderID;
                            });
                            let oProductsModel = new JSONModel(aFilteredProducts);
                            oView.setModel(oProductsModel, "OrderProducts");
                        },
                        error: function() {
                            console.error("Failed to load products");
                        }
                    });
                },
                error: function() {
                    console.error("Failed to load order");
                }
            });
        },

        onPressBack: function() {
            let oHistory = History.getInstance();
            let sPreviousHash = oHistory.getPreviousHash();
            if (sPreviousHash) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("RouteMainOrder", {}, true);
            }
        },
    });
});
