//
//  viveControllerConfiguration.js
//
//  Created by Anthony J. Thibault on 10/20/16
//  Originally created by Ryan Huffman on 9/21/2016
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

/* globals VIVE_CONTROLLER_CONFIGURATION_LEFT:true, VIVE_CONTROLLER_CONFIGURATION_RIGHT:true,
   MyAvatar, Quat, Script, Vec3, Controller */
/* eslint camelcase: ["error", { "properties": "never" }] */

// var LEFT_JOINT_INDEX = MyAvatar.getJointIndex("_CONTROLLER_LEFTHAND");
// var RIGHT_JOINT_INDEX = MyAvatar.getJointIndex("_CONTROLLER_RIGHTHAND");

var leftBaseRotation = Quat.multiply(
    Quat.fromPitchYawRollDegrees(0, 0, 45),
    Quat.multiply(
        Quat.fromPitchYawRollDegrees(90, 0, 0),
        Quat.fromPitchYawRollDegrees(0, 0, 90)
    )
);

var rightBaseRotation = Quat.multiply(
    Quat.fromPitchYawRollDegrees(0, 0, -45),
    Quat.multiply(
        Quat.fromPitchYawRollDegrees(90, 0, 0),
        Quat.fromPitchYawRollDegrees(0, 0, -90)
    )
);

// keep these in sync with the values from plugins/openvr/src/OpenVrHelpers.cpp:303
var CONTROLLER_LATERAL_OFFSET = 0.0381;
var CONTROLLER_VERTICAL_OFFSET = 0.0495;
var CONTROLLER_FORWARD_OFFSET = 0.1371;
var leftBasePosition = {
    x: CONTROLLER_VERTICAL_OFFSET,
    y: CONTROLLER_FORWARD_OFFSET,
    z: CONTROLLER_LATERAL_OFFSET
};
var rightBasePosition = {
    x: -CONTROLLER_VERTICAL_OFFSET,
    y: CONTROLLER_FORWARD_OFFSET,
    z: CONTROLLER_LATERAL_OFFSET
};

var viveNaturalDimensions = {
    x: 0.1174320001155138,
    y: 0.08361100335605443,
    z: 0.21942697931081057
};

var viveNaturalPosition = {
    x: 0,
    y: -0.034076502197422087,
    z: 0.06380049744620919
};

var BASE_URL = Script.resourcesPath();
// var TIP_TEXTURE_BASE_URL = BASE_URL + "meshes/controller/vive_tips.fbm/";

var viveModelURL = BASE_URL + "meshes/controller/vive_body.fbx";
// var viveTipsModelURL = BASE_URL + "meshes/controller/vive_tips.fbx";
var viveTriggerModelURL = "meshes/controller/vive_trigger.fbx";

VIVE_CONTROLLER_CONFIGURATION_LEFT = {
    name: "Vive",
    controllers: [
        {
            modelURL: viveModelURL,
            jointIndex: MyAvatar.getJointIndex("_CAMERA_RELATIVE_CONTROLLER_LEFTHAND"),
            naturalPosition: viveNaturalPosition,
            rotation: leftBaseRotation,
            position: Vec3.multiplyQbyV(Quat.fromPitchYawRollDegrees(0, 0, 45), leftBasePosition),

            dimensions: viveNaturalDimensions,

            parts: {
                // DISABLED FOR NOW
                /*
                tips: {
                    type: "static",
                    modelURL: viveTipsModelURL,
                    naturalPosition: {"x":-0.004377640783786774,"y":-0.034371938556432724,"z":0.06769277155399323},
                    naturalDimensions: {x: 0.191437, y: 0.094095, z: 0.085656},

                    textureName: "Tex.Blank",
                    defaultTextureLayer: "blank",
                    textureLayers: {
                        blank: {
                            defaultTextureURL: TIP_TEXTURE_BASE_URL + "/Blank.png"
                        },
                        trigger: {
                            defaultTextureURL: TIP_TEXTURE_BASE_URL + "/Trigger.png"
                        },
                        arrows: {
                            defaultTextureURL: TIP_TEXTURE_BASE_URL + "/Rotate.png"
                        },
                        grip: {
                            defaultTextureURL: TIP_TEXTURE_BASE_URL + "/Grip.png"
                        },
                        teleport: {
                            defaultTextureURL: TIP_TEXTURE_BASE_URL + "/Teleport.png"
                        }
                    }
                },
                */

                // The touchpad type draws a dot indicating the current touch/thumb position
                // and swaps in textures based on the thumb position.
                touchpad: {
                    type: "touchpad",
                    modelURL: BASE_URL + "meshes/controller/vive_trackpad.fbx",
                    visibleInput: "Vive.RSTouch",
                    xInput: "Vive.LX",
                    yInput: "Vive.LY",
                    naturalPosition: {"x":0,"y":0.000979491975158453,"z":0.04872849956154823},
                    naturalDimensions: {x: 0.042824, y: 0.012537, z: 0.043115},
                    minValue: 0.0,
                    maxValue: 1.0,
                    minPosition: { x: -0.035, y: 0.004, z: -0.005 },
                    maxPosition: { x: -0.035, y: 0.004, z: -0.005 },
                    disable_textureName: "Tex.touchpad-blank",

                    disable_defaultTextureLayer: "blank",
                    disable_textureLayers: {
                        blank: {
                            defaultTextureURL: BASE_URL + "meshes/controller/vive_trackpad.fbx/Touchpad.fbm/touchpad-blank.jpg"
                        },
                        teleport: {
                            defaultTextureURL: BASE_URL + "meshes/controller/vive_trackpad.fbx/Touchpad.fbm/touchpad-teleport-active-LG.jpg"
                        },
                        arrows: {
                            defaultTextureURL: BASE_URL + "meshes/controller/vive_trackpad.fbx/Touchpad.fbm/touchpad-look-arrows.jpg"
                        }
                    }
                },

                trigger: {
                    type: "rotational",
                    modelURL: BASE_URL + "meshes/controller/vive_trigger.fbx",
                    input: Controller.Standard.LT,
                    naturalPosition: {"x":0.000004500150680541992,"y":-0.027690507471561432,"z":0.04830199480056763},
                    naturalDimensions: {x: 0.019105, y: 0.022189, z: 0.01909},
                    origin: { x: 0, y: -0.015, z: -0.00 },
                    minValue: 0.0,
                    maxValue: 1.0,
                    axis: { x: -1, y: 0, z: 0 },
                    maxAngle: 25,

                    textureName: "Tex.black-trigger",
                    defaultTextureLayer: "normal",
                    textureLayers: {
                        normal: {
                            defaultTextureURL: BASE_URL + viveTriggerModelURL + "/Trigger.fbm/black.jpg"
                        },
                        highlight: {
                            defaultTextureURL: BASE_URL + viveTriggerModelURL + "/Trigger.fbm/yellow.jpg"
                        }
                    }
                },

                l_grip: {
                    type: "static",
                    modelURL: BASE_URL + "meshes/controller/vive_l_grip.fbx",
                    naturalPosition: {"x":-0.01720449887216091,"y":-0.014324013143777847,"z":0.08714400231838226},
                    naturalDimensions: {x: 0.010094, y: 0.015064, z: 0.029552}
                },

                r_grip: {
                    type: "static",
                    modelURL: BASE_URL + "meshes/controller/vive_r_grip.fbx",
                    naturalPosition: {"x":0.01720449887216091,"y":-0.014324013143777847,"z":0.08714400231838226},
                    naturalDimensions: {x: 0.010083, y: 0.015064, z: 0.029552}
                },

                sys_button: {
                    type: "static",
                    modelURL: BASE_URL + "meshes/controller/vive_sys_button.fbx",
                    naturalPosition: {"x":0,"y":0.0020399854984134436,"z":0.08825899660587311},
                    naturalDimensions: {x: 0.009986, y: 0.004282, z: 0.010264}
                },

                button: {
                    type: "static",
                    modelURL: BASE_URL + "meshes/controller/vive_button.fbx",
                    naturalPosition: {"x":0,"y":0.005480996798723936,"z":0.019918499514460564},
                    naturalDimensions: {x: 0.009986, y: 0.004496, z: 0.010121}
                },
                button2: {
                    type: "static",
                    modelURL: BASE_URL + "meshes/controller/vive_button.fbx",
                    naturalPosition: {"x":0,"y":0.005480996798723936,"z":0.019918499514460564},
                    naturalDimensions: {x: 0.009986, y: 0.004496, z: 0.010121}
                }
            }
        }
    ]
};


VIVE_CONTROLLER_CONFIGURATION_RIGHT = {
    name: "Vive Right",
    controllers: [
        {
            modelURL: viveModelURL,
            jointIndex: MyAvatar.getJointIndex("_CAMERA_RELATIVE_CONTROLLER_RIGHTHAND"),
            rotation: rightBaseRotation,
            position: Vec3.multiplyQbyV(Quat.fromPitchYawRollDegrees(0, 0, -45), rightBasePosition),

            dimensions: viveNaturalDimensions,

            naturalPosition: {
                x: 0,
                y: -0.034076502197422087,
                z: 0.06380049744620919
            },

            parts: {
                // DISABLED FOR NOW
                /*
                tips: {
                    type: "static",
                    modelURL: viveTipsModelURL,
                    naturalPosition: {"x":-0.004377640783786774,"y":-0.034371938556432724,"z":0.06769277155399323},
                    naturalDimensions: {x: 0.191437, y: 0.094095, z: 0.085656},

                    textureName: "Tex.Blank",

                    defaultTextureLayer: "blank",
                    textureLayers: {
                        blank: {
                            defaultTextureURL: TIP_TEXTURE_BASE_URL + "/Blank.png"
                        },
                        trigger: {
                            defaultTextureURL: TIP_TEXTURE_BASE_URL + "/Trigger.png"
                        },
                        arrows: {
                            defaultTextureURL: TIP_TEXTURE_BASE_URL + "/Rotate.png"
                        },
                        grip: {
                            defaultTextureURL: TIP_TEXTURE_BASE_URL + "/Grip.png"
                        },
                        teleport: {
                            defaultTextureURL: TIP_TEXTURE_BASE_URL + "/Teleport.png"
                        }
                    }
                },
                */

                // The touchpad type draws a dot indicating the current touch/thumb position
                // and swaps in textures based on the thumb position.
                touchpad: {
                    type: "touchpad",
                    modelURL: BASE_URL + "meshes/controller/vive_trackpad.fbx",
                    visibleInput: "Vive.RSTouch",
                    xInput: "Vive.RX",
                    yInput: "Vive.RY",
                    naturalPosition: { x: 0, y: 0.000979491975158453, z: 0.04872849956154823 },
                    naturalDimensions: {x: 0.042824, y: 0.012537, z: 0.043115},
                    minValue: 0.0,
                    maxValue: 1.0,
                    minPosition: { x: -0.035, y: 0.004, z: -0.005 },
                    maxPosition: { x: -0.035, y: 0.004, z: -0.005 },
                    disable_textureName: "Tex.touchpad-blank",

                    disable_defaultTextureLayer: "blank",
                    disable_textureLayers: {
                        blank: {
                            defaultTextureURL: BASE_URL + "meshes/controller/vive_trackpad.fbx/Touchpad.fbm/touchpad-blank.jpg"
                        },
                        teleport: {
                            defaultTextureURL: BASE_URL + "meshes/controller/vive_trackpad.fbx/Touchpad.fbm/touchpad-teleport-active-LG.jpg"
                        },
                        arrows: {
                            defaultTextureURL: BASE_URL + "meshes/controller/vive_trackpad.fbx/Touchpad.fbm/touchpad-look-arrows-active.jpg"
                        }
                    }
                },

                trigger: {
                    type: "rotational",
                    modelURL: BASE_URL + "meshes/controller/vive_trigger.fbx",
                    input: Controller.Standard.RT,
                    naturalPosition: {"x":0.000004500150680541992,"y":-0.027690507471561432,"z":0.04830199480056763},
                    naturalDimensions: {x: 0.019105, y: 0.022189, z: 0.01909},
                    origin: { x: 0, y: -0.015, z: -0.00 },
                    minValue: 0.0,
                    maxValue: 1.0,
                    axis: { x: -1, y: 0, z: 0 },
                    maxAngle: 25,

                    textureName: "Tex.black-trigger",
                    defaultTextureLayer: "normal",
                    textureLayers: {
                        normal: {
                            defaultTextureURL: BASE_URL + viveTriggerModelURL + "/Trigger.fbm/black.jpg"
                        },
                        highlight: {
                            defaultTextureURL: BASE_URL + viveTriggerModelURL + "/Trigger.fbm/yellow.jpg"
                        }
                    }
                },

                l_grip: {
                    type: "static",
                    modelURL: BASE_URL + "meshes/controller/vive_l_grip.fbx",
                    naturalPosition: {"x":-0.01720449887216091,"y":-0.014324013143777847,"z":0.08714400231838226},
                    naturalDimensions: {x: 0.010094, y: 0.015064, z: 0.029552}
                },

                r_grip: {
                    type: "static",
                    modelURL: BASE_URL + "meshes/controller/vive_r_grip.fbx",
                    naturalPosition: {"x":0.01720449887216091,"y":-0.014324013143777847,"z":0.08714400231838226},
                    naturalDimensions: {x: 0.010083, y: 0.015064, z: 0.029552}
                },

                sys_button: {
                    type: "static",
                    modelURL: BASE_URL + "meshes/controller/vive_sys_button.fbx",
                    naturalPosition: {"x":0,"y":0.0020399854984134436,"z":0.08825899660587311},
                    naturalDimensions: {x: 0.009986, y: 0.004282, z: 0.010264}
                },

                button: {
                    type: "static",
                    modelURL: BASE_URL + "meshes/controller/vive_button.fbx",
                    naturalPosition: {"x":0,"y":0.005480996798723936,"z":0.019918499514460564},
                    naturalDimensions: {x: 0.009986, y: 0.004496, z: 0.010121}
                },
                button2: {
                    type: "static",
                    modelURL: BASE_URL + "meshes/controller/vive_button.fbx",
                    naturalPosition: {"x":0,"y":0.005480996798723936,"z":0.019918499514460564},
                    naturalDimensions: {x: 0.009986, y: 0.004496, z: 0.010121}
                }
            }
        }
    ]
};

(function () {

    var DISPLAY_TIME = 2,  // How long the messages are displayed, in seconds.
        CALIBRATION_SUCCESS = "Calibrated",
        CALIBRATION_FAILURE = "Not Calibrated",
        UNCALIBRATION = "Uncalibrated",

        RED = { red: 255, green: 0, blue: 0 },
        GREEN = { red: 0, green: 255, blue: 0 },

        hmdOverlay = null,
        HMD_FONT_SIZE = 0.08,
        desktopOverlay = null,
        DESKTOP_FONT_SIZE = 24,
        displayTimer = null;

    function show(text, color) {
        var screenSize = Controller.getViewportDimensions();

        if (HMD.active) {
            hmdOverlay = Overlays.addOverlay("text3d", {
                text: text,
                lineHeight: HMD_FONT_SIZE,
                dimensions: { x: 6 * HMD_FONT_SIZE, y: 1.02 * HMD_FONT_SIZE },
                margin: 0,
                parentID: MyAvatar.SELF_ID,
                parentJointIndex: MyAvatar.getJointIndex("_CAMERA_MATRIX"),
                position: Vec3.sum(Camera.position, Vec3.multiplyQbyV(Camera.orientation, { x: 1 * HMD_FONT_SIZE, y: 0, z: -2 })),
                color: color,
                alpha: 1,
                backgroundAlpha: 0,
                ignoreRayIntersection: true,
                isFacingAvatar: true,
                drawHUDLayer: true,
                visible: true,
                unlit: true
            });
        } else {
            // 2D overlay on desktop.
            desktopOverlay = Overlays.addOverlay("text", {
                text: text,
                width: 10 * DESKTOP_FONT_SIZE,
                height: DESKTOP_FONT_SIZE,
                x: screenSize.x / 2 - 5 * DESKTOP_FONT_SIZE,
                y: screenSize.x / 2 - DESKTOP_FONT_SIZE,
                font: { size: DESKTOP_FONT_SIZE },
                color: color,
                alpha: 1.0,
                backgroundAlpha: 0,
                visible: true
            });
        }
    }

    function hide() {
        if (desktopOverlay) {
            Overlays.deleteOverlay(desktopOverlay);
            desktopOverlay = null;
        }
        if (hmdOverlay) {
            Overlays.deleteOverlay(hmdOverlay);
            hmdOverlay = null;
        }
        displayTimer = null;
    }

    Controller.inputDeviceCalibrated.connect(function (deviceName, fromUI, success) {
        if (fromUI) {
            return;
        }

        if (displayTimer) {
            hide();
        }

        if (success) {
            show(CALIBRATION_SUCCESS, GREEN);
        } else {
            show(CALIBRATION_FAILURE, RED);
        }
        displayTimer = Script.setTimeout(hide, DISPLAY_TIME * 1000);
    });

    Controller.inputDeviceUncalibrated.connect(function (deviceName, fromUI) {
        if (fromUI) {
            return;
        }

        if (displayTimer) {
            hide();
        }

        show(UNCALIBRATION, RED);
        displayTimer = Script.setTimeout(hide, DISPLAY_TIME * 1000);
    });

}());
