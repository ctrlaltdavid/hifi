//
//  ScriptAudioInjector.h
//  libraries/script-engine/src
//
//  Created by Stephen Birarda on 2015-02-11.
//  Copyright 2015 High Fidelity, Inc.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

#ifndef hifi_ScriptAudioInjector_h
#define hifi_ScriptAudioInjector_h

#include <QtCore/QObject>

#include <AudioInjector.h>

/**jsdoc
 * @class AudioInjector
 * @property {boolean} playing <em>Read-only.</em>
 * @property {number} loudness <em>Read-only.</em>
 * @property {AudioInjectorOptions} options
 */
class ScriptAudioInjector : public QObject {
    Q_OBJECT

    Q_PROPERTY(bool playing READ isPlaying)
    Q_PROPERTY(float loudness READ getLoudness)
    Q_PROPERTY(AudioInjectorOptions options WRITE setOptions READ getOptions)
public:
    ScriptAudioInjector(const AudioInjectorPointer& injector);
    ~ScriptAudioInjector();
public slots:

    /**jsdoc
     * @function AudioInjector.restart
     */
    void restart() { _injector->restart(); }

    /**jsdoc
     * @function AudioInjector.stop
     */
    void stop() { _injector->stop(); }

    /**jsdoc
     * @function AudioInjector.getOptions
     * @returns {AudioInjectorOptions}
     */
    const AudioInjectorOptions& getOptions() const { return _injector->getOptions(); }

    /**jsdoc
     * @function AudioInjector.setOptions
     * @param {AudioInjectorOptions} options
     */
    void setOptions(const AudioInjectorOptions& options) { _injector->setOptions(options); }

    /**jsdoc
     * @function AudioInjector.getLoudness
     * @returns {number}
     */
    float getLoudness() const { return _injector->getLoudness(); }

    /**jsdoc
     * @function AudioInjector.isPlaying
     * @returns {boolean}
     */
    bool isPlaying() const { return _injector->isPlaying(); }

signals:

    /**jsdoc
     * @function AudioInjector.finished
     * @returns {Signal}
     */
    void finished();

protected slots:

    /**jsdoc
     * @function AudioInjector.stopInjectorImmediately
     */
    void stopInjectorImmediately();
private:
    AudioInjectorPointer _injector;

    friend QScriptValue injectorToScriptValue(QScriptEngine* engine, ScriptAudioInjector* const& in);
};

Q_DECLARE_METATYPE(ScriptAudioInjector*)

QScriptValue injectorToScriptValue(QScriptEngine* engine, ScriptAudioInjector* const& in);
void injectorFromScriptValue(const QScriptValue& object, ScriptAudioInjector*& out);

#endif // hifi_ScriptAudioInjector_h
