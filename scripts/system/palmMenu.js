//
//  palmMenu.js
//
//  Created by David Rowe on 9 Aug 2018.
//  Copyright 2018 High Fidelity, Inc.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

/* global getTabletWidthFromSettings */

(function () {

    "use strict";

    Script.include("./libraries/utils.js");

    var // Primary objects
        UI,
        ui = null,
        TabletState,
        tabletState = null,
        MenuState,
        menuState = null,

        // State updates
        updateTimer = null,
        UPDATE_INTERVAL = 300,

        // Hands
        LEFT_HAND = 0,
        RIGHT_HAND = 1,
        HAND_NAMES = ["LeftHand", "RightHand"],

        // Miscellaneous.
        tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system"),
        TABLET_ADDRESS_DIALOG = "hifi/tablet/TabletAddressDialog.qml",
        HIFI_OBJECT_MANIPULATION_CHANNEL = "Hifi-Object-Manipulation",
        avatarScale = MyAvatar.scale,
        DEBUG = true;

    // #region Utilities =======================================================================================================

    function debug(message) {
        if (!DEBUG) {
            return;
        }
        print("DEBUG: " + message);
    }

    function error(message) {
        print("ERROR: " + message);
    }

    function handJointName(hand) {
        var jointName;
        if (hand === LEFT_HAND) {
            if (Camera.mode === "first person") {
                jointName = "_CONTROLLER_LEFTHAND";
            } else if (Camera.mode === "third person") {
                jointName = "_CAMERA_RELATIVE_CONTROLLER_LEFTHAND";
            } else {
                jointName = "LeftHand";
            }
        } else {
            if (Camera.mode === "first person") {
                jointName = "_CONTROLLER_RIGHTHAND";
            } else if (Camera.mode === "third person") {
                jointName = "_CAMERA_RELATIVE_CONTROLLER_RIGHTHAND";
            } else {
                jointName = "RightHand";
            }
        }
        return jointName;
    }

    function handJointIndex(hand) {
        return MyAvatar.getJointIndex(handJointName(hand));
    }

    function otherHand(hand) {
        return hand === LEFT_HAND ? RIGHT_HAND : LEFT_HAND;
    }

    // #endregion

    // #region UI ==============================================================================================================

    UI = function () {

        if (!(this instanceof UI)) {
            return new UI();
        }

        var BUTTON_I_NORMAL = Script.resolvePath("./assets/images/pm-button-i-normal.svg"),
            BUTTON_I_HOVER = Script.resolvePath("./assets/images/pm-button-i-hover.svg"),
            BUTTON_A_NORMAL = Script.resolvePath("./assets/images/pm-button-a-normal.svg"),
            BUTTON_A_HOVER = Script.resolvePath("./assets/images/pm-button-a-hover.svg"),

            MUTE_OFF_ICON = Script.resourcesPath() + "icons/tablet-icons/mic-unmute-i.svg",
            MUTE_ON_ICON = Script.resourcesPath() + "icons/tablet-icons/mic-mute-a.svg",
            BUBBLE_OFF_ICON = Script.resourcesPath() + "icons/tablet-icons/bubble-i.svg",
            BUBBLE_ON_ICON = Script.resourcesPath() + "icons/tablet-icons/bubble-a.svg",
            GOTO_ENABLED_ICON = Script.resourcesPath() + "icons/tablet-icons/goto-i.svg",
            EXPAND_ENABLED_ICON = Script.resourcesPath() + "icons/tablet-icons/menu-i.svg",

            TABLET_MODEL_URL = Script.resolvePath("./assets/models/tinyTablet.fbx"),

            ICON_DELTA_Z = 0.001, // Z-spacing between overlays sufficient to render separated.

            ORIGIN = 0, // Root overlay that other overlays descend from.
            MUTE_BUTTON = 1,
            BUBBLE_BUTTON = 2,
            GOTO_BUTTON = 3,
            EXPAND_BUTTON = 4,
            MUTE_ICON = 5,
            BUBBLE_ICON = 6,
            GOTO_ICON = 7,
            EXPAND_ICON = 8,
            TABLET_MODEL = 9,
            OVERLAY_PROPERTIES = [
                { // Origin
                    type: "sphere",
                    dimensions: { x: 0.01, y: 0.01, z: 0.01 },
                    visible: false
                },

                { // Mute button
                    type: "image3d",
                    url: BUTTON_I_NORMAL,
                    parent: ORIGIN,
                    dimensions: { x: 0.03, y: 0.03 },
                    localPosition: { x: 0, y: 0.028, z: 0 },
                    localRotation: Quat.IDENTITY,
                    solid: true,
                    alpha: 1,
                    emissive: true,
                    visible: false
                },
                { // Bubble button
                    type: "image3d",
                    url: BUTTON_I_NORMAL,
                    parent: ORIGIN,
                    dimensions: { x: 0.03, y: 0.03 },
                    localPosition: { x: -0.028, y: 0, z: 0 },
                    localRotation: Quat.IDENTITY,
                    isSolid: true,
                    alpha: 1,
                    emissive: true,
                    visible: false
                },
                { // Goto button
                    type: "image3d",
                    url: BUTTON_I_NORMAL,
                    parent: ORIGIN,
                    dimensions: { x: 0.03, y: 0.03 },
                    localPosition: { x: 0, y: -0.028, z: 0 },
                    localRotation: Quat.IDENTITY,
                    isSolid: true,
                    alpha: 1,
                    emissive: true,
                    visible: false
                },
                { // Expand button
                    type: "image3d",
                    url: BUTTON_I_NORMAL,
                    parent: ORIGIN,
                    dimensions: { x: 0.03, y: 0.03 },
                    localPosition: { x: 0.035, y: 0, z: 0 },
                    localRotation: Quat.IDENTITY,
                    isSolid: true,
                    alpha: 1,
                    emissive: true,
                    visible: false
                },

                { // Mute icon
                    type: "image3d",
                    url: MUTE_OFF_ICON,
                    parent: ORIGIN,
                    dimensions: { x: 0.016, y: 0.016 },
                    localPosition: { x: 0, y: 0.028, z: ICON_DELTA_Z },
                    localRotation: Quat.IDENTITY,
                    solid: true,
                    alpha: 1,
                    emissive: true,
                    visible: false
                },
                { // Bubble icon
                    type: "image3d",
                    url: BUBBLE_OFF_ICON,
                    parent: ORIGIN,
                    dimensions: { x: 0.016, y: 0.016 },
                    localPosition: { x: -0.028, y: 0, z: ICON_DELTA_Z },
                    localRotation: Quat.IDENTITY,
                    solid: true,
                    alpha: 1,
                    emissive: true,
                    visible: false
                },
                { // Goto icon
                    type: "image3d",
                    url: GOTO_ENABLED_ICON,
                    parent: ORIGIN,
                    dimensions: { x: 0.016, y: 0.016 },
                    localPosition: { x: 0, y: -0.028, z: ICON_DELTA_Z },
                    localRotation: Quat.IDENTITY,
                    solid: true,
                    alpha: 1,
                    emissive: true,
                    visible: false
                },
                { // Expand icon
                    type: "image3d",
                    url: EXPAND_ENABLED_ICON,
                    parent: ORIGIN,
                    dimensions: { x: 0.016, y: 0.016 },
                    localPosition: { x: 0.035, y: 0, z: ICON_DELTA_Z },
                    localRotation: Quat.IDENTITY,
                    solid: true,
                    alpha: 1,
                    emissive: true,
                    visible: false
                },

                { // Tablet model
                    type: "model",
                    url: TABLET_MODEL_URL,
                    parent: ORIGIN,
                    dimensions: { x: 0.032, y: 0.0485, z: 0.0023 }, // Proportional to tablet proper.
                    localPosition: { x: 0.035, y: 0, z: -0.0023 / 2 -ICON_DELTA_Z },
                    localRotation: Quat.fromVec3Degrees({ x: 0, y: 180, z: 0 }),
                    solid: true,
                    grabbable: true,
                    showKeyboardFocusHighlight: false,
                    visible: false
                }
            ],
            SWAP_BUTTONS = [BUBBLE_BUTTON, BUBBLE_ICON, EXPAND_BUTTON, EXPAND_ICON, TABLET_MODEL],
            overlays = [],

            UI_POSITIONS = [
                {
                    x: -0.01, // Distance across hand.
                    y: 0.08, // Distance from joint.
                    z: 0.06 // Distance above palm.
                },
                {
                    x: 0.01, // Distance across hand.
                    y: 0.08, // Distance from joint.
                    z: 0.06 // Distance above palm.
                }
            ],
            UI_ROTATIONS = [
                Quat.fromVec3Degrees({ x: 0, y: -40, z: 90 }),
                Quat.fromVec3Degrees({ x: 0, y: 40, z: -90 })
            ],

            HOVER_LEAVE_DEBOUNCE_DELAY = 50,
            hoverLeaveTimers = [],

            TABLET_EXPAND_HANDLES = [ // Normalized coordinates in range [-0.5, 0.5] about center of tablet model.
                { x: 0.5, y: -0.65, z: 0 },
                { x: -0.5, y: -0.65, z: 0 }
            ],
            TABLET_EXPAND_DELTA_ROTATION = Quat.fromVec3Degrees({ x: -5, y: 0, z: 0 }),
            TABLET_EXPAND_HANDLES_OTHER = [ // Different handles when expanding after being grabbed by other hand,
                { x: 0.5, y: -0.4, z: 0 },
                { x: -0.5, y: -0.4, z: 0 }
            ],
            TABLET_EXPAND_DELTA_ROTATION_OTHER = Quat.IDENTITY,
            tabletExpandHand,
            tabletExpandHandles = TABLET_EXPAND_HANDLES,
            tabletExpandDeltaRotation = TABLET_EXPAND_HANDLES_OTHER,
            tabletExpandLocalPosition,
            tabletExpandLocalRotation = Quat.IDENTITY,
            tabletExpandInitialWidth,
            tabletExpandTargetWidth,
            tabletExpandTargetLocalRotation,

            HOVER_SOUND = "./assets/sounds/button-hover.wav",
            HOVER_VOLUME = 0.5,
            CLICK_SOUND = "./assets/sounds/button-click.wav",
            CLICK_VOLUME = 0.8,
            hoverSound = SoundCache.getSound(Script.resolvePath(HOVER_SOUND)),
            clickSound = SoundCache.getSound(Script.resolvePath(CLICK_SOUND)),

            isMenuVisible = false,
            isTabletVisible = false,

            isUIEnabled = false, // UI is disabled when hidden or showing / hiding.

            uiHand = LEFT_HAND,

            buttonClickedCallback;

        function updateMiniTabletID() {
            // Send tablet overlay ID to controllerDispatcher so that it can use a smaller near grab distance.
            Messages.sendLocalMessage("Hifi-MiniTablet-ID", overlays[TABLET_MODEL]);
        }

        function setIgnoreOverlay(overlayID, ignore) {
            // Disable hover etc. events on overlay.
            var HAND_RAYPICK_BLACKLIST_CHANNEL = "Hifi-Hand-RayPick-Blacklist";
            Messages.sendLocalMessage(HAND_RAYPICK_BLACKLIST_CHANNEL, JSON.stringify({
                action: ignore ? "add" : "remove",
                id: overlayID
            }));
        }

        function playSound(sound, volume) {
            Audio.playSound(sound, {
                position: uiHand === LEFT_HAND ? MyAvatar.getLeftPalmPosition() : MyAvatar.getRightPalmPosition(),
                volume: volume,
                localOnly: true
            });
        }

        function onHoverEnterOverlay(overlayID, event) {

            function maybePlaySound(button) {
                if (hoverLeaveTimers[button]) {
                    Script.clearTimeout(hoverLeaveTimers[button]);
                    hoverLeaveTimers[button] = null;
                } else {
                    playSound(hoverSound, HOVER_VOLUME);
                }
            }

            function updateOverlay(button, url) {
                Overlays.editOverlay(overlays[button], {
                    url: url
                });
            }

            switch (overlayID) {
                case overlays[MUTE_BUTTON]:
                    maybePlaySound(MUTE_BUTTON);
                    updateOverlay(MUTE_BUTTON, BUTTON_I_HOVER);
                    break;
                case overlays[BUBBLE_BUTTON]:
                    maybePlaySound(BUBBLE_BUTTON);
                    updateOverlay(BUBBLE_BUTTON, Users.getIgnoreRadiusEnabled() ? BUTTON_A_HOVER : BUTTON_I_HOVER);
                    break;
                case overlays[GOTO_BUTTON]:
                    maybePlaySound(GOTO_BUTTON);
                    updateOverlay(GOTO_BUTTON, BUTTON_I_HOVER);
                    break;
                case overlays[EXPAND_BUTTON]:
                    maybePlaySound(EXPAND_BUTTON);
                    updateOverlay(EXPAND_BUTTON, BUTTON_I_HOVER);
                    break;
                default:
                    // Ignore the many other overlays that may generate this event.
            }
        }

        function onHoverLeaveOverlay(overlayID, event) {

            function maybeUpdateOverlay(button, url) {
                if (hoverLeaveTimers[button]) {
                    Script.clearTimeout(hoverLeaveTimers[button]);
                }

                hoverLeaveTimers[button] = Script.setTimeout(function () {
                    Overlays.editOverlay(overlays[button], {
                        url: url
                    });
                    hoverLeaveTimers[button] = null;
                }, HOVER_LEAVE_DEBOUNCE_DELAY);
            }

            switch (overlayID) {
                case overlays[MUTE_BUTTON]:
                    maybeUpdateOverlay(MUTE_BUTTON, BUTTON_I_NORMAL);
                    break;
                case overlays[BUBBLE_BUTTON]:
                    maybeUpdateOverlay(BUBBLE_BUTTON, Users.getIgnoreRadiusEnabled() ? BUTTON_A_NORMAL : BUTTON_I_NORMAL);
                    break;
                case overlays[GOTO_BUTTON]:
                    maybeUpdateOverlay(GOTO_BUTTON, BUTTON_I_NORMAL);
                    break;
                case overlays[EXPAND_BUTTON]:
                    maybeUpdateOverlay(EXPAND_BUTTON, BUTTON_I_NORMAL);
                    break;
                default:
                    // Ignore the many other overlays that may generate this event.
            }
        }

        function onMouseReleaseOnOverlay(overlayID, event) {

            function maybeClickButton(button) {
                if (event.type !== "Release" || !event.isPrimaryButton) {
                    return;
                }

                if (hoverLeaveTimers[button] === null) { // Laser must still be on button.
                    playSound(clickSound, CLICK_VOLUME);
                    buttonClickedCallback(button);
                }
            }

            switch (overlayID) {
                case overlays[MUTE_BUTTON]:
                    maybeClickButton(MUTE_BUTTON);
                    break;
                case overlays[BUBBLE_BUTTON]:
                    maybeClickButton(BUBBLE_BUTTON);
                    break;
                case overlays[GOTO_BUTTON]:
                    maybeClickButton(GOTO_BUTTON);
                    break;
                case overlays[EXPAND_BUTTON]:
                    maybeClickButton(EXPAND_BUTTON);
                    break;
                default:
                    // Ignore the many other overlays that may generate this event.
            }
        }

        function showMenu(hand) {
            var i, length;

            uiHand = hand;

            // Origin.
            Overlays.editOverlay(overlays[ORIGIN], {
                parentID: MyAvatar.SELF_ID,
                parentJointIndex: handJointIndex(uiHand),
                localPosition: Vec3.multiply(avatarScale, UI_POSITIONS[uiHand]),
                localRotation: UI_ROTATIONS[uiHand]
            });

            // Other menu overlays.
            for (i = 1, length = overlays.length; i < length; i++) {
                if (i !== TABLET_MODEL) {
                    Overlays.editOverlay(overlays[i], {
                        parentID: OVERLAY_PROPERTIES[i].parentID, // Needed for tablet model.
                        localRotation: OVERLAY_PROPERTIES[i].localRotation,
                        dimensions: { x: 0.0001, y: 0.0001, z: 0.0001 }, // Vec3s are compatible with Vec2s.
                        visible: true
                    });
                }
            }

            hoverLeaveTimers[MUTE_BUTTON] = null;
            hoverLeaveTimers[BUBBLE_BUTTON] = null;
            hoverLeaveTimers[GOTO_BUTTON] = null;
            hoverLeaveTimers[EXPAND_BUTTON] = null;

            isMenuVisible = true;
        }

        function hideMenu() {
            var i, length;
            for (i = 0, length = overlays.length; i < length; i++) {
                Overlays.editOverlay(overlays[i], {
                    visible: false || i === TABLET_MODEL && isTabletVisible
                });
            }

            isMenuVisible = false;
        }

        function showTablet(tiny) {
            var isRightHand = uiHand === RIGHT_HAND,
                SWAP_X = { x: -1, y: 1, z: 1 },
                swapX,
                properties = OVERLAY_PROPERTIES[TABLET_MODEL],
                localPosition,
                dimensions;

            if (isMenuVisible) {
                swapX = (isRightHand && SWAP_BUTTONS.indexOf(TABLET_MODEL) !== -1) ? SWAP_X : Vec3.ONE; // Swap bubble and menu?
                properties = OVERLAY_PROPERTIES[TABLET_MODEL];
                localPosition = Vec3.multiply(avatarScale, Vec3.multiplyVbyV(swapX, properties.localPosition));
                dimensions = tiny ? { x: 0.0001, y: 0.0001, z: 0.0001 } : Vec3.multiply(avatarScale, properties.dimensions);
                Overlays.editOverlay(overlays[TABLET_MODEL], {
                    parentID: properties.parentID,
                    localPosition: localPosition,
                    localRotation: properties.localRotation,
                    dimensions: dimensions,
                    visible: true
                });

                updateMiniTabletID();
            }

            isTabletVisible = true;
        }

        function hideTablet() {
            isTabletVisible = false;
            Overlays.editOverlay(overlays[TABLET_MODEL], {
                parentID: Uuid.NULL, // Release tablet model parent so that hand can grab tablet proper.
                visible: false
            });
        }

        function scale(scaleFactor, doScaleTablet) {
            // Scale UI in place.
            var properties,
                isRightHand = uiHand === RIGHT_HAND,
                SWAP_X = { x: -1, y: 1, z: 1 },
                swapX,
                i, length;

            for (i = 1, length = overlays.length; i < length; i++) {
                if (doScaleTablet || i !== TABLET_MODEL) {
                    properties = OVERLAY_PROPERTIES[i];
                    swapX = (isRightHand && SWAP_BUTTONS.indexOf(i) !== -1) ? SWAP_X : Vec3.ONE; // Swap bubble and menu?
                    Overlays.editOverlay(overlays[i], {
                        localPosition: Vec3.multiply(scaleFactor, Vec3.multiplyVbyV(swapX, properties.localPosition)),
                        dimensions: Vec3.multiply(scaleFactor, properties.dimensions) // Vec3s are compatible with Vec2s.
                    });
                }
            }
        }

        function startExpandingTablet(hand) {
            var properties;

            // Expansion details.
            tabletExpandHand = hand;
            if (tabletExpandHand === uiHand) {
                tabletExpandHandles = TABLET_EXPAND_HANDLES;
                tabletExpandDeltaRotation = TABLET_EXPAND_DELTA_ROTATION;
            } else {
                tabletExpandHandles = TABLET_EXPAND_HANDLES_OTHER;
                tabletExpandDeltaRotation = TABLET_EXPAND_DELTA_ROTATION_OTHER;
            }

            // Grabbing details.
            properties = Overlays.getProperties(overlays[TABLET_MODEL], ["localPosition", "localRotation"]);
            tabletExpandLocalRotation = properties.localRotation;
            tabletExpandLocalPosition = Vec3.sum(properties.localPosition,
                Vec3.multiplyQbyV(tabletExpandLocalRotation,
                    Vec3.multiplyVbyV(tabletExpandHandles[tabletExpandHand], OVERLAY_PROPERTIES[TABLET_MODEL].dimensions)));

            // Initial and target details.
            tabletExpandInitialWidth = OVERLAY_PROPERTIES[TABLET_MODEL].dimensions.x; // Unscaled by avatar.
            tabletExpandTargetWidth = getTabletWidthFromSettings(); // "".
            tabletExpandTargetLocalRotation = Quat.multiply(tabletExpandLocalRotation, tabletExpandDeltaRotation);
        }

        function expandTablet(scaleFactor) {
            // Scale tablet model and move per handles.
            var tabletScaleFactor,
                dimensions,
                localPosition,
                localRotation;

            tabletScaleFactor = avatarScale
                * (1 + scaleFactor * (tabletExpandTargetWidth - tabletExpandInitialWidth) / tabletExpandInitialWidth);
            dimensions = Vec3.multiply(tabletScaleFactor, OVERLAY_PROPERTIES[TABLET_MODEL].dimensions);
            localRotation = Quat.mix(tabletExpandLocalRotation, tabletExpandTargetLocalRotation, scaleFactor);
            localPosition =
                Vec3.sum(tabletExpandLocalPosition,
                    Vec3.multiplyQbyV(tabletExpandLocalRotation,
                        Vec3.multiply(-tabletScaleFactor,
                            Vec3.multiplyVbyV(tabletExpandHandles[tabletExpandHand],
                                OVERLAY_PROPERTIES[TABLET_MODEL].dimensions)))
                );
            localPosition = Vec3.sum(localPosition,
                Vec3.multiplyQbyV(tabletExpandLocalRotation, { x: 0, y: 0.5 * -dimensions.y, z: 0 }));
            localPosition = Vec3.sum(localPosition,
                Vec3.multiplyQbyV(localRotation, { x: 0, y: 0.5 * dimensions.y, z: 0 }));

            Overlays.editOverlay(overlays[TABLET_MODEL], {
                localPosition: localPosition,
                localRotation: localRotation,
                dimensions: dimensions
            });
        }

        function getUIPositionAndRotation(hand) {
            return {
                position: UI_POSITIONS[hand],
                rotation: UI_ROTATIONS[hand]
            };
        }

        function getTabletModelID() {
            return overlays[TABLET_MODEL];
        }

        function getTabletModelProperties() {
            var properties = Overlays.getProperties(overlays[TABLET_MODEL], ["position", "orientation"]);
            return {
                position: properties.position,
                orientation: properties.orientation
            };
        }

        function enable() {
            // Enable hovering and clicking.
            if (isUIEnabled) {
                return;
            }

            setIgnoreOverlay(overlays[MUTE_ICON], true);
            setIgnoreOverlay(overlays[BUBBLE_ICON], true);
            setIgnoreOverlay(overlays[GOTO_ICON], true);
            setIgnoreOverlay(overlays[EXPAND_ICON], true);
            setIgnoreOverlay(overlays[TABLET_MODEL], true);

            Overlays.hoverEnterOverlay.connect(onHoverEnterOverlay);
            Overlays.hoverLeaveOverlay.connect(onHoverLeaveOverlay);
            Overlays.mouseReleaseOnOverlay.connect(onMouseReleaseOnOverlay);

            isUIEnabled = true;
        }

        function disable() {
            // Disable hovering and clicking.
            if (!isUIEnabled) {
                return;
            }

            Overlays.hoverEnterOverlay.disconnect(onHoverEnterOverlay);
            Overlays.hoverLeaveOverlay.disconnect(onHoverLeaveOverlay);
            Overlays.mouseReleaseOnOverlay.disconnect(onMouseReleaseOnOverlay);

            setIgnoreOverlay(overlays[MUTE_ICON], false);
            setIgnoreOverlay(overlays[BUBBLE_ICON], false);
            setIgnoreOverlay(overlays[GOTO_ICON], false);
            setIgnoreOverlay(overlays[EXPAND_ICON], false);
            setIgnoreOverlay(overlays[TABLET_MODEL], false);

            isUIEnabled = false;
        }

        function setButtonActive(button, isActive) {
            switch (button) {
                case MUTE_BUTTON:
                    Overlays.editOverlay(overlays[MUTE_ICON], {
                        url: isActive ? MUTE_ON_ICON : MUTE_OFF_ICON
                    });
                    break;
                case BUBBLE_BUTTON:
                    Overlays.editOverlay(overlays[BUBBLE_ICON], {
                        url: isActive ? BUBBLE_ON_ICON : BUBBLE_OFF_ICON
                    });
                    Overlays.editOverlay(overlays[BUBBLE_BUTTON], {
                        url: isActive ? BUTTON_A_NORMAL : BUTTON_I_NORMAL
                    });
                    break;
                default:
                    error("Missing case: setButtonActive");
            }
        }

        function connectButtonClicked(callback) {
            buttonClickedCallback = callback;
        }

        function create() {
            var i, length;
            for (i = 0, length = OVERLAY_PROPERTIES.length; i < length; i++) {
                // Update overlay properties with parent ID.
                if (OVERLAY_PROPERTIES[i].parent !== undefined) {
                    OVERLAY_PROPERTIES[i].parentID = overlays[OVERLAY_PROPERTIES[i].parent];
                }

                // Create overlay.
                overlays[i] = Overlays.addOverlay(OVERLAY_PROPERTIES[i].type, OVERLAY_PROPERTIES[i]);
            }
        }

        function destroy() {
            var i, length;
            for (i = 0, length = overlays.length; i < length; i++) {
                Overlays.deleteOverlay(overlays[i]);
                overlays[i] = null;
            }

            updateMiniTabletID();
        }

        create();

        return {
            MUTE_BUTTON: MUTE_BUTTON,
            BUBBLE_BUTTON: BUBBLE_BUTTON,
            GOTO_BUTTON: GOTO_BUTTON,
            EXPAND_BUTTON: EXPAND_BUTTON,
            showMenu: showMenu,
            hideMenu: hideMenu,
            showTablet: showTablet,
            hideTablet: hideTablet,
            scale: scale,
            startExpandingTablet: startExpandingTablet,
            expandTablet: expandTablet,
            getUIPositionAndRotation: getUIPositionAndRotation,
            getTabletModelID: getTabletModelID,
            getTabletModelProperties: getTabletModelProperties,
            enable: enable,
            disable: disable,
            setButtonActive: setButtonActive,
            buttonClicked: {
                connect: connectButtonClicked
            },
            destroy: destroy
        };
    };

    // #endregion

    // #region Tablet State Machine ============================================================================================

    TabletState = function () {

        // Secondary state machine which controls the UI's tablet model.

        if (!(this instanceof TabletState)) {
            return new TabletState();
        }

        var TABLET_DISABLED = 0,
            TABLET_UNAVAILABLE = 1,
            TABLET_AVAILABLE = 2,
            TABLET_GRABBED = 3,
            TABLET_EXPANDING = 4,
            TABLET_EXPANDED = 5,
            STATE_STRINGS = ["TABLET_DISABLED", "TABLET_UNAVAILABLE", "TABLET_AVAILABLE", "TABLET_GRABBED", "TABLET_EXPANDING",
                "TABLET_EXPANDED"],
            STATE_MACHINE,
            machineState = TABLET_DISABLED,

            isGoto,

            TABLET_EXPAND_DURATION = 250,
            TABLET_EXPAND_TIMEOUT = 20,
            tabletExpandTimer = null,
            tabletExpandStart;

        function enterTabletUnavailable() {
            if (ui) {
                ui.hideTablet();
            }
        }

        function updateTabletUnavailable() {
            // Show tablet model if tablet proper has stopped being displayed.
            if (!HMD.showTablet) {
                setState(TABLET_AVAILABLE);
            }
        }

        function enterTabletAvailable() {
            if (ui) {
                ui.showTablet(false);
            }
        }

        function updateTabletAvailable() {
            // Hide tablet model if tablet proper has been displayed by other means.
            if (HMD.showTablet) {
                setState(TABLET_UNAVAILABLE);
            }
        }

        function updateTabletGrabbed() {
            // Hide tablet model if tablet proper has been displayed by other means.
            if (HMD.showTablet) {
                setState(TABLET_UNAVAILABLE);
            }
        }

        function expandTablet() {
            var scaleFactor = (Date.now() - tabletExpandStart) / TABLET_EXPAND_DURATION;
            if (scaleFactor < 1) {
                ui.expandTablet(scaleFactor);
                tabletExpandTimer = Script.setTimeout(expandTablet, TABLET_EXPAND_TIMEOUT);
                return;
            }
            tabletExpandTimer = null;
            setState(TABLET_EXPANDED);
        }

        function enterTabletExpanding(data) {
            // Target details.
            isGoto = data.goto;

            ui.startExpandingTablet(data.hand);
            tabletExpandStart = Date.now();
            tabletExpandTimer = Script.setTimeout(expandTablet, TABLET_EXPAND_TIMEOUT);
        }

        function updateTabletExanding() {
            // Hide tablet model immediately if tablet has been displayed by other means.
            if (HMD.showTablet) {
                setState(TABLET_UNAVAILABLE);
            }
        }

        function exitTabletExpanding() {
            if (tabletExpandTimer !== null) {
                Script.clearTimeout(tabletExpandTimer);
                tabletExpandTimer = null;
            }
        }

        function enterTabletExpanded() {
            var tabletModelProperties = ui.getTabletModelProperties();

            ui.hideTablet();

            if (isGoto) {
                tablet.loadQMLSource(TABLET_ADDRESS_DIALOG);
            } else {
                tablet.gotoHomeScreen();
            }

            Overlays.editOverlay(HMD.tabletID, {
                position: tabletModelProperties.position,
                orientation: tabletModelProperties.orientation
            });

            HMD.openTablet(true);
        }

        function updateTabletExpanded() {
            // Immediately transition.
            setState(TABLET_UNAVAILABLE);
        }

        STATE_MACHINE = {
            TABLET_DISABLED: { // Tablet model not able to be displayed because in desktop mode.
                enter: null,
                update: null,
                exit: null
            },
            TABLET_UNAVAILABLE: { // Tablet model not able to be displayed because proper tablet is open.
                enter: enterTabletUnavailable,
                update: updateTabletUnavailable,
                exit: null
            },
            TABLET_AVAILABLE: { // Tablet model able to be displayed and available for action.
                enter: enterTabletAvailable,
                update: updateTabletAvailable,
                exit: null
            },
            TABLET_GRABBED: { // Tablet model is grabbed.
                enter: null,
                update: updateTabletGrabbed,
                exit: null
            },
            TABLET_EXPANDING: { // Tablet model is expanding to become tablet proper.
                enter: enterTabletExpanding,
                update: updateTabletExanding,
                exit: exitTabletExpanding
            },
            TABLET_EXPANDED: { // Tablet model has finished expanding to become tablet proper.
                enter: enterTabletExpanded,
                update: updateTabletExpanded,
                exit: null
            }
        };

        function getState() {
            return machineState;
        }

        function setState(state, data) {
            if (state !== machineState) {
                debug("State transition from " + STATE_STRINGS[machineState] + " to " + STATE_STRINGS[state]);
                if (STATE_MACHINE[STATE_STRINGS[machineState]].exit) {
                    STATE_MACHINE[STATE_STRINGS[machineState]].exit(data);
                }
                if (STATE_MACHINE[STATE_STRINGS[state]].enter) {
                    STATE_MACHINE[STATE_STRINGS[state]].enter(data);
                }
                machineState = state;
            } else {
                error("Null state transition: " + state + "!");
            }
        }

        function updateState() {
            if (STATE_MACHINE[STATE_STRINGS[machineState]].update) {
                STATE_MACHINE[STATE_STRINGS[machineState]].update();
            }
        }

        function create() {
            // Nothing to do.
        }

        function destroy() {
            if (machineState !== TABLET_DISABLED) {
                setState(TABLET_DISABLED);
            }
        }

        create();

        return {
            TABLET_DISABLED: TABLET_DISABLED,
            TABLET_UNAVAILABLE: TABLET_UNAVAILABLE,
            TABLET_AVAILABLE: TABLET_AVAILABLE,
            TABLET_GRABBED: TABLET_GRABBED,
            TABLET_EXPANDING: TABLET_EXPANDING,
            TABLET_EXPANDED: TABLET_EXPANDED,
            updateState: updateState,
            getState: getState,
            setState: setState,
            destroy: destroy
        };
    };

    // #endregion

    // #region Menu State Machine ==============================================================================================

    MenuState = function () {

        // Primary state machine in overall control of the UI.

        if (!(this instanceof MenuState)) {
            return new MenuState();
        }

        var MENU_DISABLED = 0,
            MENU_HIDDEN = 1,
            MENU_HIDING = 2,
            MENU_SHOWING = 3,
            MENU_VISIBLE = 4,
            STATE_STRINGS = ["MENU_DISABLED", "MENU_HIDDEN", "MENU_HIDING", "MENU_SHOWING", "MENU_VISIBLE"],
            STATE_MACHINE,
            machineState = MENU_DISABLED,
            menuHand,
            MENU_SCALE_DURATION = 250,
            MENU_SCALE_TIMEOUT = 20,
            menuScaleTimer = null,
            menuScaleStart,

            MIN_HAND_CAMERA_ANGLE = 30,
            DEGREES_180 = 180,
            MIN_HAND_CAMERA_ANGLE_COS = Math.cos(Math.PI * MIN_HAND_CAMERA_ANGLE / DEGREES_180);

        function onButtonClicked(button) {
            var state;
            switch (button) {
                case ui.MUTE_BUTTON:
                    Audio.muted = !Audio.muted;
                    break;
                case ui.BUBBLE_BUTTON:
                    Users.toggleIgnoreRadius();
                    break;
                case ui.GOTO_BUTTON:
                    state = tabletState.getState();
                    if (state === tabletState.TABLET_AVAILABLE) {
                        tabletState.setState(tabletState.TABLET_EXPANDING, { hand: menuHand, goto: true });
                    } else if (state === tabletState.TABLET_UNAVAILABLE) {
                        tablet.loadQMLSource(TABLET_ADDRESS_DIALOG);
                    }
                    break;
                case ui.EXPAND_BUTTON:
                    state = tabletState.getState();
                    if (state === tabletState.TABLET_AVAILABLE) {
                        tabletState.setState(tabletState.TABLET_EXPANDING, { hand: menuHand, goto: false });
                    } else if (state === tabletState.TABLET_UNAVAILABLE) {
                        tablet.gotoHomeScreen();
                    }
                    break;
                default:
                    error("Missing case: onButtonClicked");
            }
        }

        function onMutedChanged() {
            ui.setButtonActive(ui.MUTE_BUTTON, Audio.muted);
        }

        function onIgnoreRadiusEnabledChanged() {
            ui.setButtonActive(ui.BUBBLE_BUTTON, Users.getIgnoreRadiusEnabled());
        }

        function enterMenuDisabled() {
            // Stop event handling.
            ui.disable();
            Audio.mutedChanged.disconnect(onMutedChanged);
            Users.ignoreRadiusEnabledChanged.disconnect(onIgnoreRadiusEnabledChanged);

            // Don't keep overlays prepared if in desktop mode.
            ui.destroy();
            ui = null;
        }

        function exitMenuDisabled() {
            // Create UI so that it's ready to be displayed without seeing artefacts from creating the UI.
            ui = new UI();
            ui.buttonClicked.connect(onButtonClicked);

            // Start monitoring mute and bubble changes.
            Audio.mutedChanged.connect(onMutedChanged);
            Users.ignoreRadiusEnabledChanged.connect(onIgnoreRadiusEnabledChanged);
        }

        function shouldShowMenu(hand) {
            // Should show menu if it would be oriented toward the camera.
            var pose,
                jointIndex,
                handPosition,
                handOrientation,
                uiPositionAndOrientation,
                menuPosition,
                menuOrientation,
                cameraToMenuDirection;

            pose = Controller.getPoseValue(hand === LEFT_HAND ? Controller.Standard.LeftHand : Controller.Standard.RightHand);
            if (!pose.valid) {
                return false;
            }

            jointIndex = handJointIndex(hand);
            handPosition = Vec3.sum(MyAvatar.position,
                Vec3.multiplyQbyV(MyAvatar.orientation, MyAvatar.getAbsoluteJointTranslationInObjectFrame(jointIndex)));
            handOrientation = Quat.multiply(MyAvatar.orientation, MyAvatar.getAbsoluteJointRotationInObjectFrame(jointIndex));
            uiPositionAndOrientation = ui.getUIPositionAndRotation(hand);
            menuPosition = Vec3.sum(handPosition, Vec3.multiply(avatarScale,
                Vec3.multiplyQbyV(handOrientation, uiPositionAndOrientation.position)));
            menuOrientation = Quat.multiply(handOrientation, uiPositionAndOrientation.rotation);
            cameraToMenuDirection = Vec3.normalize(Vec3.subtract(menuPosition, Camera.position));
            return Vec3.dot(cameraToMenuDirection, Quat.getForward(menuOrientation)) > MIN_HAND_CAMERA_ANGLE_COS;
        }

        function enterMenuHidden() {
            ui.disable();
            ui.hideMenu();
            if (tabletState.getState() === tabletState.TABLET_AVAILABLE) {
                ui.hideTablet();
            }
        }

        function updateMenuHidden() {
            // Compare palm directions of hands with vectors from palms to camera.
            if (shouldShowMenu(LEFT_HAND)) {
                setState(MENU_SHOWING, LEFT_HAND);
            } else if (shouldShowMenu(RIGHT_HAND)) {
                setState(MENU_SHOWING, RIGHT_HAND);
            }
        }

        function scaleMenuDown() {
            var scaleFactor = (Date.now() - menuScaleStart) / MENU_SCALE_DURATION;
            if (scaleFactor < 1) {
                ui.scale((1 - scaleFactor) * avatarScale, tabletState.getState() === tabletState.TABLET_AVAILABLE);
                menuScaleTimer = Script.setTimeout(scaleMenuDown, MENU_SCALE_TIMEOUT);
                return;
            }
            menuScaleTimer = null;
            setState(MENU_HIDDEN);
        }

        function enterMenuHiding() {
            ui.disable();
            menuScaleStart = Date.now();
            menuScaleTimer = Script.setTimeout(scaleMenuDown, MENU_SCALE_TIMEOUT);
        }

        function exitMenuHiding() {
            if (menuScaleTimer) {
                Script.clearTimeout(menuScaleTimer);
                menuScaleTimer = null;
            }
        }

        function scaleMenuUp() {
            var scaleFactor = (Date.now() - menuScaleStart) / MENU_SCALE_DURATION;
            if (scaleFactor < 1) {
                ui.scale(scaleFactor * avatarScale, tabletState.getState() === tabletState.TABLET_AVAILABLE);
                menuScaleTimer = Script.setTimeout(scaleMenuUp, MENU_SCALE_TIMEOUT);
                return;
            }
            menuScaleTimer = null;
            ui.scale(avatarScale, tabletState.getState() === tabletState.TABLET_AVAILABLE);
            setState(MENU_VISIBLE);
        }

        function enterMenuShowing(hand) {
            menuHand = hand;
            ui.setButtonActive(ui.MUTE_BUTTON, Audio.muted);
            ui.setButtonActive(ui.BUBBLE_BUTTON, Users.getIgnoreRadiusEnabled());
            ui.showMenu(hand);
            if (tabletState.getState() === tabletState.TABLET_AVAILABLE) {
                ui.showTablet(true);
            }
            menuScaleStart = Date.now();
            menuScaleTimer = Script.setTimeout(scaleMenuUp, MENU_SCALE_TIMEOUT);
        }

        function exitMenuShowing() {
            if (menuScaleTimer) {
                Script.clearTimeout(menuScaleTimer);
                menuScaleTimer = null;
            }
        }

        function enterMenuVisible() {
            ui.enable();
        }

        function updateMenuVisible() {
            // Check that palm direction of menu hand still less than maximum angle.
            if (!shouldShowMenu(menuHand)) {
                setState(MENU_HIDING);
            }
        }

        STATE_MACHINE = {
            MENU_DISABLED: { // Menu not shown because in desktop mode.
                enter: enterMenuDisabled,
                update: null,
                exit: exitMenuDisabled
            },
            MENU_HIDDEN: { // Menu could be shown but isn't because hand isn't oriented to show it.
                enter: enterMenuHidden,
                update: updateMenuHidden,
                exit: null
            },
            MENU_HIDING: { // Menu is reducing from MENU_VISIBLE to MENU_HIDDEN.
                enter: enterMenuHiding,
                update: null,
                exit: exitMenuHiding
            },
            MENU_SHOWING: { // Menu is expanding from MENU_HIDDEN to MENU_VISIBLE.
                enter: enterMenuShowing,
                update: null,
                exit: exitMenuShowing
            },
            MENU_VISIBLE: { // Menu is visible.
                enter: enterMenuVisible,
                update: updateMenuVisible,
                exit: null
            }
        };

        function getState() {
            return machineState;
        }

        function setState(state, data) {
            if (state !== machineState) {
                debug("State transition from " + STATE_STRINGS[machineState] + " to " + STATE_STRINGS[state]);
                if (STATE_MACHINE[STATE_STRINGS[machineState]].exit) {
                    STATE_MACHINE[STATE_STRINGS[machineState]].exit(data);
                }
                if (STATE_MACHINE[STATE_STRINGS[state]].enter) {
                    STATE_MACHINE[STATE_STRINGS[state]].enter(data);
                }
                machineState = state;
            } else {
                error("Null state transition: " + state + "!");
            }
        }

        function updateState() {
            if (STATE_MACHINE[STATE_STRINGS[machineState]].update) {
                STATE_MACHINE[STATE_STRINGS[machineState]].update();
            }
        }

        function getHand() {
            return menuHand;
        }

        function create() {
            // Nothing to do.
        }

        function destroy() {
            if (machineState !== MENU_DISABLED) {
                setState(MENU_DISABLED);
            }
        }

        create();

        return {
            MENU_DISABLED: MENU_DISABLED,
            MENU_HIDDEN: MENU_HIDDEN,
            MENU_HIDING: MENU_HIDING,
            MENU_SHOWING: MENU_SHOWING,
            MENU_VISIBLE: MENU_VISIBLE,
            updateState: updateState,
            getState: getState,
            setState: setState,
            getHand: getHand,
            destroy: destroy
        };

    };

    // #endregion

    // #region Events ==========================================================================================================

    function onScaleChanged() {
        avatarScale = MyAvatar.scale;
        // Clamp scale in order to work around M17434.
        avatarScale = Math.max(MyAvatar.getDomainMinScale(), Math.min(MyAvatar.getDomainMaxScale(), avatarScale));
    }

    function onMessageReceived(channel, data, senderID, localOnly) {
        var message,
            tabletHand,
            hand;

        if (channel !== HIFI_OBJECT_MANIPULATION_CHANNEL) {
            return;
        }

        message = JSON.parse(data);
        if (message.grabbedEntity !== ui.getTabletModelID()) {
            return;
        }

        tabletHand = menuState.getHand();
        if (message.action === "grab" && menuState.getState() === menuState.MENU_VISIBLE
                && tabletState.getState() === tabletState.TABLET_AVAILABLE) {
            hand = message.joint === HAND_NAMES[tabletHand] ? tabletHand : otherHand(tabletHand);
            if (hand === tabletHand) {
                tabletState.setState(tabletState.TABLET_EXPANDING, { hand: hand, goto: false });
            } else {
                tabletState.setState(tabletState.TABLET_GRABBED);
            }
        } else if (message.action === "release" && tabletState.getState() === tabletState.TABLET_GRABBED) {
            hand = message.joint === HAND_NAMES[tabletHand] ? tabletHand : otherHand(tabletHand);
            tabletState.setState(tabletState.TABLET_EXPANDING, { hand: hand, goto: false });
        }
    }

    function updateStates() {
        tabletState.updateState();
        menuState.updateState();
        updateTimer = Script.setTimeout(updateStates, UPDATE_INTERVAL);
    }

    function onDisplayModeChanged() {
        // Menu available only when HMD is active.
        if (HMD.active) {
            tabletState.setState(tabletState.TABLET_UNAVAILABLE);
            menuState.setState(menuState.MENU_HIDDEN);
            updateTimer = Script.setTimeout(updateStates, UPDATE_INTERVAL);
        } else {
            if (updateTimer) {
                Script.clearTimeout(updateTimer);
                updateTimer = null;
            }
            tabletState.setState(tabletState.TABLET_DISABLED);
            menuState.setState(menuState.MENU_DISABLED);
        }
    }

    // #endregion

    // #region Start-up and tear-down ==========================================================================================

    function setUp() {
        menuState = new MenuState();
        tabletState = new TabletState();

        MyAvatar.scaleChanged.connect(onScaleChanged);

        Messages.subscribe(HIFI_OBJECT_MANIPULATION_CHANNEL);
        Messages.messageReceived.connect(onMessageReceived);

        HMD.displayModeChanged.connect(onDisplayModeChanged);
        if (HMD.active) {
            menuState.setState(menuState.MENU_HIDDEN);
        }
    }

    function tearDown() {

        HMD.displayModeChanged.disconnect(onDisplayModeChanged);

        Messages.messageReceived.disconnect(onMessageReceived);
        Messages.unsubscribe(HIFI_OBJECT_MANIPULATION_CHANNEL);

        MyAvatar.scaleChanged.disconnect(onScaleChanged);

        tabletState.destroy();
        tabletState = null;
        menuState.destroy();
        menuState = null;
    }

    setUp();
    Script.scriptEnding.connect(tearDown);

    // #endregion

}());
