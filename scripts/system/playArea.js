//
//  controllers/playArea.js
//
//  Created by David Rowe on 21 Jul 2018.
//  Copyright 2018 High Fidelity, Inc.
//
//  Displays play area in red if in Oculus HMD and facing backward.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

(function () {

    "use strict";

    var isInHMDMode = false,
        isDisplayingPlayArea = false,

        playAreaOverlay,
        PLAY_AREA_OVERLAY_OFFSET = { x: 0, y: 0.02, z: 0 }, // Raise above surface to make visible.
        PLAY_AREA_OVERLAY_ROTATION = Quat.fromVec3Degrees({ x: -90, y: 0, z: 0 }), // Make overlay horizontal.
        PLAY_AREA_OVERLAY_IMAGE_SIZE = 256,
        PLAY_AREA_OVERLAY_IMAGE_RECTANGLE = 250, // Size of rectangle within image.
        PLAY_AREA_OVERLAY_SCALE = PLAY_AREA_OVERLAY_IMAGE_SIZE / PLAY_AREA_OVERLAY_IMAGE_RECTANGLE,

        playAreaSensorPositionOverlays = [],
        PLAY_AREA_SENSOR_OVERLAY_DIMENSIONS = { x: 0.11, y: 0.26, z: 0.11 },
        PLAY_AREA_SENSOR_OVERLAY_ROTATION = Quat.fromVec3Degrees({ x: 90, y: 0, z: 0 }),

        COLORS_TELEPORT_CAN_TELEPORT = { red: 97, green: 247, blue: 255 }, // Same as in teleport.js.
        COLORS_TELEPORT_CAN_TELEPORT_WARNING = { red: 255, green: 97, blue: 97 }, // Same as in teleport.js.
        hsvColorsTeleportCanTeleportWarning,

        isSensorWarning = false,
        SENSOR_ORIENTATION_WARNING_DEGREES = 150,
        SENSOR_ORIENTATION_WARNING_DOT_PRODUCT = Math.cos(SENSOR_ORIENTATION_WARNING_DEGREES / 180 * Math.PI),

        playArea = { x: 0, y: 0 },
        playAreaCenterOffset = PLAY_AREA_OVERLAY_OFFSET,
        DEFAULT_FOOT_OFFSET = 1.0,
        playAreaFootOffset = DEFAULT_FOOT_OFFSET,

        playAreaSensorPositions = [],

        fadeTimer = null,
        fadeFactor,
        PLAY_AREA_FADE_OK_DURATION = 1000,
        PLAY_AREA_FADE_OUT_DURATION = 500,
        PLAY_AREA_FADE_INTERVAL = 25,
        PLAY_AREA_FADE_OK_FACTOR = PLAY_AREA_FADE_INTERVAL / PLAY_AREA_FADE_OK_DURATION,
        PLAY_AREA_FADE_OUT_FACTOR = PLAY_AREA_FADE_INTERVAL / PLAY_AREA_FADE_OUT_DURATION,
        PLAY_AREA_BOX_ALPHA = 1.0,
        PLAY_AREA_SENSOR_ALPHA = 0.8;

    function hsvToRGB(hsv) {
        // https://en.wikipedia.org/wiki/HSL_and_HSV
        var c, h, x, rgb, m;

        c = hsv.v * hsv.s;
        h = hsv.h * 6.0;
        x = c * (1 - Math.abs(h % 2 - 1));
        if (0 <= h && h <= 1) {
            rgb = { red: c, green: x, blue: 0 };
        } else if (1 < h && h <= 2) {
            rgb = { red: x, green: c, blue: 0 };
        } else if (2 < h && h <= 3) {
            rgb = { red: 0, green: c, blue: x };
        } else if (3 < h && h <= 4) {
            rgb = { red: 0, green: x, blue: c };
        } else if (4 < h && h <= 5) {
            rgb = { red: x, green: 0, blue: c };
        } else {
            rgb = { red: c, green: 0, blue: x };
        }
        m = hsv.v - c;
        rgb = {
            red: Math.round((rgb.red + m) * 255),
            green: Math.round((rgb.green + m) * 255),
            blue: Math.round((rgb.blue + m) * 255)
        };
        return rgb;
    }

    function rgbToHSV(rgb) {
        // https://en.wikipedia.org/wiki/HSL_and_HSV
        var mMax, mMin, c, h, v, s;

        mMax = Math.max(rgb.red, rgb.green, rgb.blue);
        mMin = Math.min(rgb.red, rgb.green, rgb.blue);
        c = mMax - mMin;

        if (c === 0) {
            h = 0;
        } else if (mMax === rgb.red) {
            h = ((rgb.green - rgb.blue) / c) % 6;
        } else if (mMax === rgb.green) {
            h = (rgb.blue - rgb.red) / c + 2;
        } else {
            h = (rgb.red - rgb.green) / c + 4;
        }
        h = h / 6;
        v = mMax / 255;
        s = v === 0 ? 0 : c / mMax;
        return { h: h, s: s, v: v };
    }

    function isOculusHMD() {
        // FIXME: Need API method to determine HMD type.
        return HMD.sensorPositions.length > 0;
    }

    function setPlayAreaDimensions() {
        var avatarScale = MyAvatar.scale;

        Overlays.editOverlay(playAreaOverlay, {
            dimensions: {
                x: avatarScale * playArea.width,
                y: avatarScale * playArea.height
            }
        });

        for (var i = 0; i < playAreaSensorPositionOverlays.length; i++) {
            var localPosition = playAreaSensorPositions[i];
            localPosition = Vec3.multiply(avatarScale, localPosition);
            localPosition.y = avatarScale * PLAY_AREA_SENSOR_OVERLAY_DIMENSIONS.y / 2; // Position on the floor.
            Overlays.editOverlay(playAreaSensorPositionOverlays[i], {
                dimensions: Vec3.multiply(avatarScale, PLAY_AREA_SENSOR_OVERLAY_DIMENSIONS),
                parentID: playAreaOverlay,
                localPosition: Vec3.multiplyQbyV(Quat.inverse(PLAY_AREA_OVERLAY_ROTATION), localPosition)
            });
        }
    }

    function createOverlays() {
        var sensorOverlay,
            i, length;

        playAreaOverlay = Overlays.addOverlay("image3d", {
            url: Script.resolvePath("./assets/images/play-area.png"),
            color: COLORS_TELEPORT_CAN_TELEPORT_WARNING,
            alpha: PLAY_AREA_BOX_ALPHA,
            drawInFront: false,
            visible: false
        });

        playArea = HMD.playArea;
        playArea.width = PLAY_AREA_OVERLAY_SCALE * playArea.width;
        playArea.height = PLAY_AREA_OVERLAY_SCALE * playArea.height;
        playAreaCenterOffset = Vec3.sum({ x: playArea.x, y: 0, z: playArea.y }, PLAY_AREA_OVERLAY_OFFSET);

        playAreaSensorPositions = HMD.sensorPositions;
        for (i = 0, length = playAreaSensorPositions.length; i < length; i++) {
            if (i > playAreaSensorPositionOverlays.length - 1) {
                sensorOverlay = Overlays.addOverlay("shape", {
                    shape: "Cylinder",
                    color: COLORS_TELEPORT_CAN_TELEPORT_WARNING,
                    alpha: PLAY_AREA_SENSOR_ALPHA,
                    dimensions: PLAY_AREA_SENSOR_OVERLAY_DIMENSIONS,
                    parentID: playAreaOverlay,
                    localRotation: PLAY_AREA_SENSOR_OVERLAY_ROTATION,
                    solid: true,
                    drawInFront: false,
                    visible: false
                });
                playAreaSensorPositionOverlays.push(sensorOverlay);
            }
        }
        setPlayAreaDimensions();

        isSensorWarning = false;
    }

    function destroyOverlays() {
        var i, length;

        Overlays.deleteOverlay(playAreaOverlay);
        for (i = 0, length = playAreaSensorPositionOverlays.length; i < length; i++) {
            Overlays.deleteOverlay(playAreaSensorPositionOverlays[i]);
        }

        playAreaSensorPositionOverlays = [];
    }

    function setPlayAreaVisible(visible) {
        Overlays.editOverlay(playAreaOverlay, {
            visible: visible,
            color: COLORS_TELEPORT_CAN_TELEPORT_WARNING,
            alpha: visible ? PLAY_AREA_BOX_ALPHA : 0
        });
        for (var i = 0; i < playAreaSensorPositionOverlays.length; i++) {
            Overlays.editOverlay(playAreaSensorPositionOverlays[i], {
                visible: visible,
                color: COLORS_TELEPORT_CAN_TELEPORT_WARNING,
                alpha: visible ? PLAY_AREA_SENSOR_ALPHA : 0
            });
        }
    }

    function fadeOut() {
        var i, length;

        fadeFactor = fadeFactor - PLAY_AREA_FADE_OUT_FACTOR;
        if (fadeFactor > 0) {
            Overlays.editOverlay(playAreaOverlay, { alpha: fadeFactor * PLAY_AREA_BOX_ALPHA });
            var sensorAlpha = fadeFactor * PLAY_AREA_SENSOR_ALPHA;
            for (i = 0, length = playAreaSensorPositionOverlays.length; i < length; i++) {
                Overlays.editOverlay(playAreaSensorPositionOverlays[i], { alpha: sensorAlpha });
            }
            fadeTimer = Script.setTimeout(fadeOut, PLAY_AREA_FADE_INTERVAL);
        } else {
            setPlayAreaVisible(false);
        }
    }

    function fadeToOK() {
        var color,
            hsv,
            i, length;

        fadeFactor = fadeFactor - PLAY_AREA_FADE_OK_FACTOR;
        if (fadeFactor > 0) {
            color = {
                red: fadeFactor * COLORS_TELEPORT_CAN_TELEPORT_WARNING.red
                    + (1 - fadeFactor) * COLORS_TELEPORT_CAN_TELEPORT.red,
                green: fadeFactor * COLORS_TELEPORT_CAN_TELEPORT_WARNING.green
                    + (1 - fadeFactor) * COLORS_TELEPORT_CAN_TELEPORT.green,
                blue: fadeFactor * COLORS_TELEPORT_CAN_TELEPORT_WARNING.blue
                    + (1 - fadeFactor) * COLORS_TELEPORT_CAN_TELEPORT.blue
            };
            hsv = rgbToHSV(color);
            hsv.s = Math.abs((1 - 2 * (1 - fadeFactor)) * hsvColorsTeleportCanTeleportWarning.s);
            color = hsvToRGB(hsv);
            Overlays.editOverlay(playAreaOverlay, { color: color });
            for (i = 0, length = playAreaSensorPositionOverlays.length; i < length; i++) {
                Overlays.editOverlay(playAreaSensorPositionOverlays[i], { color: color });
            }
            fadeTimer = Script.setTimeout(fadeToOK, PLAY_AREA_FADE_INTERVAL);
        } else {
            fadeFactor = 1.0;
            fadeOut();
        }
    }

    function cancelFade() {
        if (fadeTimer !== null) {
            Script.clearTimeout(fadeTimer);
            fadeTimer = null;
        }
    }

    function fadePlayArea() {
        fadeFactor = 1.0;
        fadeToOK();
    }

    function displayPlayArea(display) {
        if (display) {
            // Display red immediately.
            cancelFade();
            setPlayAreaVisible(true);
            isDisplayingPlayArea = true;
        } else {
            // Fade into blue and fade out.
            fadePlayArea();
            isDisplayingPlayArea = false;
            // Play area is set invisible after fading out.
        }
    }

    function onMyAvatarScaleChanged() {
        setPlayAreaDimensions();
    }

    function onUpdate() {
        var position,
            footPosition,
            sensorToWorldMatrix, sensorToWorldRotation, worldToSensorMatrix, avatarSensorPosition, 
            hmdSensorDirection, sensorWarning;

        sensorToWorldMatrix = MyAvatar.sensorToWorldMatrix;
        sensorToWorldRotation = Mat4.extractRotation(MyAvatar.sensorToWorldMatrix);
        worldToSensorMatrix = Mat4.inverse(sensorToWorldMatrix);

        hmdSensorDirection = Mat4.transformVector(worldToSensorMatrix, Quat.getFront(HMD.orientation));
        hmdSensorDirection.y = 0; // In horizontal plane.
        hmdSensorDirection = Vec3.normalize(hmdSensorDirection);
        sensorWarning = Vec3.dot(hmdSensorDirection, Vec3.UNIT_NEG_Z) < SENSOR_ORIENTATION_WARNING_DOT_PRODUCT;

        if (sensorWarning !== isSensorWarning) {
            footPosition = MyAvatar.getJointPosition("RightToeBase");
            if (Vec3.equal(footPosition, Vec3.ZERO)) {
                footPosition = MyAvatar.getJointPosition("RightFoot");
            }
            if (!Vec3.equal(footPosition, Vec3.ZERO)) {
                playAreaFootOffset = MyAvatar.position.y - footPosition.y;
            } else {
                playAreaFootOffset = DEFAULT_FOOT_OFFSET;
            }

            playAreaFootOffset = DEFAULT_FOOT_OFFSET;
        }

        if (sensorWarning || isDisplayingPlayArea) {
            position = MyAvatar.position;
            position.y = position.y - playAreaFootOffset;
            avatarSensorPosition = Mat4.transformPoint(worldToSensorMatrix, MyAvatar.position);
            avatarSensorPosition.y = 0;
            Overlays.editOverlay(playAreaOverlay, {
                position: Vec3.sum(position,
                    Vec3.multiplyQbyV(sensorToWorldRotation,
                        Vec3.multiply(MyAvatar.scale, Vec3.subtract(playAreaCenterOffset, avatarSensorPosition)))),
                rotation: Quat.multiply(sensorToWorldRotation, PLAY_AREA_OVERLAY_ROTATION)
            });
        }

        if (sensorWarning !== isSensorWarning) {
            isSensorWarning = sensorWarning;
            displayPlayArea(isSensorWarning);
        }
    }

    function onDisplayModeChanged(isHMDMode) {
        if (isInHMDMode === isHMDMode || !isOculusHMD() || HMD.playArea.width === 0 || HMD.playArea.height === 0) {
            return;
        }

        isInHMDMode = isHMDMode;
        if (isInHMDMode) {
            createOverlays();
            MyAvatar.scaleChanged.connect(onMyAvatarScaleChanged);
            Script.update.connect(onUpdate);
        } else {
            Script.update.disconnect(onUpdate);
            MyAvatar.scaleChanged.disconnect(onMyAvatarScaleChanged);
            destroyOverlays();
        }
    }


    function setUp() {
        HMD.displayModeChanged.connect(onDisplayModeChanged);
    }

    function tearDown() {
        HMD.displayModeChanged.disconnect(onDisplayModeChanged);
        if (isInHMDMode) {
            Script.update.disconnect(onUpdate);
            MyAvatar.scaleChanged.disconnect(onMyAvatarScaleChanged);
            destroyOverlays();
        }
    }

    hsvColorsTeleportCanTeleportWarning = rgbToHSV(COLORS_TELEPORT_CAN_TELEPORT_WARNING);

    setUp();
    Script.scriptEnding.connect(tearDown);

}());
