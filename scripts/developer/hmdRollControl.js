//
// hmdRollControl.js
//
// Created by David Rowe on 4 Jun 2017.
// Copyright 2017 High Fidelity, Inc.
//
// Distributed under the Apache License, Version 2.0
// See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

var rollControlEnabled = true;
var rollControlDeadZone = 8.0;  // deg
var rollControlSpeed = 1.0;  // deg/sec/deg

print("HMD roll control: " + rollControlEnabled + ", " + rollControlDeadZone + ", " + rollControlSpeed);

MyAvatar.rollControlEnabled = rollControlEnabled;
MyAvatar.rollControlDeadZone = rollControlDeadZone;
MyAvatar.rollControlSpeed = rollControlSpeed;

Script.stop();
