sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (Controller, MessageBox, MessageToast) {
    "use strict";

    return Controller.extend("group3casestudy.controller.MainOrder", {
        onInit: function () {
            // existing init logic (if any) can stay here
        },

        formatReceivingPlantDesc: function(receivingPlant, ReceivingPlant, receivingPlantsArray) {
            var id = (receivingPlant !== undefined && receivingPlant !== null) ? receivingPlant : ReceivingPlant;
            if (!id || !Array.isArray(receivingPlantsArray)) { return ''; }
            var p = receivingPlantsArray.find(function(x){ return x.PlantID == id; });
            return p ? p.PlantDescription : '';
        },

        onClear: function () {
            var oView = this.getView();

            // 1. Clear Order Number input
            oView.byId("orderInput").setValue("");

            // 2. Clear DatePicker
            oView.byId("datePicker").setDateValue(null);
            oView.byId("datePicker").setValue("");   // ensures empty UI

            // 3. Clear MultiComboBox selections
            oView.byId("statusFilter").removeAllSelectedItems();

            // 4. Optional: Clear filters applied to the table
            var oTable = oView.byId("orderTable");
            var oBinding = oTable && oTable.getBinding("items");
            if (oBinding) {
                oBinding.filter([]);   // removes all filters
            }

            console.log("Filters cleared");
        },

        onFilter: function () {
            var oView = this.getView();
            var aFilters = [];

            // 1. Order Number filter (input)
            var sOrder = oView.byId("orderInput").getValue();
            if (sOrder) {
                // If user typed only digits, treat as numeric and use EQ
                if (/^\d+$/.test(sOrder)) {
                    aFilters.push(
                        new sap.ui.model.Filter("OrderID", sap.ui.model.FilterOperator.EQ, parseInt(sOrder, 10))
                    );
                } else {
                    // Otherwise do a contains on the string representation (if you ever use textual ids)
                    aFilters.push(
                        new sap.ui.model.Filter("OrderID", sap.ui.model.FilterOperator.Contains, sOrder)
                    );
                }
            }

            // 2. Creation Date filter (date picker)
            var oDatePicker = oView.byId("datePicker");
            var oDate = oDatePicker.getDateValue();
            if (oDate) {
                // create new Date instances (do not mutate the original)
                var oLower = new Date(oDate.getFullYear(), oDate.getMonth(), oDate.getDate(), 0, 0, 0, 0);
                var oUpper = new Date(oDate.getFullYear(), oDate.getMonth(), oDate.getDate(), 23, 59, 59, 999);

                // For OData v2 model the filter values can be JS Date objects for Edm.DateTime
                aFilters.push(
                    new sap.ui.model.Filter({
                        path: "CreationDate",
                        operator: sap.ui.model.FilterOperator.BT,
                        value1: oLower,
                        value2: oUpper
                    })
                );
            }

            // 3. Status filter (multicombo)
            var oStatusMCB = oView.byId("statusFilter");
            var aSelected = oStatusMCB.getSelectedKeys(); // e.g. ["CR","RL"]
            if (aSelected && aSelected.length > 0) {
                var aStatusFilters = aSelected.map(function (status) {
                    return new sap.ui.model.Filter("StatusCode", sap.ui.model.FilterOperator.EQ, status);
                });
                aFilters.push(new sap.ui.model.Filter({ filters: aStatusFilters, and: false })); // OR logic
            }

            // 4. Apply filters to the table binding
            var oTable = oView.byId("orderTable");
            var oBinding = oTable && oTable.getBinding("items");
            if (oBinding) {
                // apply the combined filters (UI5/OData v2 will request the server if configured)
                oBinding.filter(aFilters);
            }

            // Optional: update title / count
            if (this._updateTitle) {
                this._updateTitle();
            }
        },

        onDelete: function () {
            var oView = this.getView();
            var oTable = oView.byId("orderTable");

            if (!oTable) {
                MessageBox.error("Table not found.");
                return;
            }

            var aSelected = oTable.getSelectedItems ? oTable.getSelectedItems() : [];

            // 1. No selection → show error message
            if (!aSelected || aSelected.length === 0) {
                MessageBox.error("Please select an item from the table.");
                return;
            }

            // 2. Build confirmation text
            var iCount = aSelected.length;
            var sMsg = "Are you sure you want to delete " + iCount + " item" + (iCount > 1 ? "s" : "") + "?";

            // keep references to selected items (they remain valid in callback)
            var aToRemove = aSelected.slice();

            // 3. Show confirmation dialog
            MessageBox.confirm(sMsg, {
                title: "Confirm Deletion",
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                onClose: function (oAction) {

                    // 4. User clicked "Yes"
                    if (oAction === MessageBox.Action.YES) {

                        aToRemove.forEach(function (oItem) {
                            try {
                                // remove UI row (does not alter mock JSON file)
                                if (oTable.removeItem) {
                                    oTable.removeItem(oItem);
                                } else {
                                    // fallback: remove from aggregation
                                    oTable.removeAggregation("items", oItem, true);
                                }
                            } catch (e) {
                                // ignore single failures
                                console.warn("Failed to remove item", e);
                            }
                        });

                        // clear any remaining selections
                        if (oTable.removeSelections) {
                            oTable.removeSelections();
                        } else if (oTable.clearSelection) {
                            oTable.clearSelection();
                        }

                        // optional: update title / count if you have this function
                        if (this._updateTitle) {
                            try { this._updateTitle(); } catch (e) { /* ignore */ }
                        }

                        MessageToast.show("Item(s) deleted.");
                    }

                    // 5. User clicked "No" → do nothing
                }.bind(this)
            });
        }

    });
});
