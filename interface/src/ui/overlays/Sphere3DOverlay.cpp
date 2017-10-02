//
//  Sphere3DOverlay.cpp
//  interface/src/ui/overlays
//
//  Copyright 2014 High Fidelity, Inc.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

#include "Sphere3DOverlay.h"

#include <DependencyManager.h>
#include <GeometryCache.h>
#include <gpu/Batch.h>
#include <SharedUtil.h>

QString const Sphere3DOverlay::TYPE = "sphere";

// Sphere overlays should fit inside a cube of the specified dimensions, hence it needs to be a half unit sphere.
// However, the geometry cache renders a UNIT sphere, so we need to scale down.
static const float SPHERE_OVERLAY_SCALE = 0.5f;

Sphere3DOverlay::Sphere3DOverlay(const Sphere3DOverlay* sphere3DOverlay) :
    Volume3DOverlay(sphere3DOverlay),
    _emissive(sphere3DOverlay->_emissive)
{
}

void Sphere3DOverlay::render(RenderArgs* args) {
    if (!_visible) {
        return; // do nothing if we're not visible
    }

    float alpha = getAlpha();
    xColor color = getColor();
    const float MAX_COLOR = 255.0f;
    glm::vec4 sphereColor(color.red / MAX_COLOR, color.green / MAX_COLOR, color.blue / MAX_COLOR, alpha);

    auto batch = args->_batch;

    if (batch) {
        batch->setModelTransform(getRenderTransform());

        auto geometryCache = DependencyManager::get<GeometryCache>();
        auto shapePipeline = args->_shapePipeline;
        if (!shapePipeline) {
            shapePipeline = _isSolid ? geometryCache->getOpaqueShapePipeline() : geometryCache->getWireShapePipeline();
        }

        if (_isSolid) {
            geometryCache->renderSolidSphereInstance(args, *batch, sphereColor, shapePipeline);
        } else {
            geometryCache->renderWireSphereInstance(args, *batch, sphereColor, shapePipeline);
        }
    }
}

const render::ShapeKey Sphere3DOverlay::getShapeKey() {
    auto builder = render::ShapeKey::Builder();
    if (isTransparent()) {
        builder.withTranslucent();
    }
    if (!getIsSolid() || shouldDrawHUDLayer() || _emissive) {
        builder.withUnlit().withDepthBias();
    }
    return builder.build();
}

Sphere3DOverlay* Sphere3DOverlay::createClone() const {
    return new Sphere3DOverlay(this);
}

void Sphere3DOverlay::setProperties(const QVariantMap& properties) {
    Volume3DOverlay::setProperties(properties);

    auto emissiveValue = properties["emissive"];
    if (emissiveValue.isValid()) {
        _emissive = emissiveValue.toBool();
    }
}

QVariant Sphere3DOverlay::getProperty(const QString& property) {
    if (property == "emissive") {
        return _emissive;
    }

    return Volume3DOverlay::getProperty(property);
}

Transform Sphere3DOverlay::evalRenderTransform() {
    Transform transform = getTransform();
    transform.setScale(1.0f);  // ignore inherited scale from SpatiallyNestable
    transform.postScale(getDimensions() * SPHERE_OVERLAY_SCALE);

    return transform;
}
