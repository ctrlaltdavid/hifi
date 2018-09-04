//
//  miniTablet.js
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

    Script.include("./libraries/utils.js");  // TODO: Is this still needed?

    var UI,
        ui = null,

        // State machine
        PROXY_DISABLED = 0,
        PROXY_HIDDEN = 1,
        PROXY_HIDING = 2,
        PROXY_SHOWING = 3,
        PROXY_VISIBLE = 4,
        PROXY_GRABBED = 5,
        PROXY_EXPANDING = 6,
        TABLET_OPEN = 7,
        STATE_STRINGS = ["PROXY_DISABLED", "PROXY_HIDDEN", "PROXY_HIDING", "PROXY_SHOWING", "PROXY_VISIBLE", "PROXY_GRABBED",
            "PROXY_EXPANDING", "TABLET_OPEN"],
        STATE_MACHINE,
        rezzerState = PROXY_DISABLED,
        proxyHand,
        PROXY_SCALE_DURATION = 150,
        PROXY_SCALE_TIMEOUT = 20,
        proxyScaleTimer = null,
        proxyScaleStart,
        PROXY_EXPAND_DURATION = 250,
        PROXY_EXPAND_TIMEOUT = 20,
        proxyExpandTimer = null,
        proxyExpandStart,
        isGoto,

        // Events
        MIN_HAND_CAMERA_ANGLE = 30,
        DEGREES_180 = 180,
        MIN_HAND_CAMERA_ANGLE_COS = Math.cos(Math.PI * MIN_HAND_CAMERA_ANGLE / DEGREES_180),
        updateTimer = null,
        UPDATE_INTERVAL = 300,
        HIFI_OBJECT_MANIPULATION_CHANNEL = "Hifi-Object-Manipulation",
        avatarScale = MyAvatar.scale,

        // TODO: Move into UI.
        // Sounds
        HOVER_SOUND = "./assets/sounds/button-hover.wav",
        HOVER_VOLUME = 0.5,
        CLICK_SOUND = "./assets/sounds/button-click.wav",
        CLICK_VOLUME = 0.8,
        hoverSound = SoundCache.getSound(Script.resolvePath(HOVER_SOUND)),
        clickSound = SoundCache.getSound(Script.resolvePath(CLICK_SOUND)),

        // Hands
        LEFT_HAND = 0,
        RIGHT_HAND = 1,
        HAND_NAMES = ["LeftHand", "RightHand"],

        // Miscellaneous.
        tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system"),
        DEBUG = false;

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

    function playSound(sound, volume) {
        Audio.playSound(sound, {
            position: proxyHand === LEFT_HAND ? MyAvatar.getLeftPalmPosition() : MyAvatar.getRightPalmPosition(),
            volume: volume,
            localOnly: true
        });
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
                    dimensions: { x: 0.032, y: 0.0485, z: 0.0023 },// Proportional to tablet proper.
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

            TABLET_EXPAND_HANDLES = [ // Normalized coordinates in range [-0.5, 0.5] about center of mini tablet.
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

            uiEnabled = false, // UI is disabled when hidden or showing / hiding.
            uiHand = LEFT_HAND,

            buttonClickedCallback;

        function updateMiniTabletID() {
            // Send mini-tablet overlay ID to controllerDispatcher so that it can use a smaller near grab distance.
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

        function show(hand) {
            var i, length;

            uiHand = hand;

            // Origin.
            Overlays.editOverlay(overlays[ORIGIN], {
                parentID: MyAvatar.SELF_ID,
                parentJointIndex: handJointIndex(uiHand),
                localPosition: Vec3.multiply(avatarScale, UI_POSITIONS[uiHand]),
                localRotation: UI_ROTATIONS[uiHand]
            });

            // Other overlays.
            for (i = 1, length = overlays.length; i < length; i++) {
                Overlays.editOverlay(overlays[i], {
                    parentID: OVERLAY_PROPERTIES[i].parentID, // Needed for tabet model.
                    localRotation: OVERLAY_PROPERTIES[i].localRotation,
                    dimensions: { x: 0.0001, y: 0.0001, z: 0.0001 }, // Vec3s are compatible with Vec2s.
                    visible: true
                });
            }

            hoverLeaveTimers[MUTE_BUTTON] = null;
            hoverLeaveTimers[BUBBLE_BUTTON] = null;
            hoverLeaveTimers[GOTO_BUTTON] = null;
            hoverLeaveTimers[EXPAND_BUTTON] = null;

            updateMiniTabletID();
        }

        function scale(scaleFactor) {
            // Scale UI in place.
            var properties,
                isRightHand = uiHand === RIGHT_HAND,
                SWAP_X = { x: -1, y: 1, z: 1 },
                swapX,
                i, length;

            for (i = 1, length = overlays.length; i < length; i++) {
                properties = OVERLAY_PROPERTIES[i];
                swapX = (isRightHand && SWAP_BUTTONS.indexOf(i) !== -1) ? SWAP_X : Vec3.ONE; // Swap bubble and tablet buttons?
                Overlays.editOverlay(overlays[i], {
                    localPosition: Vec3.multiply(scaleFactor, Vec3.multiplyVbyV(swapX, properties.localPosition)),
                    dimensions: Vec3.multiply(scaleFactor, properties.dimensions) // Vec3s are compatible with Vec2s.
                });
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

        function getTabletProxyID() {
            return overlays[TABLET_MODEL];
        }

        function getTabletProxyProperties() {
            var properties = Overlays.getProperties(overlays[TABLET_MODEL], ["position", "orientation"]);
            return {
                position: properties.position,
                orientation: properties.orientation
            };
        }

        function enable() {
            // Enable hovering and clicking.
            if (uiEnabled) {
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

            uiEnabled = true;
        }

        function disable() {
            // Disable hovering and clicking.
            if (!uiEnabled) {
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

            uiEnabled = false;
        }

        function hide() {
            var i, length;
            for (i = 0, length = overlays.length; i < length; i++) {
                Overlays.editOverlay(overlays[i], {
                    visible: false
                });
            }

            // Release tablet model parent so that hand can grab tablet proper.
            Overlays.editOverlay(overlays[TABLET_MODEL], {
                parentID: Uuid.NULL
            });
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
            show: show,
            scale: scale,
            startExpandingTablet: startExpandingTablet,
            expandTablet: expandTablet,
            getUIPositionAndRotation: getUIPositionAndRotation,
            getTabletProxyID: getTabletProxyID,
            getTabletProxyProperties: getTabletProxyProperties,
            enable: enable,
            disable: disable,
            hide: hide,
            setButtonActive: setButtonActive,
            buttonClicked: {
                connect: connectButtonClicked
            },
            destroy: destroy
        };
    };

    // #endregion

    // #region State Machine ===================================================================================================

    function onButtonClicked(button) {
        switch (button) {
            case ui.MUTE_BUTTON:
                Audio.muted = !Audio.muted;
                break;
            case ui.BUBBLE_BUTTON:
                Users.toggleIgnoreRadius();
                break;
            case ui.GOTO_BUTTON:
                setState(PROXY_EXPANDING, { hand: proxyHand, goto: true });
                break;
            case ui.EXPAND_BUTTON:
                setState(PROXY_EXPANDING, { hand: proxyHand, goto: false });
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

    function enterProxyDisabled() {
        // Stop updates.
        if (updateTimer !== null) {
            Script.clearTimeout(updateTimer);
            updateTimer = null;
        }

        // Stop event handling.
        ui.disable();
        Audio.mutedChanged.disconnect(onMutedChanged);
        Users.ignoreRadiusEnabledChanged.disconnect(onIgnoreRadiusEnabledChanged);

        // Don't keep overlays prepared if in desktop mode.
        ui.destroy();
        ui = null;
    }

    function exitProxyDisabled() {
        // Create UI so that it's ready to be displayed without seeing artefacts from creating the UI.
        ui = new UI();
        ui.buttonClicked.connect(onButtonClicked);

        // Start monitoring mute and bubble changes.
        Audio.mutedChanged.connect(onMutedChanged);
        Users.ignoreRadiusEnabledChanged.connect(onIgnoreRadiusEnabledChanged);

        // Start updates.
        updateTimer = Script.setTimeout(updateState, UPDATE_INTERVAL);
    }

    function shouldShowProxy(hand) {
        // Should show proxy if it would be oriented toward the camera.
        var pose,
            jointIndex,
            handPosition,
            handOrientation,
            uiPositionAndOrientation,
            proxyPosition,
            proxyOrientation,
            cameraToProxyDirection;

        pose = Controller.getPoseValue(hand === LEFT_HAND ? Controller.Standard.LeftHand : Controller.Standard.RightHand);
        if (!pose.valid) {
            return false;
        }

        jointIndex = handJointIndex(hand);
        handPosition = Vec3.sum(MyAvatar.position,
            Vec3.multiplyQbyV(MyAvatar.orientation, MyAvatar.getAbsoluteJointTranslationInObjectFrame(jointIndex)));
        handOrientation = Quat.multiply(MyAvatar.orientation, MyAvatar.getAbsoluteJointRotationInObjectFrame(jointIndex));
        uiPositionAndOrientation = ui.getUIPositionAndRotation(hand);
        proxyPosition = Vec3.sum(handPosition, Vec3.multiply(avatarScale,
            Vec3.multiplyQbyV(handOrientation, uiPositionAndOrientation.position)));
        proxyOrientation = Quat.multiply(handOrientation, uiPositionAndOrientation.rotation);
        cameraToProxyDirection = Vec3.normalize(Vec3.subtract(proxyPosition, Camera.position));
        return Vec3.dot(cameraToProxyDirection, Quat.getForward(proxyOrientation)) > MIN_HAND_CAMERA_ANGLE_COS;
    }

    function enterProxyHidden() {
        ui.disable();
        ui.hide();
    }

    function updateProxyHidden() {
        // Don't show proxy if tablet is already displayed or in toolbar mode.
        if (HMD.showTablet || tablet.toolbarMode) {
            return;
        }
        // Compare palm directions of hands with vectors from palms to camera.
        if (shouldShowProxy(LEFT_HAND)) {
            setState(PROXY_SHOWING, LEFT_HAND);
        } else if (shouldShowProxy(RIGHT_HAND)) {
            setState(PROXY_SHOWING, RIGHT_HAND);
        }
    }

    function scaleProxyDown() {
        var scaleFactor = (Date.now() - proxyScaleStart) / PROXY_SCALE_DURATION;
        if (scaleFactor < 1) {
            ui.scale((1 - scaleFactor) * avatarScale);
            proxyScaleTimer = Script.setTimeout(scaleProxyDown, PROXY_SCALE_TIMEOUT);
            return;
        }
        proxyScaleTimer = null;
        setState(PROXY_HIDDEN);
    }

    function enterProxyHiding() {
        ui.disable();
        proxyScaleStart = Date.now();
        proxyScaleTimer = Script.setTimeout(scaleProxyDown, PROXY_SCALE_TIMEOUT);
    }

    function updateProxyHiding() {
        if (HMD.showTablet) {
            setState(PROXY_HIDDEN);
        }
    }

    function exitProxyHiding() {
        if (proxyScaleTimer) {
            Script.clearTimeout(proxyScaleTimer);
            proxyScaleTimer = null;
        }
    }

    function scaleProxyUp() {
        var scaleFactor = (Date.now() - proxyScaleStart) / PROXY_SCALE_DURATION;
        if (scaleFactor < 1) {
            ui.scale(scaleFactor * avatarScale);
            proxyScaleTimer = Script.setTimeout(scaleProxyUp, PROXY_SCALE_TIMEOUT);
            return;
        }
        proxyScaleTimer = null;
        ui.scale(avatarScale);
        setState(PROXY_VISIBLE);
    }

    function enterProxyShowing(hand) {
        proxyHand = hand;
        ui.setButtonActive(ui.MUTE_BUTTON, Audio.muted);
        ui.setButtonActive(ui.BUBBLE_BUTTON, Users.getIgnoreRadiusEnabled());
        ui.show(hand);
        proxyScaleStart = Date.now();
        proxyScaleTimer = Script.setTimeout(scaleProxyUp, PROXY_SCALE_TIMEOUT);
    }

    function updateProxyShowing() {
        if (HMD.showTablet) {
            setState(PROXY_HIDDEN);
        }
    }

    function exitProxyShowing() {
        if (proxyScaleTimer) {
            Script.clearTimeout(proxyScaleTimer);
            proxyScaleTimer = null;
        }
    }

    function enterProxyVisible() {
        ui.enable();
    }

    function updateProxyVisible() {
        // Hide proxy if tablet has been displayed by other means.
        if (HMD.showTablet) {
            setState(PROXY_HIDDEN);
            return;
        }
        // Check that palm direction of proxy hand still less than maximum angle.
        if (!shouldShowProxy(proxyHand)) {
            setState(PROXY_HIDING);
        }
    }

    function updateProxyGrabbed() {
        // Hide proxy if tablet has been displayed by other means.
        if (HMD.showTablet) {
            setState(PROXY_HIDDEN);
        }
    }

    function expandProxy() {
        var scaleFactor = (Date.now() - proxyExpandStart) / PROXY_EXPAND_DURATION;
        if (scaleFactor < 1) {
            ui.expandTablet(scaleFactor);
            proxyExpandTimer = Script.setTimeout(expandProxy, PROXY_EXPAND_TIMEOUT);
            return;
        }
        proxyExpandTimer = null;
        setState(TABLET_OPEN);
    }

    function enterProxyExpanding(data) {
        // Target details.
        isGoto = data.goto;

        ui.startExpandingTablet(data.hand);
        proxyExpandStart = Date.now();
        proxyExpandTimer = Script.setTimeout(expandProxy, PROXY_EXPAND_TIMEOUT);
    }

    function updateProxyExanding() {
        // Hide proxy immediately if tablet has been displayed by other means.
        if (HMD.showTablet) {
            setState(PROXY_HIDDEN);
        }
    }

    function exitProxyExpanding() {
        if (proxyExpandTimer !== null) {
            Script.clearTimeout(proxyExpandTimer);
            proxyExpandTimer = null;
        }
    }

    function enterTabletOpen() {
        var tabletProxyProperties = ui.getTabletProxyProperties(),
            TABLET_ADDRESS_DIALOG = "hifi/tablet/TabletAddressDialog.qml";

        ui.hide();

        if (isGoto) {
            tablet.loadQMLSource(TABLET_ADDRESS_DIALOG);
        } else {
            tablet.gotoHomeScreen();
        }

        Overlays.editOverlay(HMD.tabletID, {
            position: tabletProxyProperties.position,
            orientation: tabletProxyProperties.orientation
        });

        HMD.openTablet(true);
    }

    function updateTabletOpen() {
        // Immediately transition back to PROXY_HIDDEN.
        setState(PROXY_HIDDEN);
    }

    STATE_MACHINE = {
        PROXY_DISABLED: { // Tablet proxy cannot be shown because in desktop mode.
            enter: enterProxyDisabled,
            update: null,
            exit: exitProxyDisabled
        },
        PROXY_HIDDEN: { // Tablet proxy could be shown but isn't because hand is oriented to show it or aren't in HMD mode.
            enter: enterProxyHidden,
            update: updateProxyHidden,
            exit: null
        },
        PROXY_HIDING: { // Tablet proxy is reducing from PROXY_VISIBLE to PROXY_HIDDEN.
            enter: enterProxyHiding,
            update: updateProxyHiding,
            exit: exitProxyHiding
        },
        PROXY_SHOWING: { // Tablet proxy is expanding from PROXY_HIDDN to PROXY_VISIBLE.
            enter: enterProxyShowing,
            update: updateProxyShowing,
            exit: exitProxyShowing
        },
        PROXY_VISIBLE: { // Tablet proxy is visible and attached to hand.
            enter: enterProxyVisible,
            update: updateProxyVisible,
            exit: null
        },
        PROXY_GRABBED: { // Tablet proxy is grabbed by other hand.
            enter: null,
            update: updateProxyGrabbed,
            exit: null
        },
        PROXY_EXPANDING: { // Tablet proxy is expanding before showing tablet proper.
            enter: enterProxyExpanding,
            update: updateProxyExanding,
            exit: exitProxyExpanding
        },
        TABLET_OPEN: { // Tablet proper is being displayed.
            enter: enterTabletOpen,
            update: updateTabletOpen,
            exit: null
        }
    };

    function setState(state, data) {
        if (state !== rezzerState) {
            debug("State transition from " + STATE_STRINGS[rezzerState] + " to " + STATE_STRINGS[state]);
            if (STATE_MACHINE[STATE_STRINGS[rezzerState]].exit) {
                STATE_MACHINE[STATE_STRINGS[rezzerState]].exit(data);
            }
            if (STATE_MACHINE[STATE_STRINGS[state]].enter) {
                STATE_MACHINE[STATE_STRINGS[state]].enter(data);
            }
            rezzerState = state;
        } else {
            error("Null state transition: " + state + "!");
        }
    }

    function updateState() {
        if (STATE_MACHINE[STATE_STRINGS[rezzerState]].update) {
            STATE_MACHINE[STATE_STRINGS[rezzerState]].update();
        }
        updateTimer = Script.setTimeout(updateState, UPDATE_INTERVAL);
    }

    // #endregion

    // #region Events ==========================================================================================================

    function onScaleChanged() {
        avatarScale = MyAvatar.scale;
        // Clamp scale in order to work around M17434.
        avatarScale = Math.max(MyAvatar.getDomainMinScale(), Math.min(MyAvatar.getDomainMaxScale(), avatarScale));
    }

    function onMessageReceived(channel, data, senderID, localOnly) {
        var message, hand;

        if (channel !== HIFI_OBJECT_MANIPULATION_CHANNEL) {
            return;
        }

        message = JSON.parse(data);
        if (message.grabbedEntity !== ui.getTabletProxyID()) {
            return;
        }

        if (message.action === "grab" && rezzerState === PROXY_VISIBLE) {
            hand = message.joint === HAND_NAMES[proxyHand] ? proxyHand : otherHand(proxyHand);
            if (hand === proxyHand) {
                setState(PROXY_EXPANDING, { hand: hand, goto: false });
            } else {
                setState(PROXY_GRABBED);
            }
        } else if (message.action === "release" && rezzerState === PROXY_GRABBED) {
            hand = message.joint === HAND_NAMES[proxyHand] ? proxyHand : otherHand(proxyHand);
            setState(PROXY_EXPANDING, { hand: hand, goto: false });
        }
    }

    function onDisplayModeChanged() {
        // Tablet proxy only available when HMD is active.
        if (HMD.active) {
            setState(PROXY_HIDDEN);
        } else {
            setState(PROXY_DISABLED);
        }
    }

    // #endregion

    // #region Start-up and tear-down ==========================================================================================

    function setUp() {
        MyAvatar.scaleChanged.connect(onScaleChanged);

        Messages.subscribe(HIFI_OBJECT_MANIPULATION_CHANNEL);
        Messages.messageReceived.connect(onMessageReceived);

        HMD.displayModeChanged.connect(onDisplayModeChanged);
        if (HMD.active) {
            setState(PROXY_HIDDEN);
        }
    }

    function tearDown() {
        if (updateTimer !== null) {
            Script.clearTimeout(updateTimer);
            updateTimer = null;
        }

        setState(PROXY_DISABLED);

        HMD.displayModeChanged.disconnect(onDisplayModeChanged);

        Messages.messageReceived.disconnect(onMessageReceived);
        Messages.unsubscribe(HIFI_OBJECT_MANIPULATION_CHANNEL);

        MyAvatar.scaleChanged.disconnect(onScaleChanged);
    }

    setUp();
    Script.scriptEnding.connect(tearDown);

    // #endregion

}());
