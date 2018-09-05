//
//  palmSurfaceLaserInput.js
//
//  Turn the laser on when near the palm menu.
//
//  Created by David Rowe on 5 Sep 2018.
//  Copyright 2018 High Fidelity, Inc.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

/* global LEFT_HAND, RIGHT_HAND, makeDispatcherModuleParameters, makeLaserParams, makeRunningValues, enableDispatcherModule,
 * disableDispatcherModule */

Script.include("/~/system/libraries/controllerDispatcherUtils.js");

(function () {

    "use strict";

    var PALM_MENU_IDS_CHANNEL = "Hifi-PalmMenu-IDs",
        palmMenuIDs = [];

    function onMessageReceived(channel, message, sender) {
        if (sender === MyAvatar.sessionUUID && channel === PALM_MENU_IDS_CHANNEL) {
            try {
                palmMenuIDs = JSON.parse(message);
                if (!(palmMenuIDs instanceof Array)) {
                    palmMenuIDs = [];
                }
            } catch (e) {
                palmMenuIDs = [];
            }
        }
    }

    function NearPalmMenu(hand) {
        this.hand = hand;

        this.parameters = makeDispatcherModuleParameters(
            121, // Similar to webSurfaceLaserInput.js
            this.hand === RIGHT_HAND ? ["rightHand"] : ["leftHand"],
            [],
            100,
            makeLaserParams(hand, true)
        );

        this.isPointingAtPalmMenu = function (controllerData) {
            var intersection = controllerData.rayPicks[this.hand];
            return intersection.type === Picks.INTERSECTED_OVERLAY && palmMenuIDs.indexOf(intersection.objectID) !== -1;
        };

        this.isReady = function (controllerData) {
            if (this.isPointingAtPalmMenu(controllerData)) {
                return makeRunningValues(true, [], []);
            }
            return makeRunningValues(false, [], []);
        };

        this.run = function (controllerData) {
            if (!this.isPointingAtPalmMenu(controllerData)) {
                return makeRunningValues(false, [], []);
            }

            if (controllerData.triggerClicks[this.hand]) {
                return makeRunningValues(false, [], []);
            }

            return makeRunningValues(true, [], []);
        };
    }

    var leftNearPalmMenu = new NearPalmMenu(LEFT_HAND);
    var rightNearPalmMenu = new NearPalmMenu(RIGHT_HAND);
    enableDispatcherModule("LeftNearPalmMenu", leftNearPalmMenu);
    enableDispatcherModule("RightNearPalmMenu", rightNearPalmMenu);
    Messages.subscribe(PALM_MENU_IDS_CHANNEL);
    Messages.messageReceived.connect(onMessageReceived);

    function cleanUp() {
        Messages.messageReceived.disconnect(onMessageReceived);
        Messages.unsubscribe(PALM_MENU_IDS_CHANNEL);
        disableDispatcherModule("LeftNearPalmMenu");
        disableDispatcherModule("RightNearPalmMenu");
    }
    Script.scriptEnding.connect(cleanUp);

}());
