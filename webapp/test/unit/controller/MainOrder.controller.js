/*global QUnit*/

sap.ui.define([
	"group3casestudy/controller/MainOrder.controller"
], function (Controller) {
	"use strict";

	QUnit.module("MainOrder Controller");

	QUnit.test("I should test the MainOrder controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
