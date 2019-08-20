//
//  HeadData.cpp
//  libraries/avatars/src
//
//  Created by Stephen Birarda on 5/20/13.
//  Copyright 2013 High Fidelity, Inc.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

#include "HeadData.h"

#include <mutex>

#include <QtCore/QJsonObject>
#include <QtCore/QJsonArray>
#include <QVector>

#include <GLMHelpers.h>
#include <shared/JSONHelpers.h>

#include "AvatarData.h"

HeadData::HeadData(AvatarData* owningAvatar) :
    _baseYaw(0.0f),
    _basePitch(0.0f),
    _baseRoll(0.0f),
    _lookAtPosition(0.0f, 0.0f, 0.0f),
    _blendshapeCoefficients(QVector<float>(0, 0.0f)),
    _transientBlendshapeCoefficients(QVector<float>(0, 0.0f)),
    _summedBlendshapeCoefficients(QVector<float>(0, 0.0f)),
    _owningAvatar(owningAvatar)
{
    computeBlendshapesLookupMap();
}

glm::quat HeadData::getRawOrientation() const {
    return glm::quat(glm::radians(glm::vec3(_basePitch, _baseYaw, _baseRoll)));
}

void HeadData::setRawOrientation(const glm::quat& q) {
    auto euler = glm::eulerAngles(q);
    _basePitch = euler.x;
    _baseYaw = euler.y;
    _baseRoll = euler.z;
}


glm::quat HeadData::getOrientation() const {
    return _owningAvatar->getWorldOrientation() * getRawOrientation();
}

void HeadData::setHeadOrientation(const glm::quat& orientation) {
    glm::quat bodyOrientation = _owningAvatar->getWorldOrientation();
    glm::vec3 eulers = glm::degrees(safeEulerAngles(glm::inverse(bodyOrientation) * orientation));
    _basePitch = eulers.x;
    _baseYaw = eulers.y;
    _baseRoll = eulers.z;
}

void HeadData::setOrientation(const glm::quat& orientation) {
    // rotate body about vertical axis
    glm::quat bodyOrientation = _owningAvatar->getWorldOrientation();
    glm::vec3 newForward = glm::inverse(bodyOrientation) * (orientation * IDENTITY_FORWARD);
    bodyOrientation = bodyOrientation * glm::angleAxis(atan2f(-newForward.x, -newForward.z), glm::vec3(0.0f, 1.0f, 0.0f));
    _owningAvatar->setWorldOrientation(bodyOrientation);

    // the rest goes to the head
    setHeadOrientation(orientation);
}

void HeadData::computeBlendshapesLookupMap(){
    for (int i = 0; i < NUM_FACESHIFT_BLENDSHAPES; i++) {
        _blendshapeLookupMap[FACESHIFT_BLENDSHAPES[i]] = i;
    }
}

int HeadData::getNumSummedBlendshapeCoefficients() const {
    int maxSize = std::max(_blendshapeCoefficients.size(), _transientBlendshapeCoefficients.size());
    return maxSize;
}

const QVector<float>& HeadData::getSummedBlendshapeCoefficients() {
    int maxSize = std::max(_blendshapeCoefficients.size(), _transientBlendshapeCoefficients.size());
    if (_summedBlendshapeCoefficients.size() != maxSize) {
        _summedBlendshapeCoefficients.resize(maxSize);
    }

    for (int i = 0; i < maxSize; i++) {
        if (i >= _blendshapeCoefficients.size()) {
            _summedBlendshapeCoefficients[i] = _transientBlendshapeCoefficients[i];
        } else if (i >= _transientBlendshapeCoefficients.size()) {
            _summedBlendshapeCoefficients[i] = _blendshapeCoefficients[i];
        } else {
            _summedBlendshapeCoefficients[i] = _blendshapeCoefficients[i] + _transientBlendshapeCoefficients[i];
        }
    }

    return _summedBlendshapeCoefficients;
}

void HeadData::setBlendshape(QString name, float val) {

    //Check to see if the named blendshape exists, and then set its value if it does
    auto it = _blendshapeLookupMap.find(name);
    if (it != _blendshapeLookupMap.end()) {
        if (_blendshapeCoefficients.size() <= it.value()) {
            _blendshapeCoefficients.resize(it.value() + 1);
        }
        if (_transientBlendshapeCoefficients.size() <= it.value()) {
            _transientBlendshapeCoefficients.resize(it.value() + 1);
        }
        _blendshapeCoefficients[it.value()] = val;
    }
}

int HeadData::getBlendshapeIndex(const QString& name) {
    auto it = _blendshapeLookupMap.find(name);
    int index = it != _blendshapeLookupMap.end() ? it.value() : -1;
    return index;
}

void HeadData::getBlendshapeIndices(const std::vector<QString>& blendShapeNames, std::vector<int>& indexes) {
    for (auto& name : blendShapeNames) {
        indexes.push_back(getBlendshapeIndex(name));
    }
}

static const QString JSON_AVATAR_HEAD_ROTATION = QStringLiteral("rotation");
static const QString JSON_AVATAR_HEAD_BLENDSHAPE_COEFFICIENTS = QStringLiteral("blendShapes");
static const QString JSON_AVATAR_HEAD_LEAN_FORWARD = QStringLiteral("leanForward");
static const QString JSON_AVATAR_HEAD_LEAN_SIDEWAYS = QStringLiteral("leanSideways");
static const QString JSON_AVATAR_HEAD_LOOKAT = QStringLiteral("lookAt");

QJsonObject HeadData::toJson() const {
    QJsonObject headJson;
    QJsonObject blendshapesJson;
    for (auto name : _blendshapeLookupMap.keys()) {
        auto index = _blendshapeLookupMap[name];
        float value = 0.0f;
        if (index < _blendshapeCoefficients.size()) {
            value += _blendshapeCoefficients[index];
        }
        if (index < _transientBlendshapeCoefficients.size()) {
            value += _transientBlendshapeCoefficients[index];
        }
        if (value != 0.0f) {
            blendshapesJson[name] = value;
        }
    }
    if (!blendshapesJson.isEmpty()) {
        headJson[JSON_AVATAR_HEAD_BLENDSHAPE_COEFFICIENTS] = blendshapesJson;
    }
    if (getRawOrientation() != quat()) {
        headJson[JSON_AVATAR_HEAD_ROTATION] = toJsonValue(getRawOrientation());
    }
    auto lookat = getLookAtPosition();
    if (lookat != vec3()) {
        vec3 relativeLookAt = glm::inverse(_owningAvatar->getWorldOrientation()) *
            (getLookAtPosition() - _owningAvatar->getWorldPosition());
        headJson[JSON_AVATAR_HEAD_LOOKAT] = toJsonValue(relativeLookAt);
    }
    return headJson;
}

void HeadData::fromJson(const QJsonObject& json) {
    if (json.contains(JSON_AVATAR_HEAD_BLENDSHAPE_COEFFICIENTS)) {
        auto jsonValue = json[JSON_AVATAR_HEAD_BLENDSHAPE_COEFFICIENTS];
        if (jsonValue.isArray()) {
            QVector<float> blendshapeCoefficients;
            QJsonArray blendshapeCoefficientsJson = jsonValue.toArray();
            for (const auto& blendshapeCoefficient : blendshapeCoefficientsJson) {
                blendshapeCoefficients.push_back((float)blendshapeCoefficient.toDouble());
            }
            setBlendshapeCoefficients(blendshapeCoefficients);
        } else if (jsonValue.isObject()) {
            QJsonObject blendshapeCoefficientsJson = jsonValue.toObject();
            for (const QString& name : blendshapeCoefficientsJson.keys()) {
                float value = (float)blendshapeCoefficientsJson[name].toDouble();
                setBlendshape(name, value);
            }
        } else {
            qWarning() << "Unable to deserialize head json: " << jsonValue;
        }
    }

    if (json.contains(JSON_AVATAR_HEAD_LOOKAT)) {
        auto relativeLookAt = vec3FromJsonValue(json[JSON_AVATAR_HEAD_LOOKAT]);
        if (glm::length2(relativeLookAt) > 0.01f) {
            setLookAtPosition((_owningAvatar->getWorldOrientation() * relativeLookAt) + _owningAvatar->getWorldPosition());
        }
    }

    if (json.contains(JSON_AVATAR_HEAD_ROTATION)) {
        setHeadOrientation(quatFromJsonValue(json[JSON_AVATAR_HEAD_ROTATION]));
    }
}

bool HeadData::getHasProceduralEyeFaceMovement() const {
    return _hasProceduralEyeFaceMovement;
    // return _hasProceduralEyeFaceMovement && !_isEyeTrackerConnected;
}

void HeadData::setHasProceduralEyeFaceMovement(const bool hasProceduralEyeFaceMovement) {
    _hasProceduralEyeFaceMovement = hasProceduralEyeFaceMovement;
}

bool HeadData::getHasProceduralBlinkFaceMovement() const {
    // return _hasProceduralBlinkFaceMovement;
    return _hasProceduralBlinkFaceMovement && !_isFaceTrackerConnected;
}

void HeadData::setHasProceduralBlinkFaceMovement(const bool hasProceduralBlinkFaceMovement) {
    _hasProceduralBlinkFaceMovement = hasProceduralBlinkFaceMovement;
}

bool HeadData::getHasAudioEnabledFaceMovement() const { return _hasAudioEnabledFaceMovement; }

void HeadData::setHasAudioEnabledFaceMovement(const bool hasAudioEnabledFaceMovement) {
    _hasAudioEnabledFaceMovement = hasAudioEnabledFaceMovement;
}

void HeadData::setEyeTrackerConnected(bool value) {
    if (_isEyeTrackerConnected != value) {
        qDebug() << "QQQQ setEyeTrackerConnected " << value;
    }
    _isEyeTrackerConnected = value;
}

void HeadData::setFaceTrackerConnected(bool value) {
    if (_isFaceTrackerConnected != value) {
        qDebug() << "QQQQ setFaceTrackerConnected " << value;
    }
    _isFaceTrackerConnected = value;
}
