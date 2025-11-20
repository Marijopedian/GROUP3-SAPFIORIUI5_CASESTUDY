sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageBox",
  "sap/m/MessageToast",
  "sap/m/Dialog",
  "sap/m/SearchField",
  "sap/m/List",
  "sap/m/StandardListItem",
  "sap/m/Input",
  "sap/m/Label",
  "sap/m/Button",
  "sap/m/Select",
   "sap/ui/core/routing/History"
], function (Controller, JSONModel, MessageBox, MessageToast, Dialog, SearchField, List, StandardListItem, Input, Label, Button, Select, History) {
  "use strict";
 
  return Controller.extend("group3casestudy.controller.CreateOrder", {
    onInit: function () {
      //  Load data model from JSON
      var oDataModel = new JSONModel();
      oDataModel.loadData("./webapp/localService/mainService/data/Orders.json");
 
      this.getView().setModel(oDataModel, "Orders");
 
      // After data is loaded, prepare the view model (vm)
      oDataModel.attachRequestCompleted(function () {
        var oData = oDataModel.getData() || {};
 
        var aOrders = Array.isArray(oData.Orders) ? oData.Orders : [];
        var nextOrderId = this._getNextOrderId(aOrders);
 
        var oNewOrder = {
          OrderID: nextOrderId,
          CreationDate: new Date().toISOString().split("T")[0],
          ReceivingPlant: "",
          ReceivingPlantDesc: "",
          DeliveringPlant: "",
          DeliveringPlantDesc: "",
          StatusCode: "CR", // Created
          Products: []
        };
 
        var oViewModel = new JSONModel({
          NewOrder: oNewOrder,
          ReceivingPlants: oData.ReceivingPlants || [],
          DeliveringPlants: oData.DeliveringPlants || [],
          AllProducts: oData.Products || []
        });
 
        // Set VM as a named model for clear bindings
        this.getView().setModel(oViewModel, "vm");
      }.bind(this));
 
      var oRouter = this.getOwnerComponent().getRouter();
      oRouter.getRoute("CreateOrder").attachPatternMatched(this._onObjectMatched, this);
    },
 
    _getNextOrderId: function (aOrders) {
      if (!Array.isArray(aOrders) || aOrders.length === 0) {
        return 1;
      }
      return Math.max.apply(null, aOrders.map(function (o) {
        return Number(o.OrderID) || 0;
      })) + 1;
    },
 
    // ============================
    // Value Help for Receiving Plant
    // ============================
    onReceivingPlantHelp: function () {
      var oView = this.getView();
      var oTargetModel = oView.getModel("vm");
      var oReceivingPlantInput = oView.byId("receivingPlantInput");
      var aPlants = oView.getModel("receivingPlantsModel").getData();
      var oDialog;

      var oList = new List({
        id: oView.createId("receivingList"),
        selectionMode: "None"
      });

      aPlants.forEach(function (p) {
        oList.addItem(new StandardListItem({
          title: p.PlantDescription,
          description: "ID: " + p.PlantID,
          type: "Active",

          press: function () {
            oReceivingPlantInput.setValue(p.PlantDescription);
            oTargetModel.setProperty("/NewOrder/ReceivingPlant", p.PlantDescription);
            oDialog.close();
            oDialog.destroy();
          }
        }));
      });

      var oSearchField = new SearchField({
        id: oView.createId("receivingSearchField"),
        liveChange: function (oEvent) {
          var sQuery = (oEvent.getParameter("newValue") || "").toLowerCase();

          oList.getItems().forEach(function (item) {
            var sTitle = item.getTitle().toLowerCase();
            var sDescription = item.getDescription().toLowerCase();
            var bVisible = sTitle.includes(sQuery) || sDescription.includes(sQuery);
            item.setVisible(bVisible);
          });
        }
      });

      oDialog = new Dialog({
        id: oView.createId("receivingPlantDialog"),
        title: "Select Receiving Plant",
        contentWidth: "400px",
        content: [
          oSearchField,
          oList
        ],
        beginButton: new Button({
          text: "Close",
          press: function () {
            oDialog.close();
            oDialog.destroy();
          }
        }),

        afterClose: function () {
          oDialog.destroy();
        }
      });

      oView.addDependent(oDialog);
      oDialog.open();
    },

 
    // ============================
    // Value Help for Delivering Plant
    // ============================
    onDeliveringPlantHelp: function () {
      var oView = this.getView();
      var oTargetModel = oView.getModel("vm");
      var oDeliveringPlantInput = oView.byId("deliveringPlantInput");
      var aPlants = oView.getModel("deliveryPlantsModel").getData();
      var oDialog;

      var oList = new List({
        id: oView.createId("deliveringList"),
        selectionMode: "None"
      });

      aPlants.forEach(function (p) {
        oList.addItem(new StandardListItem({
          title: p.PlantDescription,
          description: "ID: " + p.PlantID,
          type: "Active",

          press: function () {
            oDeliveringPlantInput.setValue(p.PlantDescription);
            oTargetModel.setProperty("/NewOrder/DeliveringPlantDesc", p.PlantDescription);
            oDialog.close();
            oDialog.destroy();
          }
        }));
      });

      var oSearchField = new SearchField({
        id: oView.createId("deliveringSearchField"),
        liveChange: function (oEvent) {
          var sQuery = (oEvent.getParameter("newValue") || "").toLowerCase();

          oList.getItems().forEach(function (item) {
            var sTitle = item.getTitle().toLowerCase();
            var sDescription = item.getDescription().toLowerCase();
            var bVisible = sTitle.includes(sQuery) || sDescription.includes(sQuery);
            item.setVisible(bVisible);
          });
        }
      });

      oDialog = new Dialog({
        id: oView.createId("deliveringPlantDialog"),
        title: "Select Delivering Plant",
        contentWidth: "400px",
        content: [
          oSearchField,
          oList
        ],
        beginButton: new Button({
          text: "Close",
          press: function () {
            oDialog.close();
            oDialog.destroy();
          }
        }),

        afterClose: function () {
          oDialog.destroy();
        }
      });

      oView.addDependent(oDialog);
      oDialog.open();
    },
 
    // ============================
    // Add Product dialog with quantity input
    // ============================
    onAddProduct: function () {
      var oController = this;
      var oView = oController.getView();
      var oViewModel = oView.getModel("vm");
      var sDeliveringPlant = oViewModel.getProperty("/NewOrder/DeliveringPlant");

      if (!sDeliveringPlant) {
        MessageToast.show("Please select a Delivering Plant first.");
        return;
      }

      var aAllProducts = oView.getModel("productsModel").getData() || [];
      var aFiltered = aAllProducts.filter(function (p) {
        return String(p.DeliveringPlant) === String(sDeliveringPlant);
      });

      var oDialog = new Dialog({
        id: oView.createId("addProductDialog"),
        title: "Add Product",
        content: [
          new Label({ id: oView.createId("productSelectLabel"), text: "Select Product" }),
          new Select({
            id: oView.createId("productSelect"),
            items: aAllProducts.map(function (p) {
              return new sap.ui.core.Item({
                key: p.ProductID,
                text: p.ProductDescription
              });
            })
          }),
          new Label({ id: oView.createId("quantityLabel"), text: "Enter Quantity" }),
          new Input({ id: oView.createId("quantityInput"), type: "Number", value: "1" })
        ],

        beginButton: new Button({
          text: "Add",
          press: function () {
            var sProductId = oView.byId("productSelect").getSelectedKey();
            var iQuantity = parseInt(oView.byId("quantityInput").getValue(), 10);

            if (!sProductId || isNaN(iQuantity) || iQuantity <= 0) {
              MessageToast.show("Please select a product and enter a valid quantity.");
              return;
            }
            var oProduct = oView.getModel("productsModel").getData().find(function (p) {
              return String(p.ProductID) === String(sProductId);
            });

            oController._addProductToOrder(oProduct, iQuantity);
            oDialog.close();
          }
        }),

        endButton: new Button({
          text: "Cancel",
          press: function () {
            oDialog.close();
          }
        }),
        afterClose: function () {
          oDialog.destroy();
        }
      });

      oView.addDependent(oDialog);
      oDialog.open();
    },

    _addProductToOrder: function (oProduct, iQuantity) {
      var oViewModel = this.getView().getModel("vm");

      var fPricePerQuantity = parseFloat(1);
      var fTotalPrice = fPricePerQuantity * iQuantity;


      var oNewItem = {
        ProductID: oProduct.ProductID,
        ProductDescription: oProduct.ProductDescription,
        Quantity: iQuantity,
        PricePerQuantity: oProduct.PricePerQuantity,
        TotalPrice: oProduct.PricePerQuantity * iQuantity
      };

      var aCurrentProducts = oViewModel.getProperty("/NewOrder/Products") || [];
      var oExistingItem = aCurrentProducts.find(function (item) {
        return item.ProductID === oNewItem.ProductID;
      });

      if (oExistingItem) {

        oExistingItem.Quantity += iQuantity;
        oExistingItem.TotalPrice = oExistingItem.Quantity * oExistingItem.PricePerQuantity;

        oViewModel.refresh(true);
        sap.m.MessageToast.show("Quantity updated for " + aAllProducts.ProductDescription);

      } else {
        aCurrentProducts.push(oNewItem);

        oViewModel.setProperty("/NewOrder/Products", aCurrentProducts);
        oViewModel.refresh(true);
      }
    },
 
    onDeleteProduct: function () {
      var oTable = this.byId("productsTable");
      var aSelected = oTable.getSelectedItems();
 
      if (aSelected.length === 0) {
        MessageToast.show("Please select at least one product to delete.");
        return;
      }
 
      MessageBox.confirm("Are you sure you want to delete selected item(s)?", {
        onClose: function (oAction) {
          if (oAction === "OK") {
            var oViewModel = this.getView().getModel("vm");
            var aProducts = oViewModel.getProperty("/NewOrder/Products");
 
            aSelected.forEach(function (item) {
              var sProductDesc = item.getBindingContext("vm").getObject().ProductDescription;
              aProducts = aProducts.filter(function (p) { return p.ProductDescription !== sProductDesc; });
            });
 
            oViewModel.setProperty("/NewOrder/Products", aProducts);
            oViewModel.refresh(true);
          }
        }.bind(this)
      });
    },
 

    onSave: function () {

              var oInputDPlantValue = this.getView().byId("receivingPlantInput").getValue();
              var oInputRPlantValue = this.getView().byId("deliveringPlantInput").getValue();

             if (oInputDPlantValue === "" && oInputRPlantValue === "") {
                  MessageBox.error("Delivering Plant and Receiving Plant Required");
                  return;
             } else if (oInputDPlantValue === "") {
                  MessageBox.error("Delivering plant required");
                  return;
             } else if (oInputRPlantValue === "") {
                  MessageBox.error("Receiving Plant required");
                  return;
             }
 
             
      const oModel = this.getView().getModel();
      const sPath = "/Orders";
      var aAllDPlants = this.getView().getModel("deliveryPlantsModel").getData();
      var sDeliveringPlantDescription = this.getView().getModel("vm").getProperty("/NewOrder/DeliveringPlant");
      var oFoundDPlant = aAllDPlants.find(function (oPlant) {
        return oPlant.PlantDescription === sDeliveringPlantDescription;
      });
      var iDeliveringPlantID = null;
      if (oFoundDPlant) {
        iDeliveringPlantID = oFoundDPlant.PlantID;
      }

      var aAllRPlants = this.getView().getModel("receivingPlantsModel").getData();
      var sReceivingPlantDescription = this.getView().getModel("vm").getProperty("/NewOrder/ReceivingPlant");
      var oFoundRPlant = aAllRPlants.find(function (oPlant) {
        return oPlant.PlantDescription === sReceivingPlantDescription;
      });
      var iReceivingID = null;
      if (oFoundRPlant) {
        iReceivingID = oFoundRPlant.PlantID;
      }

      
      var aOrderDetails = sap.ui.getCore().tableLength;
      console.log(aOrderDetails)

      var sOrderID = aOrderDetails + 1;
      const oNewOrderData = {

        OrderID: parseFloat(sOrderID),
        CreationDate: new Date(),
        ReceivingPlantID: parseFloat(iReceivingID),
        DeliveringPlantID: parseFloat(iDeliveringPlantID),
        ReceivingPlantDesc: this.getView().getModel("vm").getProperty("/NewOrder/ReceivingPlant"),
        DeliveringPlantDesc: this.getView().getModel("vm").getProperty("/NewOrder/DeliveringPlant"),
        StatusDesc: "Created",
      };
      oModel.create(sPath, oNewOrderData, {
        success: function (oData, oResponse) {
          MessageToast.show("Order " + oData.OrderID + " created successfully!");
          var oHistory = sap.ui.core.routing.History.getInstance();
          var sPreviousHash = oHistory.getPreviousHash();
          window.history.go(-1);

        },
        error: function (oError) {

          console.error("Create Order failed:", oError);
        }
      });

    },

    onCancel: function () {
      MessageBox.confirm("Are you sure you want to cancel?", {
        onClose: function (oHistory) {
         var oHistory = History.getInstance();
         var sPreviousHash = oHistory.getPreviousHash();
         var oRouter = this.getOwnerComponent().getRouter();
 
         if (sPreviousHash !== undefined) {
                    window.history.go(-1);
         } else {
                    oRouter.navTo("RouteMainOrder", {}, true);
         }
        }.bind(this)
      });

    },

 
    onNavBack: function () {
      var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo("RouteMainOrder", null);
    }
   
 
 
 
  });
});
