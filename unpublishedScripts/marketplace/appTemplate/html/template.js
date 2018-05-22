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
            LOGO_IMG = "logo",
            LOGO_IMG_ACTIVE = "../assets/app-button-a.svg",
            LOGO_IMG_INACTIVE = "../assets/app-button-i.svg",
            TOGGLE_ACTIVE_BUTTON_ID = "toggle-active",
            iconDiv,
            logoImg,
            toggleActiveButton;

        // Initial button active state is communicated via URL parameter.
        isActive = location.search.replace("?active=", "") === "true";

        // Set UI elements per active state.
        iconDiv = document.getElementById(ICON_DIV);
        iconDiv.className = isActive ? "on" : "off";
        logoImg = document.getElementById(LOGO_IMG);
        logoImg.src = isActive ? LOGO_IMG_ACTIVE : LOGO_IMG_INACTIVE;
        toggleActiveButton = document.getElementById(TOGGLE_ACTIVE_BUTTON_ID);
        toggleActiveButton.value = isActive ? "TURN OFF TEMPLATE" : "TURN ON TEMPLATE";
        toggleActiveButton.className = isActive ? "on" : "off";
        toggleActiveButton.addEventListener("click", onToggleActiveClick, true);
    }

    onLoad();
}());
