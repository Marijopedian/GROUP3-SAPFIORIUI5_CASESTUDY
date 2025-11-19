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
    "sap/m/Select"
], function (Controller, JSONModel, MessageBox, MessageToast, Dialog, SearchField, List, StandardListItem, Input, Label, Button, Select) {
    "use strict";

    return Controller.extend("group3casestudy.controller.CreateOrder", {

        /** 
         * onInit: Called when the view is initialized.
         * - Creates a new order object with default values.
         * - Loads ReceivingPlants, DeliveringPlants, and Products from the main model.
         * - Sets a JSONModel for the view.
         */
        onInit: function () {
            var oMainModel = this.getOwnerComponent().getModel(); // Get main model
            var oData = oMainModel.getData(); // Get all data from main model

            // Generate next Order ID
            var nextId = Math.max(...oData.Orders.map(o => o.OrderID)) + 1;

            // Create a new order structure
            var oNewOrder = {
                OrderID: nextId,
                CreationDate: new Date().toISOString().split("T")[0],
                ReceivingPlant: "",
                ReceivingPlantDesc: "",
                DeliveringPlant: "",
                DeliveringPlantDesc: "",
                StatusCode: "CR", // Created status
                Products: []
            };

            // Set JSONModel for the view
            var oViewModel = new JSONModel({
                NewOrder: oNewOrder,
                ReceivingPlants: oData.ReceivingPlants,
                DeliveringPlants: oData.DeliveringPlants,
                AllProducts: oData.Products
            });
            this.getView().setModel(oViewModel);
        },

        /**
         * Helper function to open a dialog for selecting a plant.
         * @param {string} title - Dialog title
         * @param {string} path - Path to plant array in model
         * @param {string} idProp - Property path for Plant ID
         * @param {string} descProp - Property path for Plant Description
         */
        _openPlantDialog: function (title, path, idProp, descProp) {
            var oModel = this.getView().getModel();
            var oDialog = new Dialog({
                title: title,
                content: [
                    // Search field for filtering plant list
                    new SearchField({
                        liveChange: function (oEvent) {
                            var q = oEvent.getParameter("newValue").toLowerCase();
                            oList.getItems().forEach(i => i.setVisible(i.getTitle().toLowerCase().includes(q)));
                        }
                    }),
                    new List()
                ]
            });

            var oList = oDialog.getContent()[1];
            // Add plants to the list
            oModel.getProperty(path).forEach(p => {
                oList.addItem(new StandardListItem({
                    title: p.PlantDescription,
                    type: "Active",
                    press: () => {
                        oModel.setProperty(idProp, p.PlantID.toString());
                        oModel.setProperty(descProp, p.PlantDescription);
                        oDialog.close();
                    }
                }));
            });

            oDialog.addButton(new Button({ text: "Close", press: () => oDialog.close() }));
            oDialog.open();
        },

        /** Open Receiving Plant selection dialog */
        onReceivingPlantHelp: function () {
            this._openPlantDialog("Select Receiving Plant", "/ReceivingPlants", "/NewOrder/ReceivingPlant", "/NewOrder/ReceivingPlantDesc");
        },

        /** Open Delivering Plant selection dialog */
        onDeliveringPlantHelp: function () {
            this._openPlantDialog("Select Delivering Plant", "/DeliveringPlants", "/NewOrder/DeliveringPlant", "/NewOrder/DeliveringPlantDesc");
        },

        /**
         * onAddProduct: Opens a dialog to add a product.
         * - Filters products based on selected Delivering Plant.
         * - Allows user to select product and enter quantity.
         */
        onAddProduct: function () {
            var oModel = this.getView().getModel();
            var plant = oModel.getProperty("/NewOrder/DeliveringPlant");

            if (!plant) {
                MessageToast.show("Please select a Delivering Plant first.");
                return;
            }

            // Filter products by Delivering Plant
            var products = oModel.getProperty("/AllProducts").filter(p => p.DeliveringPlant === parseInt(plant));

            // Create dialog for product selection
            var oDialog = new Dialog({
                title: "Add Product",
                content: [
                    new Label({ text: "Product" }),
                    new Select({
                        id: "productSelect",
                        items: products.map(p => new sap.ui.core.Item({ key: p.ProductID, text: p.ProductDescription }))
                    }),
                    new Label({ text: "Quantity" }),
                    new Input({ id: "quantityInput", type: "Number", value: "1" })
                ],
                beginButton: new Button({
                    text: "Add",
                    press: () => {
                        var id = sap.ui.getCore().byId("productSelect").getSelectedKey();
                        var qty = parseInt(sap.ui.getCore().byId("quantityInput").getValue());

                        if (!id || qty <= 0) {
                            MessageToast.show("Invalid input.");
                            return;
                        }

                        var prod = products.find(p => p.ProductID == id);
                        var order = oModel.getProperty("/NewOrder");

                        // Prevent duplicate products
                        if (order.Products.some(p => p.ProductID == id)) {
                            MessageToast.show("Product already added.");
                            return;
                        }

                        // Add product to order
                        order.Products.push({
                            ProductID: prod.ProductID,
                            ProductDescription: prod.ProductDescription,
                            Quantity: qty,
                            PricePerQuantity: prod.PricePerQuantity,
                            TotalPrice: prod.PricePerQuantity * qty
                        });

                        oModel.refresh();
                        oDialog.close();
                    }
                }),
                endButton: new Button({ text: "Cancel", press: () => oDialog.close() })
            });

            oDialog.open();
        },

        /**
         * onDeleteProduct: Deletes selected products from the table.
         */
        onDeleteProduct: function () {
            var oTable = this.byId("productsTable");
            var selected = oTable.getSelectedItems();

            if (!selected.length) {
                MessageToast.show("Select items to delete.");
                return;
            }

            MessageBox.confirm("Delete selected products?", {
                onClose: a => {
                    if (a === "OK") {
                        var oModel = this.getView().getModel();
                        var products = oModel.getProperty("/NewOrder/Products");

                        selected.forEach(i => {
                            var desc = i.getBindingContext().getObject().ProductDescription;
                            products = products.filter(p => p.ProductDescription !== desc);
                        });

                        oModel.setProperty("/NewOrder/Products", products);
                        oModel.refresh();
                    }
                }
            });
        },

        /**
         * onSave: Validates and saves the new order to the main model.
         */
        onSave: function () {
            var oModel = this.getView().getModel();
            var order = oModel.getProperty("/NewOrder");

            if (!order.ReceivingPlant || !order.DeliveringPlant || !order.Products.length) {
                MessageToast.show("Complete all fields and add at least one product.");
                return;
            }

            MessageBox.confirm("Save order?", {
                onClose: a => {
                    if (a === "OK") {
                        var mainModel = this.getOwnerComponent().getModel();
                        mainModel.getData().Orders.push(order);
                        mainModel.refresh();
                        MessageToast.show("Order " + order.OrderID + " saved.");
                        this.onNavBack();
                    }
                }
            });
        },

        /** onCancel: Navigates back to Main page without saving */
        onCancel: function () {
            this.onNavBack();
        },

        /** onNavBack: Navigates to Main page */
        onNavBack: function () {
            sap.ui.core.UIComponent.getRouterFor(this).navTo("Main");
        }
    });
});