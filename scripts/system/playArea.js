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

        isSensorWarning = false,
        SENSOR_ORIENTATION_WARNING_DEGREES = 150,
        SENSOR_ORIENTATION_WARNING_DOT_PRODUCT = Math.cos(SENSOR_ORIENTATION_WARNING_DEGREES / 180 * Math.PI),

        playArea = { x: 0, y: 0 },
        playAreaCenterOffset = PLAY_AREA_OVERLAY_OFFSET,
        DEFAULT_FOOT_OFFSET = 1.0,
        playAreaFootOffset = DEFAULT_FOOT_OFFSET,

        playAreaSensorPositions = [];

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
            alpha: 1.0,
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
                    alpha: 0.8,
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
        Overlays.editOverlay(playAreaOverlay, { visible: visible });
        for (var i = 0; i < playAreaSensorPositionOverlays.length; i++) {
            Overlays.editOverlay(playAreaSensorPositionOverlays[i], { visible: visible });
        }
    }

    function displayPlayArea(display) {
        if (display) {
            // Display red immediately.
            setPlayAreaVisible(true);
            isDisplayingPlayArea = true;
        } else {
            // Fade into blue and fade out.
            setPlayAreaVisible(false);
            isDisplayingPlayArea = false;
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

    setUp();
    Script.scriptEnding.connect(tearDown);

}());
