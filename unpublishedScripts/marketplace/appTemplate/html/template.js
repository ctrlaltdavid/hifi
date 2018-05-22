//
//  html\template.js
//
//  Created by David Rowe on 22 May 2018.
//  Copyright 2018 High Fidelity, Inc.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

this.ui = (function () {

    "use strict";

    var isActive = false,

        // EventBridge messages.
        SET_ACTIVE_MESSAGE = "setActive";

    function onToggleActiveClick() {
        isActive = !isActive;

        // Notify main script. It closes the dialog.
        EventBridge.emitWebEvent(JSON.stringify({
            command: SET_ACTIVE_MESSAGE,
            value: isActive
        }));
    }

    function onLoad() {
        var ICON_DIV = "icon",
            TOGGLE_ACTIVE_BUTTON_ID = "toggle-active",
            iconDiv,
            toggleActiveButton;

        // Initial button active state is communicated via URL parameter.
        isActive = location.search.replace("?active=", "") === "true";

        // Set UI elements per active state.
        iconDiv = document.getElementById(ICON_DIV);
        iconDiv.className = isActive ? "on" : "off";
        toggleActiveButton = document.getElementById(TOGGLE_ACTIVE_BUTTON_ID);
        toggleActiveButton.value = isActive ? "TURN OFF TEMPLATE" : "TURN ON TEMPLATE";
        toggleActiveButton.className = isActive ? "red" : "blue";
        toggleActiveButton.addEventListener("click", onToggleActiveClick, true);
    }

    onLoad();
}());
