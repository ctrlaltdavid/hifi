//
//  template.js
//
//  Template for a Marketplace app.
//
//  Created by David Rowe on 22 May 2018.
//  Copyright 2018 High Fidelity, Inc.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

(function () {

    "use strict";

    var APP_NAME = "TEMPLATE",
        APP_ICON_INACTIVE = Script.resolvePath("./assets/app-button-i.svg"),
        APP_ICON_ACTIVE = Script.resolvePath("./assets/app-button-a.svg"),
        APP_UI_HTML = Script.resolvePath("./html/template.html"),
        tablet,
        tabletButton,
        isTabletUIOpen = false,

        // EventBridge messages.
        SET_ACTIVE_MESSAGE = "setActive",

        isAppActive = false;

    function startApp() {
        // Start application activity.
        console.log("startApp()");
    }

    function stopApp() {
        // Stop application activity.
        console.log("stopApp()");
    }

    function onTabletWebEventReceived(data) {
        // EventBridge message from application UI.
        var message;

        try {
            message = JSON.parse(data);
        } catch (e) {
            return;
        }

        switch (message.command) {
            case SET_ACTIVE_MESSAGE:
                if (isAppActive !== message.value) {
                    isAppActive = message.value;
                    tabletButton.editProperties({ isActive: isAppActive });
                    if (isAppActive) {
                        startApp();
                    } else {
                        stopApp();
                    }
                }
                tablet.gotoHomeScreen(); // Automatically close app.
                break;
        }
    }

    function onTabletButtonClicked() {
        // Application tablet/toolbar button clicked.
        if (isTabletUIOpen) {
            tablet.gotoHomeScreen();
        } else {
            // Initial button active state is communicated via URL parameter so that active state is set immediately without 
            // waiting for the event bridge to be established.
            tablet.gotoWebScreen(APP_UI_HTML + "?active=" + isAppActive);
        }
    }

    function onTabletScreenChanged(type, url) {
        // Tablet screen changed / desktop dialog changed.
        var wasTabletUIOpen = isTabletUIOpen;

        isTabletUIOpen = url.substring(0, APP_UI_HTML.length) === APP_UI_HTML; // Ignore URL parameter.
        if (isTabletUIOpen === wasTabletUIOpen) {
            return;
        }

        if (isTabletUIOpen) {
            tablet.webEventReceived.connect(onTabletWebEventReceived);
        } else {
            tablet.webEventReceived.disconnect(onTabletWebEventReceived);
        }
    }

    function setUp() {
        tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");
        if (!tablet) {
            console.error("ERROR: Tablet not found! App not started.");
            return;
        }

        tabletButton = tablet.addButton({
            icon: APP_ICON_INACTIVE,
            activeIcon: APP_ICON_ACTIVE,
            text: APP_NAME,
            isActive: isAppActive
        });
        if (tabletButton) {
            tabletButton.clicked.connect(onTabletButtonClicked);
        } else {
            console.error("ERROR: Tablet button not created! App not started.");
            tablet = null;
            return;
        }

        tablet.screenChanged.connect(onTabletScreenChanged);
    }

    function tearDown() {
        if (!tablet) {
            return;
        }

        if (isTabletUIOpen) {
            tablet.webEventReceived.disconnect(onTabletWebEventReceived);
        }

        if (tabletButton) {
            tabletButton.clicked.disconnect(onTabletButtonClicked);
            tablet.removeButton(tabletButton);
            tabletButton = null;
        }

        tablet = null;

        isAppActive = false;
        stopApp();
    }

    setUp();
    Script.scriptEnding.connect(tearDown);
}());
