//
//  turnAroundArrows.js
//
//  If in HMD mode and using Oculus Rift, animated "turn-around" arrows are displayed behind the user relative to the sensors.
//
//  Created by David Rowe on 24 Aug 2018.
//  Copyright 2018 High Fidelity, Inc.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

(function () {

    "use strict";

    var isInHMDMode = false,
        LEFT = 0,
        RIGHT = 1,

        ORIGIN_OFFSET = { x: 0, y: 0.1, z: 0 }, // Adjust elevation of overlays.
        ORIGIN_ORIENTATION = Quat.fromVec3Degrees({x: 0, y: 180, z: 0 }),
        BACKGROUND_OVERLAY_MODEL = Script.resolvePath("./assets/models/prototype1_2BackgroundOverlayV2.fbx"),
        BACKGROUND_OVERLAY_DIMENSIONS_RAW = { x: 18.8120, y: 7.0241, z: 37.6240 },
        BACKGROUND_OVERLAY_SCALE = 0.3,
        BACKGROUND_OVERLAY_DIMENSIONS = Vec3.multiply(BACKGROUND_OVERLAY_SCALE, BACKGROUND_OVERLAY_DIMENSIONS_RAW),
        BACKGROUND_OVERLAY_ORIENTATION = Quat.fromVec3Degrees({ x: 0, y: 90, z: 0 }),
        ARROW_OVERLAY_MODEL = Script.resolvePath("./assets/models/prototype1_2arrow.fbx"),
        ARROW_OVERLAY_DIMENSIONS_RAW = { x: 1.3989, y: 5.3350, z: 4.2182 },
        ARROW_OVERLAY_SCALE = 0.1,
        ARROW_OVERLAY_DIMENSIONS = Vec3.multiply(ARROW_OVERLAY_SCALE, ARROW_OVERLAY_DIMENSIONS_RAW),
        ARROW_OVERLAY_ORIENTATIONS = [
            Quat.fromVec3Degrees({ x: 0, y: 90, z: 0 }),
            Quat.fromVec3Degrees({ x: 0, y: -90, z: 0 })
        ],
        ARROW_RADIUS = 5,
        ARROW_RADIUS_VECTOR = { x: 0, y: 0, z: -ARROW_RADIUS },
        originOverlay, // Provides position and orientation for other overlays to parent to.
        backgroundOverlay,
        arrowOverlays = [],

        START_ANGLE = 10, // Degrees.
        FINISH_ANGLE = 80,
        START_ANGLES = [START_ANGLE, -START_ANGLE],
        DELTA_ANGLES = [FINISH_ANGLE - START_ANGLE, -FINISH_ANGLE + START_ANGLE],

        ARROW_ANIMATION_DURATION = 1000, // Milliseconds.
        TOTAL_ANIMATION_DURATION = 3000, // Gap between arrow animations = TOTAL_ANIMATION_DURATION - ARROW_ANIMATION_DURATION.
        animationStart = 0,
        UPDATE_TIMEOUT = 10,
        updateTimer = null,

        avatarScale = MyAvatar.scale,
        originOffset,
        backgroundOverlayDimensions,
        arrowOverlayDimensions,
        arrowRadiusVector;


    function createOverlays() {
        originOverlay = Overlays.addOverlay("sphere", {
            dimensions: { x: 0.1, y: 0.1, z: 0.1 },
            visible: false
        });
        backgroundOverlay = Overlays.addOverlay("model", {
            url: BACKGROUND_OVERLAY_MODEL,
            parentID: originOverlay,
            visible: false

        });
        arrowOverlays[LEFT] = Overlays.addOverlay("model", {
            url: ARROW_OVERLAY_MODEL,
            parentID: originOverlay,
            visible: false
        });
        arrowOverlays[RIGHT] = Overlays.addOverlay("model", {
            url: ARROW_OVERLAY_MODEL,
            parentID: originOverlay,
            visible: false
        });
    }

    function scaleOverlays() {
        originOffset = Vec3.multiply(avatarScale, ORIGIN_OFFSET);
        backgroundOverlayDimensions = Vec3.multiply(avatarScale, BACKGROUND_OVERLAY_DIMENSIONS);
        arrowOverlayDimensions = Vec3.multiply(avatarScale, ARROW_OVERLAY_DIMENSIONS);
        arrowRadiusVector = Vec3.multiply(avatarScale, ARROW_RADIUS_VECTOR);

        Overlays.editOverlay(backgroundOverlay, {
            dimensions: backgroundOverlayDimensions
        });
        Overlays.editOverlay(arrowOverlays[LEFT], {
            dimensions: arrowOverlayDimensions
        });
        Overlays.editOverlay(arrowOverlays[RIGHT], {
            dimensions: arrowOverlayDimensions
        });
    }

    function positionOverlays() {
        // Position and orient relative to sensors.
        var sensorToWorldMatrix = MyAvatar.sensorToWorldMatrix;
        Overlays.editOverlay(originOverlay, {
            position: Vec3.sum(Mat4.extractTranslation(sensorToWorldMatrix), originOffset),
            orientation: Quat.multiply(ORIGIN_ORIENTATION, Mat4.extractRotation(sensorToWorldMatrix))
        });
        Overlays.editOverlay(backgroundOverlay, {
            localPosition: { x: 0, y: 0, z: -backgroundOverlayDimensions.x / 2},
            localRotation: BACKGROUND_OVERLAY_ORIENTATION
        });
    }

    function positionArrows(factor) {
        var rotation,
            i;
        for (i = LEFT; i <= RIGHT; i++) {
            rotation = Quat.fromVec3Degrees({ x: 0, y: START_ANGLES[i] + factor * DELTA_ANGLES[i], z: 0 });
            Overlays.editOverlay(arrowOverlays[i], {
                localPosition: Vec3.multiplyQbyV(rotation, arrowRadiusVector),
                localRotation: Quat.multiply(rotation, ARROW_OVERLAY_ORIENTATIONS[i])
            });
        }
    }

    function showBackground() {
        Overlays.editOverlay(backgroundOverlay, { visible: true });
    }

    function showArrows() {
        Overlays.editOverlay(arrowOverlays[LEFT], { visible: true });
        Overlays.editOverlay(arrowOverlays[RIGHT], { visible: true });
    }

    function hideArrows() {
        Overlays.editOverlay(arrowOverlays[LEFT], { visible: false });
        Overlays.editOverlay(arrowOverlays[RIGHT], { visible: false });
    }

    function destroyOverlays() {
        Overlays.deleteOverlay(originOverlay);
        Overlays.deleteOverlay(backgroundOverlay);
        Overlays.deleteOverlay(arrowOverlays[LEFT]);
        Overlays.deleteOverlay(arrowOverlays[RIGHT]);
    }

    function onMyAvatarScaleChanged() {
        avatarScale = MyAvatar.scale;
        scaleOverlays();
        if (isInHMDMode) {
            positionOverlays();
        }
    }

    function update() {
        var deltaTime = Date.now() - animationStart;

        if (deltaTime >= TOTAL_ANIMATION_DURATION) {
            // Start a new animation
            positionOverlays();
            positionArrows(0);
            showArrows();
            animationStart = Date.now();
            updateTimer = Script.setTimeout(update, UPDATE_TIMEOUT);

        } else if (deltaTime <= ARROW_ANIMATION_DURATION) {
            // Animate arrows.
            positionArrows(deltaTime / ARROW_ANIMATION_DURATION);
            updateTimer = Script.setTimeout(update, UPDATE_TIMEOUT);

        } else {
            // Stop arrow animation and schedule a restart.
            hideArrows();
            updateTimer = Script.setTimeout(update, TOTAL_ANIMATION_DURATION - deltaTime);
        }
    }

    function startRunning() {
        createOverlays();
        MyAvatar.scaleChanged.connect(onMyAvatarScaleChanged);
        scaleOverlays();
        update(); // Kick off update loop.
        showBackground(); // Make visible after initially positioned.
    }

    function stopRunning() {
        MyAvatar.scaleChanged.disconnect(onMyAvatarScaleChanged);
        Script.clearTimeout(updateTimer);
        updateTimer = null;
        destroyOverlays();
    }

    function onDisplayModeChanged(isHMDMode) {
        if (isHMDMode === isInHMDMode || !HMD.isHeadControllerAvailable("Oculus")) {
            return;
        }

        isInHMDMode = isHMDMode;
        if (isInHMDMode) {
            startRunning();
        } else {
            stopRunning();
        }
    }

    function setUp() {
        if (Script.context !== "client") {
            return;
        }

        HMD.displayModeChanged.connect(onDisplayModeChanged);
        onDisplayModeChanged(HMD.active);
    }

    function tearDown() {
        HMD.displayModeChanged.disconnect(onDisplayModeChanged);
        if (isInHMDMode) {
            stopRunning();
        }
    }

    setUp();
    Script.scriptEnding.connect(tearDown);

}());
