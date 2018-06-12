//
//  html\template.js
//
//  Created by David Rowe on 22 May 2018.
//  Copyright 2018 High Fidelity, Inc.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

/* global setTimeout */

(function () {

    "use strict";

    var isActive = false,

        // EventBridge messages.
        EVENT_BRIDGE_OPEN_MESSAGE = "eventBridgeOpen",
        SET_ACTIVE_MESSAGE = "setActive",
        SET_DISPLAY_NAME_MESSAGE = "setDisplayName",
        SET_SNAP_TURN_MESSAGE = "setSnapTurn",
        SET_CLEAR_OVERLAYS_MESSAGE = "clearOverlays",
        SET_AVATAR_SCALE_MESSAGE = "setAvatarScale",
        CLOSE_DIALOG_MESSAGE = "closeDialog",

        EVENTBRIDGE_SETUP_DELAY = 500,

        // Input elements.
        displayNameInput,
        snapTurnInput,
        clearOverlaysInput,
        avatarScaleInput,
        closeButton;

    function onScriptEventReceived(data) {
        // Handle EventBridge message from main script.
        var message;

        try {
            message = JSON.parse(data);
        } catch (e) {
            return;
        }

        switch (message.command) {
            case SET_DISPLAY_NAME_MESSAGE:
                displayNameInput.value = message.value;
                displayNameInput.disabled = false;
                break;
            case SET_SNAP_TURN_MESSAGE:
                snapTurnInput.checked = message.value;
                snapTurnInput.disabled = false;
                break;
            case SET_CLEAR_OVERLAYS_MESSAGE:
                clearOverlaysInput.checked = message.value;
                clearOverlaysInput.disabled = false;
                break;
            case SET_AVATAR_SCALE_MESSAGE:
                avatarScaleInput.value = parseFloat(message.value).toFixed(2);
                avatarScaleInput.disabled = false;
                break;
        }
    }

    function onToggleActiveClick() {
        isActive = !isActive;

        // Notify main script. It closes the dialog.
        EventBridge.emitWebEvent(JSON.stringify({
            command: SET_ACTIVE_MESSAGE,
            value: isActive
        }));
    }

    function onDisplayNameChanged() {
        EventBridge.emitWebEvent(JSON.stringify({
            command: SET_DISPLAY_NAME_MESSAGE,
            value: displayNameInput.value
        }));
    }

    function onSnapTurnChanged() {
        EventBridge.emitWebEvent(JSON.stringify({
            command: SET_SNAP_TURN_MESSAGE,
            value: snapTurnInput.checked
        }));
    }

    function onClearOverlaysChanged() {
        EventBridge.emitWebEvent(JSON.stringify({
            command: SET_CLEAR_OVERLAYS_MESSAGE,
            value: clearOverlaysInput.checked
        }));
    }

    function onAvatarScaleChanged() {
        EventBridge.emitWebEvent(JSON.stringify({
            command: SET_AVATAR_SCALE_MESSAGE,
            value: avatarScaleInput.value
        }));
    }

    function onCloseButtonClick() {
        EventBridge.emitWebEvent(JSON.stringify({
            command: CLOSE_DIALOG_MESSAGE,
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

        // Monitor input elements for changes in value.
        toggleActiveButton.addEventListener("click", onToggleActiveClick, true);
        displayNameInput = document.getElementById("display-name");
        displayNameInput.addEventListener("change", onDisplayNameChanged, true);
        snapTurnInput = document.getElementById("snap-turn");
        snapTurnInput.addEventListener("change", onSnapTurnChanged, true);
        clearOverlaysInput = document.getElementById("clear-overlays");
        clearOverlaysInput.addEventListener("change", onClearOverlaysChanged, true);
        avatarScaleInput = document.getElementById("avatar-scale");
        avatarScaleInput.addEventListener("change", onAvatarScaleChanged, true);
        closeButton = document.getElementById("close-dialog");
        closeButton.addEventListener("click", onCloseButtonClick);

        setTimeout(function () {
            // Open the EventBridge to communicate with the main script.
            // Allow time for EventBridge to become ready.
            EventBridge.scriptEventReceived.connect(onScriptEventReceived);
            EventBridge.emitWebEvent(JSON.stringify({ command: EVENT_BRIDGE_OPEN_MESSAGE }));
        }, EVENTBRIDGE_SETUP_DELAY);
    }

    onLoad();

}());
